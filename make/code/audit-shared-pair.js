// Read-only historical comparison. Never authorizes a write or advances a baseline.
const patchSharedFields=require('./shared-fields');
const {snapshot}=require('./prepare-shared-update');
const {hash}=require('./sync-state');
function auditSharedPair({mapping,source,existingVcard}){
 if(mapping.state!=='verified'||source.contactId!==mapping.sourceContactId)throw Error('Mapping/source identity mismatch');
 const baseline=JSON.parse(mapping.baselineJson);
 if(baseline.version!==1||baseline.uid!==mapping.targetUid||baseline.sourceContactId!==source.contactId)throw Error('Baseline identity mismatch');
 const now=snapshot({sourceContactId:source.contactId,uid:mapping.targetUid,existingVcard,contactData:source.contactData});
 const projected=patchSharedFields({uid:mapping.targetUid,existingVcard,contactData:source.contactData,projectionOnly:true});
 const diff=patchSharedFields({uid:mapping.targetUid,existingVcard,contactData:source.contactData});
 const fields=Object.keys(now.fields),changedSource=fields.filter(k=>now.fields[k].source!==baseline.fields[k]?.source),changedTarget=fields.filter(k=>now.fields[k].target!==baseline.fields[k]?.target);
 return {sourceId:source.contactId,uid:mapping.targetUid,status:diff.changed?'differences':'aligned_supported_fields',differingFields:diff.changedFields,changedSource,changedTarget,missingTargetFields:diff.changedFields.filter(k=>now.fields[k]?.target===hash([])),omittedSourceFields:Object.keys(source.contactData).filter(k=>!Object.hasOwn(projected,k)),unassessedBaselineFields:Object.keys(baseline.fields).filter(k=>!Object.hasOwn(now.fields,k)),photoComparison:'not_performed',writesApplied:false};
}
module.exports=auditSharedPair;
