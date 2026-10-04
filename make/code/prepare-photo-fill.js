// Prepare a missing-photo fill only. Existing PHOTO properties are never replaced.
const crypto=require('node:crypto');
const patchSharedFields=require('./shared-fields');
const selectPrimaryPhoto=require('./select-primary-photo');
const embedPhoto=require('./embed-photo');
function photoLines(card){return card.replace(/\r\n[ \t]/g,'').split('\r\n').filter(Boolean);}
function photoKey(line){return line.split(':')[0].split(';')[0].split('.').at(-1).toUpperCase();}
function preparePhotoFill({source,sourceContactId,uid,existingVcard,targetEtag,download,selection}){
  patchSharedFields({uid,existingVcard,contactData:{}});
  const current=selectPrimaryPhoto({source,sourceContactId});
  const hold=reason=>({status:'held',reason,writesApplied:false});
  if(current.status!=='download')return hold(current.reason);
  if(!selection||selection.sourceContactId!==sourceContactId||selection.sourceEtag!==source.etag||selection.primaryUrl!==current.primaryUrl)return hold('source_changed_during_download');
  if(photoLines(existingVcard).some(l=>['PHOTO','X-IMAGEHASH','X-IMAGETYPE'].includes(photoKey(l))))return hold('existing_photo_preserved');
  if(!download||download.requestedUrl!==current.primaryUrl||download.statusCode!==200)return hold('source_photo_unavailable');
  const d=download.decodedImage;
  if(!d||d.decoded!==true)return hold('source_image_not_validated');
  const r=embedPhoto({uid,existingVcard,targetEtag,action:'fill',imageBase64:download.imageBase64,decodedImage:d});
  return {...r,sourceContactId,sourceEtag:source.etag,uid,primaryUrl:current.primaryUrl,width:d.width,height:d.height,beforeNonPhotoHash:nonPhotoHash(existingVcard)};
}
function nonPhotoHash(card){return crypto.createHash('sha256').update(JSON.stringify(photoLines(card).filter(l=>!['PHOTO','REV','PRODID'].includes(photoKey(l))).sort())).digest('hex');}
function verifyPhotoFill({prepared,actual,targetEtag,download}){
  if(prepared?.status!=='prepared-only')throw Error('Prepared photo required');
  patchSharedFields({uid:prepared.uid,existingVcard:actual,contactData:{}});
  if(!/^"[^"\r\n]+"$/.test(targetEtag||'')||targetEtag===prepared.targetEtag)throw Error('New strong target ETag required');
  if(nonPhotoHash(actual)!==prepared.beforeNonPhotoHash)throw Error('Non-photo fields changed');
  const photos=photoLines(actual).filter(l=>photoKey(l)==='PHOTO');
  if(photos.length!==1)throw Error('Exactly one saved photo required');
  // The caller downloads this exact URI (or extracts embedded bytes) and decodes
  // it. Hash its raw bytes, not a second lossy image conversion.
  const propertyHash=crypto.createHash('sha256').update(JSON.stringify(photos.sort())).digest('hex');
  if(download?.propertyHash!==propertyHash||download.statusCode!==200||download.decoded!==true||download.width!==prepared.width||download.height!==prepared.height)throw Error('Readback photo not decoded');
  if(typeof download.imageBase64!=='string'||crypto.createHash('sha256').update(Buffer.from(download.imageBase64,'base64')).digest('hex')!==prepared.byteHash)throw Error('Saved image bytes differ');
  return {verified:true,targetEtag,photoBaseline:{version:1,sourceContactId:prepared.sourceContactId,uid:prepared.uid,sourceContentHash:prepared.byteHash,targetPropertyHash:propertyHash}};
}
module.exports={preparePhotoFill,verifyPhotoFill};
