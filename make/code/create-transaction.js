// Offline creation transaction primitives. No network or storage side effects.
// A future caller must insert reservations without overwrite and durably mark an
// attempt before issuing its single If-None-Match PUT. Never retry uncertainty.
const {hash}=require('./sync-state');
const {reviewNewContactQuery}=require('./new-contact-query');
const patchSharedFields=require('./shared-fields');
const {snapshot}=require('./prepare-shared-update');
const {cardDigest}=require('./shared-write-receipt');
const selectPrimaryPhoto=require('./select-primary-photo');
const {preparePhotoFill}=require('./prepare-photo-fill');
const hold=reason=>({status:'held',reason,writesAllowed:false});
function creationUid(account,id){
 if(typeof account!=='string'||!account||typeof id!=='string'||!id)throw Error('Scoped source identity required');
 return 'cp-'+hash({account,id});
}
function freshQuery(checkedAt,now){return Number.isFinite(now)&&Number.isFinite(checkedAt)&&now>=checkedAt&&now-checkedAt<=60000;}
function prepareCreateTransaction({source,event,plan,response,sourceAccountId,bookUrl,lookupPolicyEnabled=false,existingMapping,checkedAt,now,photoDownload,completeSource=false}){
 if(!lookupPolicyEnabled)return hold('new_contact_lookup_policy_disabled');
 if(existingMapping!=null)return hold('identity_already_reserved_or_mapped');
 if(!freshQuery(checkedAt,now))return hold('query_expired');
 const q=reviewNewContactQuery({plan,response,source,event});if(q.status!=='no_candidates')return q;
 try{
  const u=new URL(bookUrl);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||!u.pathname.endsWith('/')||u.pathname==='/')return hold('configured_book_required');
  const uid=creationUid(sourceAccountId,source.contactId),targetHref=bookUrl+uid+'.vcf';
  const empty='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:'+uid+'\r\nEND:VCARD\r\n';
  let photoEvidence;
  let vcard=patchSharedFields({uid,existingVcard:empty,contactData:source.contactData}).vcard;
  const selection=completeSource&&!Object.hasOwn(source.contactData,'photos')?{status:'preserve',reason:'complete_source_without_photo'}:selectPrimaryPhoto({source,sourceContactId:source.contactId});let photoBaseline;
  if(selection.status==='download'){
   const p=preparePhotoFill({source,sourceContactId:source.contactId,uid,existingVcard:vcard,targetEtag:'"creation-preflight"',selection,download:photoDownload});
   if(p.status!=='prepared-only')return hold(p.reason);
   photoEvidence={byteHash:p.byteHash,width:p.width,height:p.height,nonPhotoHash:cardDigest(vcard,uid)};vcard=p.vcard;
   const photo=vcard.replace(/\r\n[ \t]/g,'').split('\r\n').filter(l=>l.startsWith('PHOTO;'));
   photoBaseline={version:1,sourceContactId:source.contactId,uid,sourceContentHash:p.byteHash,targetPropertyHash:hash(photo)};
  }else if(selection.status!=='preserve')return hold(selection.reason);
  const baseline=snapshot({sourceContactId:source.contactId,uid,existingVcard:vcard,contactData:source.contactData});if(photoBaseline)baseline.photoBaseline=photoBaseline;
  const reservation={version:1,operation:'create',state:'create_reserved',sourceAccountId,sourceContactId:source.contactId,sourceEtag:source.etag,sourceHash:hash(source.contactData),eventId:event.eventId,uid,targetHref,queryHash:plan.queryHash,checkedAt,expectedHash:cardDigest(vcard,uid),baselineJson:JSON.stringify(baseline)};
  if(photoEvidence)reservation.photoEvidence=photoEvidence;
  return {status:'reservation_prepared',writesAllowed:false,reservation,vcard};
 }catch(e){return hold(String(e.message));}
}
function prepareFirstCreateAttempt({prepared,reservation,source,event,now}){
 if(prepared?.status!=='reservation_prepared'||reservation?.state!=='create_reserved')return hold('first_attempt_only');
 if(hash(prepared.reservation)!==hash(reservation))return hold('reservation_changed');
 if(!freshQuery(reservation.checkedAt,now))return hold('query_expired');
 try{
  if(source?.contactId!==reservation.sourceContactId||source.etag!==reservation.sourceEtag||hash(source.contactData)!==reservation.sourceHash||event?.eventId!==reservation.eventId||event.triggerId!=='contact.added'||event.data?.contactId!==reservation.sourceContactId)return hold('source_or_event_changed');
  if(creationUid(reservation.sourceAccountId,reservation.sourceContactId)!==reservation.uid||cardDigest(prepared.vcard,reservation.uid)!==reservation.expectedHash)return hold('prepared_card_changed');
  return {status:'attempt_marker_prepared',writesAllowed:false,attemptedReservation:{...reservation,state:'create_attempted'},request:{method:'PUT',url:reservation.targetHref,headers:{'If-None-Match':'*','Content-Type':'text/vcard; charset=utf-8'},body:prepared.vcard}};
 }catch{return hold('invalid_attempt');}
}
function reconcileCreateTransaction({reservation,source,statusCode,actual,targetEtag}){
 if(!reservation||reservation.version!==1||reservation.operation!=='create'||!['create_attempted','verified'].includes(reservation.state))return hold('attempt_evidence_required');
 if(statusCode===404)return hold('unconfirmed_create_no_retry');
 if(statusCode!==200)return hold('create_readback_unavailable');
 if(!/^"[^"\r\n]+"$/.test(targetEtag||''))return hold('strong_readback_version_required');
 try{
  if(creationUid(reservation.sourceAccountId,reservation.sourceContactId)!==reservation.uid)return hold('reservation_identity');
  if(cardDigest(actual,reservation.uid)!==reservation.expectedHash)return hold('created_card_differs');
  if(source?.contactId!==reservation.sourceContactId||source.etag!==reservation.sourceEtag||hash(source.contactData)!==reservation.sourceHash)return hold('source_changed');
  const baseline=JSON.parse(reservation.baselineJson);if(baseline.uid!==reservation.uid||baseline.sourceContactId!==reservation.sourceContactId||baseline.version!==1)return hold('baseline_identity');
  return {status:'verified_create',writesAllowed:false,mapping:{...reservation,state:'verified',targetEtag}};
 }catch{return hold('invalid_create_readback');}
}
module.exports={creationUid,prepareCreateTransaction,prepareFirstCreateAttempt,reconcileCreateTransaction};

// URI representation recovery is read-only. Download only this validated URL,
// with redirects disabled, and decode the original bytes before finishing.
function planCreatePhotoRecovery(input){
 const {reservation:r,actual}=input,e=r?.photoEvidence;
 if(!e||! /^[a-f0-9]{64}$/.test(e.byteHash||'')||!Number.isInteger(e.width)||!Number.isInteger(e.height)||e.width<1||e.height<1||e.width*e.height>40000000)return hold('photo_evidence_required');
 try{
  cardDigest(actual,r.uid);
  const lines=actual.replace(/\r\n[ \t]/g,'').split('\r\n').filter(Boolean);
  const photos=lines.filter(l=>/^(?:[^.;:]+\.)?PHOTO[;:]/i.test(l));
  if(photos.length!==1||!/^PHOTO;/i.test(photos[0]))return hold('photo_property_ambiguous');
  const colon=photos[0].indexOf(':'),params=photos[0].slice(0,colon).split(';').slice(1);
  if(params.filter(p=>/^VALUE=uri$/i.test(p)).length!==1||params.some(p=>!/^VALUE=uri$|^TYPE=(JPEG|PNG|image\/(?:jpeg|png))$/i.test(p)))return hold('photo_representation_unsupported');
  const url=photos[0].slice(colon+1),u=new URL(url),prefix=input.photoPathPrefix;
  if(typeof prefix!=='string'||!/^\/contacts\/[0-9]+\/ck\/card\/$/.test(prefix)||u.origin!=='https://gateway.icloud.com'||u.username||u.password||u.hash||!u.pathname.startsWith(prefix)||u.pathname===prefix)return hold('photo_url_not_allowed');
  if(cardDigest(lines.filter(l=>l!==photos[0]).join('\r\n')+'\r\n',r.uid)!==e.nonPhotoHash)return hold('non_photo_drift');
  const baseline=JSON.parse(r.baselineJson),propertyHash=hash(photos);
  if(baseline.photoBaseline?.sourceContentHash!==e.byteHash||!baseline.fields?.photos)return hold('photo_baseline_missing');
  baseline.fields.photos.target=propertyHash;baseline.photoBaseline.targetPropertyHash=propertyHash;
  const result=reconcileCreateTransaction({...input,reservation:{...r,expectedHash:cardDigest(actual,r.uid),baselineJson:JSON.stringify(baseline)}});
  if(result.status!=='verified_create')return result;
  return {status:'uri_photo_download',writesAllowed:false,url};
 }catch{return hold('invalid_create_photo_readback');}
}
function finishCreatePhotoRecovery(input){
 const planned=planCreatePhotoRecovery(input),d=input.download,e=input.reservation?.photoEvidence;
 if(planned.status!=='uri_photo_download')return planned;
 if(!d||d.requestedUrl!==planned.url||d.statusCode!==200||d.decoded!==true||d.width!==e.width||d.height!==e.height||typeof d.imageBase64!=='string'||!d.imageBase64.length||d.imageBase64.length>8*1024*1024||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(d.imageBase64))return hold('photo_download_or_decode');
 if(require('node:crypto').createHash('sha256').update(Buffer.from(d.imageBase64,'base64')).digest('hex')!==e.byteHash)return hold('photo_bytes_changed');
 const r=input.reservation,baseline=JSON.parse(r.baselineJson),photos=input.actual.replace(/\r\n[ \t]/g,'').split('\r\n').filter(l=>/^PHOTO;/i.test(l));
 const propertyHash=hash(photos);baseline.fields.photos.target=propertyHash;baseline.photoBaseline.targetPropertyHash=propertyHash;
 return reconcileCreateTransaction({...input,reservation:{...r,expectedHash:cardDigest(input.actual,r.uid),baselineJson:JSON.stringify(baseline)}});
}
module.exports.planCreatePhotoRecovery=planCreatePhotoRecovery;
module.exports.finishCreatePhotoRecovery=finishCreatePhotoRecovery;
