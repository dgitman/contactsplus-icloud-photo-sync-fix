const patchSharedFields=require('./shared-fields');
const {snapshot}=require('./prepare-shared-update');
const classifyUrlDifferences=require('./classify-url-differences');
function prepareUrlLabelRepair({mapping,source,existingVcard,targetEtag,mode='label'}){
 if(mapping.state!=='verified'||mapping.sourceAccountId!=='contactsplus-primary'||source.contactId!==mapping.sourceContactId)throw Error('Mapping identity mismatch');
 const baseline=JSON.parse(mapping.baselineJson),uid=mapping.targetUid;
 if(baseline.version!==1||baseline.uid!==uid||baseline.sourceContactId!==source.contactId)throw Error('Baseline identity mismatch');
 if(!/^"[^"\r\n]+"$/.test(targetEtag||''))throw Error('Strong target ETag required');
 const current=snapshot({sourceContactId:source.contactId,uid,existingVcard,contactData:source.contactData});
 for(const [key,value] of Object.entries(baseline.fields))if(JSON.stringify(current.fields[key])!==JSON.stringify(value))throw Error('Field changed since baseline');
 if(!baseline.fields.urls)throw Error('URL baseline required');
 const targetUrls=existingVcard.replace(/\r\n[ \t]/g,'').split('\r\n').filter(l=>/^(?:[^:;.]+\.)?(URL|X-SOCIALPROFILE|X-ABLabel)[;:]/i.test(l));
 const diagnosis=classifyUrlDifferences({sourceUrls:source.contactData.urls,targetUrls});
 if(!['label','missing_profile_ids'].includes(mode))throw Error('Unknown repair mode');
 const expected=mode==='label'?'["label"]':'["userId"]';
 if(diagnosis.category!=='same_urls_metadata_differs'||JSON.stringify(diagnosis.differences)!==expected)throw Error('Not a '+(mode==='label'?'label-only':'missing-profile-ID')+' repair');
 // This mode only fills absent IDs; never replace or remove a target profile ID.
 if(mode==='missing_profile_ids'&&targetUrls.some(l=>/;X-USERID=/i.test(l)))throw Error('Existing profile ID requires separate review');
 const patch=patchSharedFields({uid,existingVcard,contactData:{urls:source.contactData.urls}});
 if(!patch.changed||JSON.stringify(patch.changedFields)!=='["urls"]')throw Error('No supported URL-only change');
 return {vcard:patch.vcard,targetEtag,sourceEtag:source.etag,updatedFields:['urls']};
}
module.exports=prepareUrlLabelRepair;
