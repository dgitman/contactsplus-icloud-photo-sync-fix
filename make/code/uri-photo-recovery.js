const {hash}=require('./sync-state');
const {cardDigest,reconcileSharedWrite}=require('./shared-write-receipt');
// Pure checks only. The caller downloads solely the returned account-bound URL,
// disables redirects, decodes it and supplies its original bytes for finish.
function planUriPhotoRecovery(input){
 const hold=reason=>({status:'held',reason,writesAllowed:false});
 const r=input.receipt;
 if(r?.operation!=='photo_fill'||! /^[a-f0-9]{64}$/.test(r.byteHash||'')||!Number.isInteger(r.width)||!Number.isInteger(r.height)||r.width<1||r.height<1||r.width*r.height>40000000)return hold('photo_receipt_decode_evidence_missing');
 try{
  cardDigest(input.actual,input.uid);
  const lines=input.actual.replace(/\r\n[ \t]/g,'').split('\r\n').filter(Boolean);
  const photos=lines.filter(l=>/^(?:[^.;:]+\.)?PHOTO[;:]/i.test(l));
  if(photos.length!==1||!/^PHOTO;/i.test(photos[0]))return hold('photo_property_ambiguous');
  const p=photos[0].indexOf(':'),params=photos[0].slice(0,p).split(';').slice(1);
  if(params.filter(x=>/^VALUE=uri$/i.test(x)).length!==1||params.some(x=>!/^VALUE=uri$|^TYPE=(JPEG|PNG|image\/(?:jpeg|png))$/i.test(x)))return hold('photo_representation_unsupported');
  const url=photos[0].slice(p+1),u=new URL(url);
  if(typeof input.photoPathPrefix!=='string'||!/^\/contacts\/[0-9]+\/ck\/card\/$/.test(input.photoPathPrefix)||u.origin!=='https://gateway.icloud.com'||u.username||u.password||u.hash||!u.pathname.startsWith(input.photoPathPrefix)||u.pathname===input.photoPathPrefix)return hold('photo_url_not_allowed');
  const stripped=lines.filter(l=>l!==photos[0]).join('\r\n')+'\r\n';
  if(cardDigest(stripped,input.uid)!==r.beforeHash)return hold('non_photo_drift');
  const next=JSON.parse(r.expectedBaselineJson),propertyHash=hash(photos);
  if(next.photoBaseline?.sourceContentHash!==r.byteHash||!next.fields?.photos)return hold('photo_receipt_baseline');
  next.fields.photos.target=propertyHash;next.photoBaseline.targetPropertyHash=propertyHash;
  const check=reconcileSharedWrite({...input,receipt:{...r,operation:'shared_update',expectedHash:cardDigest(input.actual,input.uid),expectedBaselineJson:JSON.stringify(next)}});
  if(check.status!=='verified_recovered')return check;
  return {...check,status:'uri_photo_download',url,propertyHash};
 }catch{return hold('invalid_uri_photo_readback');}
}
function finishUriPhotoRecovery(input){
 const planned=planUriPhotoRecovery(input),d=input.download;
 const hold=reason=>({status:'held',reason,writesAllowed:false});
 if(planned.status!=='uri_photo_download')return planned;
 if(!d||d.requestedUrl!==planned.url||d.statusCode!==200||d.decoded!==true||d.width!==input.receipt.width||d.height!==input.receipt.height||typeof d.imageBase64!=='string'||!d.imageBase64.length||d.imageBase64.length>8*1024*1024||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(d.imageBase64))return hold('photo_download_or_decode');
 if(require('node:crypto').createHash('sha256').update(Buffer.from(d.imageBase64,'base64')).digest('hex')!==input.receipt.byteHash)return hold('photo_bytes_changed');
 const {url,propertyHash,...result}=planned;
 return {...result,status:'verified_recovered'};
}
module.exports={planUriPhotoRecovery,finishUriPhotoRecovery};
