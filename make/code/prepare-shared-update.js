// Pure preparation only. A caller must persist an explicitly accepted baseline,
// perform the conditional PUT, verify readback, then advance that baseline.
const patchSharedFields = require('./shared-fields');
const {hash} = require('./sync-state');
const fields = {
  name:['N','FN','NICKNAME'], notes:['NOTE'], emails:['EMAIL'],
  phoneNumbers:['TEL'], addresses:['ADR'], urls:['URL','X-SOCIALPROFILE'],
  organizations:['ORG','TITLE'], birthday:['BDAY'], ims:['IMPP'],
  relatedPeople:['X-ABRELATEDNAMES'], photos:['PHOTO']
};
function snapshot({sourceContactId,uid,existingVcard,contactData}) {
  if(typeof sourceContactId!=='string'||!sourceContactId)throw Error('Source identity required');
  // Validate identity and the entire source, including populated unsupported data.
  patchSharedFields({uid,existingVcard,contactData});
  const lines=existingVcard.replace(/\r\n[ \t]/g,'').split('\r\n');
  const key=l=>l.split(':')[0].split(';')[0].split('.').at(-1).toUpperCase();
  const group=l=>{const h=l.split(':')[0].split(';')[0];return h.includes('.')?h.split('.')[0]:null;};
  const result={version:1,sourceContactId,uid,fields:{}};
  for(const [field,keys] of Object.entries(fields)) {
    if(!Object.hasOwn(contactData,field)||contactData[field]==null)continue;
    const selected=lines.filter(l=>keys.includes(key(l)));
    const groups=new Set(selected.map(group).filter(Boolean));
    // Include grouped labels/metadata. Conservative representation changes may
    // cause a hold, but must never hide an independent target edit.
    const target=lines.filter(l=>keys.includes(key(l))||groups.has(group(l))).sort();
    const source=field==='organizations'?contactData[field].slice(0,1):contactData[field];
    result.fields[field]={source:hash(source),target:hash(target)};
  }
  return result;
}
function prepareSharedUpdate(input) {
  const {source,sourceContactId,uid,existingVcard,targetEtag,baseline}=input;
  if(!source||source.contactId!==sourceContactId)throw Error('Source identity mismatch');
  if(typeof targetEtag!=='string'||!/^"[^"\r\n]+"$/.test(targetEtag))throw Error('Strong target ETag required');
  const current=snapshot({sourceContactId,uid,existingVcard,contactData:source.contactData});
  const held=(status,conflicts=[])=>({status,conflicts,changed:false,writesApplied:false});
  if(!baseline)return held('needs_baseline');
  if(baseline.version!==1||baseline.uid!==uid||baseline.sourceContactId!==sourceContactId||!baseline.fields)throw Error('Baseline identity/version mismatch');
  const patch={},conflicts=[];
  for(const field of new Set([...Object.keys(current.fields),...Object.keys(baseline.fields)])) {
    const now=current.fields[field],old=baseline.fields[field];
    if(!now) {conflicts.push(field);continue;}
    if(!old){
      // This field was absent from the accepted source snapshot. Permit an
      // addition only when the fresh target has no corresponding property or
      // grouped metadata. The conditional PUT protects against intervening edits.
      if(field!=='photos'&&now.target===hash([])){patch[field]=source.contactData[field];continue;}
      conflicts.push(field);continue;
    }
    if(!['source','target'].every(k=>/^[a-f0-9]{64}$/.test(old[k]))) {conflicts.push(field);continue;}
    if(now.source===old.source)continue; // Independent iCloud changes are retained.
    if(field==='photos'||now.target!==old.target) {conflicts.push(field);continue;}
    patch[field]=source.contactData[field];
  }
  if(conflicts.length)return held('conflict',conflicts);
  const prepared=patchSharedFields({uid,existingVcard,contactData:patch});
  return {...prepared,status:prepared.changed?'prepared-only':'unchanged',writesApplied:false,
    targetEtag,sourceEtag:source.etag,eventId:input.eventId,updatedFields:Object.keys(patch)};
}
module.exports={snapshot,prepareSharedUpdate};
