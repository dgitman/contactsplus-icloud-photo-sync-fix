// Source-authoritative deletion of a previously verified exact mapping.
// No name searches, survivor guesses, or retries of an uncertain DELETE.
const {cardDigest}=require('./shared-write-receipt');
const {hash}=require('./sync-state');
const fields={name:['N','FN','NICKNAME'],notes:['NOTE'],emails:['EMAIL'],phoneNumbers:['TEL'],addresses:['ADR'],urls:['URL','X-SOCIALPROFILE'],organizations:['ORG','TITLE'],birthday:['BDAY'],ims:['IMPP'],relatedPeople:['X-ABRELATEDNAMES'],photos:['PHOTO']};
const hold=reason=>({status:'held',reason,writesAllowed:false});
function sourceAbsent(response){
 try{const r=typeof response==='string'?JSON.parse(response):response;
 const b=typeof r?.body==='string'?JSON.parse(r.body):r?.body;
 return r?.statusCode===200&&Array.isArray(b?.contacts)&&b.contacts.length===0;
 }catch{return false;}
}
function deleteIdentity({event,mapping,bookUrl}){
 return event?.triggerId==='contact.deleted'&&typeof event.eventId==='string'&&!!event.eventId&&
 mapping?.sourceAccountId==='contactsplus-primary'&&event.data?.contactId===mapping.sourceContactId&&
 ['verified','delete_pending','deleted'].includes(mapping.state)&&/^[A-Za-z0-9_-]{1,128}$/.test(mapping.targetUid||'')&&
 /^https:\/\/[^\s?#]+\/$/.test(bookUrl||'')&&[mapping.targetUid,Buffer.from(mapping.targetUid).toString('base64')].some(leaf=>mapping.targetHref===bookUrl+leaf+'.vcf');
}
function prepareDelete(input){
 const {event,mapping:m,response,statusCode,actual,targetEtag}=input;
 if(!deleteIdentity(input))return hold('delete_identity');
 if(!sourceAbsent(response))return hold('source_still_present_or_unavailable');
 if(statusCode===404)return {status:'verified_deleted',writesAllowed:false};
 if(statusCode!==200)return hold('target_unavailable');
 if(m.state!=='verified')return hold('uncertain_delete_no_retry');
 if(!/^"[^"\r\n]+"$/.test(targetEtag||'')||targetEtag!==m.targetEtag)return hold('independent_target_change');
 try{const b=JSON.parse(m.baselineJson);if(b.version!==1||b.uid!==m.targetUid||b.sourceContactId!==m.sourceContactId||!b.fields)return hold('baseline_identity');
 // A later successful write may have advanced the overall ETag while retaining
 // an independent field edit. The per-field baseline must still match as well.
 const lines=actual.replace(/\r\n[ \t]/g,'').split('\r\n');
 const key=l=>l.split(':')[0].split(';')[0].split('.').at(-1).toUpperCase();
 const group=l=>{const h=l.split(':')[0].split(';')[0];return h.includes('.')?h.split('.')[0]:null;};
 for(const [field,old] of Object.entries(b.fields)){
  if(!fields[field]||! /^[a-f0-9]{64}$/.test(old.target||''))return hold('invalid_field_baseline');
  const groups=new Set(lines.filter(l=>fields[field].includes(key(l))).map(group).filter(Boolean));
  const now=hash(lines.filter(l=>fields[field].includes(key(l))||groups.has(group(l))).sort());
  if(now!==old.target)return hold('independent_target_field_change');
 }
 const receipt={version:1,operation:'delete',eventId:event.eventId,sourceContactId:m.sourceContactId,uid:m.targetUid,targetHref:m.targetHref,beforeEtag:targetEtag,beforeHash:cardDigest(actual,m.targetUid),baselineHash:hash(b)};
 return {status:'delete_prepared',writesAllowed:false,receipt,receiptJson:JSON.stringify(receipt)};
 }catch{return hold('invalid_delete_baseline');}
}
function recoverDelete(input){
 const {receipt:r,event,mapping:m,response,statusCode}=input;
 if(!deleteIdentity(input)||!r||r.version!==1||r.operation!=='delete'||r.eventId!==event.eventId||r.sourceContactId!==m.sourceContactId||r.uid!==m.targetUid||r.targetHref!==m.targetHref)return hold('delete_receipt_identity');
 if(!sourceAbsent(response))return hold('source_still_present_or_unavailable');
 if(statusCode!==404)return hold('uncertain_delete_no_retry');
 return {status:'verified_deleted',writesAllowed:false};
}
module.exports={sourceAbsent,deleteIdentity,prepareDelete,recoverDelete};
