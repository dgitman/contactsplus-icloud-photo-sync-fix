// Offline preparation only. This never authorizes creation, links an identity,
// or calls a service. Production activation requires the new-contact lookup policy.
const {hash}=require('./sync-state');
function newContactQuery({source,event}){
 const hold=reason=>({status:'held',reason,writesAllowed:false});
 if(event?.triggerId!=='contact.added'||!event.eventId||!event.data?.contactId||source?.contactId!==event.data.contactId||typeof source.etag!=='string'||!source.etag.trim()||!source.contactData)return hold('fresh_added_contact_required');
 const d=source.contactData;
 if(!Array.isArray(d.emails)||!d.emails.length)return hold('email_identity_required');
 const emails=[...new Set(d.emails.map(e=>typeof e?.value==='string'?e.value.trim().toLowerCase():''))];
 if(emails.length>10||emails.some(e=>e.length>254||/[\x00-\x1f\x7f]/.test(e)||!/^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(e)))return hold('email_identity_invalid_or_unbounded');
 const n=d.name;if(!n||typeof n.givenName!=='string'||typeof n.familyName!=='string'||!n.givenName.trim()||!n.familyName.trim())return hold('structured_name_required');
 const family=n.familyName.trim();if(family.length>100||/[\x00-\x1f\x7f]/.test(family))return hold('name_invalid');
 const xml=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
 const match=(property,value,type)=>'<c:prop-filter name="'+property+'"><c:text-match collation="i;unicode-casemap" match-type="'+type+'">'+xml(value)+'</c:text-match></c:prop-filter>';
 // A broad structured-name candidate also prevents a changed/missing email from
 // silently making a second card. Any result is held, not automatically merged.
 const query='<?xml version="1.0" encoding="UTF-8"?><c:addressbook-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:carddav"><d:prop><d:getetag/></d:prop><c:filter test="anyof">'+emails.map(e=>match('EMAIL',e,'equals')).join('')+match('N',family,'contains')+'</c:filter><c:limit><c:nresults>2</c:nresults></c:limit></c:addressbook-query>';
 return {status:'query_prepared',writesAllowed:false,query,queryHash:hash(query),sourceHash:hash(source.contactData),sourceContactId:source.contactId,sourceEtag:source.etag,eventId:event.eventId};
}
function reviewNewContactQuery({plan,response,source,event}){
 const hold=reason=>({status:'held',reason,writesAllowed:false});
 const current=newContactQuery({source,event});
 if(current.status!=='query_prepared'||!plan||['query','queryHash','sourceHash','sourceContactId','sourceEtag','eventId'].some(k=>current[k]!==plan[k]))return hold('query_binding_changed');
 if(response?.statusCode!==207)return hold('query_failed');
 let body;try{body=typeof response.body==='string'?JSON.parse(response.body):response.body;}catch{return hold('query_unparseable');}
 const m=body?.multistatus;
 // An unrecognized/partial response must never be mistaken for no matches.
 if(!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).some(k=>!['response','_attributes'].includes(k)))return hold('query_incomplete');
 if(m.response!=null&&(!Array.isArray(m.response)||m.response.length))return hold('existing_or_incomplete_results');
 return {status:'no_candidates',writesAllowed:false,sourceContactId:plan.sourceContactId,sourceEtag:plan.sourceEtag,eventId:plan.eventId,queryHash:plan.queryHash};
}
module.exports={newContactQuery,reviewNewContactQuery};
