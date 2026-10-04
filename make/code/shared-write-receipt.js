// Lightweight evidence for shared-field writes. Caller must durably persist a
// receipt BEFORE PUT; this module neither writes nor retries a contact.
const {hash}=require('./sync-state');
const {prepareSharedUpdate}=require('./prepare-shared-update');
const advanceSharedBaseline=require('./advance-shared-baseline');
function cardDigest(card,uid){
 if(typeof card!=='string'||/\r(?!\n)|(?<!\r)\n/.test(card)||!card.endsWith('\r\n'))throw Error('Invalid readback format');
 const lines=card.replace(/\r\n[ \t]/g,'').split('\r\n').filter(Boolean);
 if(lines[0]!=='BEGIN:VCARD'||lines.at(-1)!=='END:VCARD'||lines.filter(x=>x==='BEGIN:VCARD').length!==1||lines.filter(x=>x==='END:VCARD').length!==1||lines.filter(x=>/^UID[;:]/i.test(x)).length!==1||!lines.includes('UID:'+uid)||!lines.includes('VERSION:3.0'))throw Error('Readback identity mismatch');
 return hash(lines.filter(x=>! /^(REV|PRODID):/.test(x)).sort());
}
function createSharedWriteReceipt(input){
 const prepared=prepareSharedUpdate(input);
 if(prepared.status!=='prepared-only'||!prepared.changed)throw Error('Prepared shared-field update required');
 if(typeof input.source.etag!=='string'||!input.source.etag||typeof input.eventId!=='string'||!input.eventId)throw Error('Source version and event identity required');
 const next=advanceSharedBaseline({source:input.source,uid:input.uid,baseline:input.baseline,updatedFields:prepared.updatedFields,before:input.existingVcard,actual:prepared.vcard,expected:prepared.vcard,targetEtag:input.targetEtag});
 return {version:1,operation:'shared_update',eventId:input.eventId,sourceContactId:input.sourceContactId,uid:input.uid,sourceEtag:input.source.etag,sourceHash:hash(input.source.contactData),beforeTargetEtag:input.targetEtag,beforeHash:cardDigest(input.existingVcard,input.uid),expectedHash:cardDigest(prepared.vcard,input.uid),baselineHash:hash(input.baseline),expectedBaselineJson:next.baselineJson};
}
function reconcileSharedWrite({receipt,eventId,sourceContactId,uid,source,baseline,statusCode,actual,targetEtag}){
 const hold=reason=>({status:'held',reason,writesAllowed:false});
 if(!receipt||receipt.version!==1||receipt.operation!=='shared_update'||receipt.eventId!==eventId||receipt.uid!==uid||receipt.sourceContactId!==sourceContactId)return hold('receipt_identity');
 if(!['sourceHash','beforeHash','expectedHash','baselineHash'].every(k=>/^[a-f0-9]{64}$/.test(receipt[k]||'')))return hold('invalid_receipt');
 if(statusCode!==200)return hold('readback_unavailable');
 if(!/^"[^"\r\n]+"$/.test(targetEtag||''))return hold('readback_version');
 let digest,next;try{digest=cardDigest(actual,uid);next=JSON.parse(receipt.expectedBaselineJson);}catch{return hold('invalid_readback_or_receipt');}
 if(!next||next.version!==1||next.uid!==uid||next.sourceContactId!==sourceContactId||!next.fields)return hold('receipt_baseline_identity');
 // A previous recovery may have saved the baseline but stopped before marking
 // its event complete. Accept that exact baseline too; never a third version.
 if(!baseline||(hash(baseline)!==receipt.baselineHash&&hash(baseline)!==hash(next)))return hold('baseline_changed');
 if(digest===receipt.beforeHash)return hold('write_not_observed');
 if(digest!==receipt.expectedHash)return hold('readback_drift');
 if(targetEtag===receipt.beforeTargetEtag)return hold('write_version_not_observed');
 if(!source||source.contactId!==sourceContactId||source.etag!==receipt.sourceEtag||hash(source.contactData)!==receipt.sourceHash)return hold('source_changed');
 return {status:'verified_recovered',writesAllowed:false,baselineJson:receipt.expectedBaselineJson,targetEtag,sourceEtag:receipt.sourceEtag};
}
module.exports={cardDigest,createSharedWriteReceipt,reconcileSharedWrite};
