// Persist only identity and hashes before a photo fill. Recovery never writes a
// contact. URI readback uses the separate decoded recovery path.
const {hash}=require('./sync-state');
const {snapshot}=require('./prepare-shared-update');
const {cardDigest,reconcileSharedWrite}=require('./shared-write-receipt');
function createPhotoWriteReceipt({prepared,source,baseline,eventId,before}){
 if(prepared?.status!=='prepared-only'||!eventId||source?.contactId!==prepared.sourceContactId||!source.etag||source.etag!==prepared.sourceEtag)throw Error('Prepared photo and source identity required');
 const {uid,sourceContactId}=prepared;
 if(!baseline||baseline.version!==1||baseline.uid!==uid||baseline.sourceContactId!==sourceContactId||!baseline.fields)throw Error('Photo baseline identity required');
 const lines=prepared.vcard.replace(/\r\n[ \t]/g,'').split('\r\n');
 const photos=lines.filter(l=>/^(?:[^.;:]+\.)?PHOTO[;:]/i.test(l));
 if(photos.length!==1||!/^PHOTO;ENCODING=b;TYPE=(PNG|JPEG):/.test(photos[0]))throw Error('Exact embedded prepared photo required');
 const bytes=Buffer.from(photos[0].slice(photos[0].indexOf(':')+1),'base64');
 if(require('node:crypto').createHash('sha256').update(bytes).digest('hex')!==prepared.byteHash)throw Error('Prepared photo bytes changed');
 if(cardDigest(prepared.vcard.replace(/PHOTO;ENCODING=b;TYPE=(PNG|JPEG):[^\r]*(?:\r\n[ \t][^\r]*)*\r\n/,''),uid)!==cardDigest(before,uid))throw Error('Prepared photo changed other fields');
 const current=snapshot({sourceContactId,uid,existingVcard:prepared.vcard,contactData:source.contactData});
 if(!current.fields.photos)throw Error('Source photo required');
 const next=JSON.parse(JSON.stringify(baseline));next.fields.photos=current.fields.photos;
 next.photoBaseline={version:1,sourceContactId,uid,sourceContentHash:prepared.byteHash,targetPropertyHash:hash(photos)};
 return {version:1,operation:'photo_fill',byteHash:prepared.byteHash,width:prepared.width,height:prepared.height,eventId,sourceContactId,uid,sourceEtag:source.etag,sourceHash:hash(source.contactData),beforeTargetEtag:prepared.targetEtag,beforeHash:cardDigest(before,uid),expectedHash:cardDigest(prepared.vcard,uid),baselineHash:hash(baseline),expectedBaselineJson:JSON.stringify(next)};
}
function reconcilePhotoWrite(input){
 if(input.receipt?.operation!=='photo_fill')return {status:'held',reason:'receipt_identity',writesAllowed:false};
 // Shared recovery checks the complete normalized card, source, versions and
 // original/advanced baseline. Exact bytes were decoded before preparation.
 return reconcileSharedWrite({...input,receipt:{...input.receipt,operation:'shared_update'}});
}
module.exports={createPhotoWriteReceipt,reconcilePhotoWrite};
