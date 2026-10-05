const patchSharedFields=require('./shared-fields');
const {snapshot}=require('./prepare-shared-update');
const {hash}=require('./sync-state');
// Historical convergence is separate from event-based updates. Never replace a note.
function prepareEmptyNoteFill({mapping,source,existingVcard,targetEtag}) {
  if(mapping.state!=='verified'||mapping.sourceAccountId!=='contactsplus-primary'||source.contactId!==mapping.sourceContactId)throw Error('Mapping identity mismatch');
  const baseline=JSON.parse(mapping.baselineJson),uid=mapping.targetUid;
  if(baseline.version!==1||baseline.uid!==uid||baseline.sourceContactId!==source.contactId)throw Error('Baseline identity mismatch');
  if(!/^"[^"\r\n]+"$/.test(targetEtag||''))throw Error('Strong target ETag required');
  if(typeof source.contactData.notes!=='string'||!source.contactData.notes.trim())throw Error('No source note');
  const current=snapshot({sourceContactId:source.contactId,uid,existingVcard,contactData:source.contactData});
  if(!baseline.fields.notes||current.fields.notes.target!==hash([]))throw Error('Target note is not empty');
  for(const [key,value] of Object.entries(baseline.fields))if(JSON.stringify(current.fields[key])!==JSON.stringify(value))throw Error('Field changed since baseline');
  const patch=patchSharedFields({uid,existingVcard,contactData:{notes:source.contactData.notes}});
  if(!patch.changed)throw Error('No note change');
  return {vcard:patch.vcard,targetEtag,sourceEtag:source.etag,updatedFields:['notes']};
}
module.exports=prepareEmptyNoteFill;
