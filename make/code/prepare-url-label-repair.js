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
 if(!['label','missing_profile_ids','label_and_missing_profile_ids','social_representation','missing_social_metadata'].includes(mode))throw Error('Unknown repair mode');
 const expected=mode==='label'?'["label"]':mode==='missing_profile_ids'?'["userId"]':'["label","userId"]';
 if(!['social_representation','missing_social_metadata'].includes(mode)&&(diagnosis.category!=='same_urls_metadata_differs'||JSON.stringify(diagnosis.differences)!==expected))throw Error('Not a '+(mode==='label'?'label-only':'missing-profile-ID')+' repair');
 // This mode only fills absent IDs; never replace or remove a target profile ID.
 if(!['label','social_representation','missing_social_metadata'].includes(mode)&&targetUrls.some(l=>/;X-USERID=/i.test(l)))throw Error('Existing profile ID requires separate review');
 if(mode==='missing_social_metadata'){
  if(diagnosis.category!=='same_urls_metadata_differs'||!diagnosis.differences.includes('username'))throw Error('Expected missing username metadata');
  for(const line of targetUrls.filter(l=>/^(?:[^:;.]+\.)?X-SOCIALPROFILE[;:]/i.test(l))){
   const i=line.indexOf(':'),value=line.slice(i+1).replace(/\\([\\,;])/g,'$1'),params=Object.fromEntries(line.slice(0,i).split(';').slice(1).map(p=>{const j=p.indexOf('=');return [p.slice(0,j).toUpperCase(),p.slice(j+1)];}));
   const u=source.contactData.urls.find(x=>x.value===value);if(!u)throw Error('Social URL changed');
   if(params['X-USER']&&params['X-USER']!==u.username)throw Error('Existing username conflict');
   if(params['X-USERID']&&params['X-USERID']!==u.userId)throw Error('Existing profile ID conflict');
  }
 }
 if(mode==='social_representation'){
  const equivalent=diagnosis.category==='same_urls_and_metadata';
  if(!equivalent&&(diagnosis.category!=='same_urls_metadata_differs'||JSON.stringify(diagnosis.differences)!=='["label","userId","username"]'))throw Error('Not a reviewed social representation');
  if(!equivalent){
   // Only relocate an exact Flickr/Myspace ID carried in X-USER. Never drop a distinct handle.
   for(const line of targetUrls.filter(l=>/^(?:[^:;.]+\.)?X-SOCIALPROFILE[;:]/i.test(l))){
    const i=line.indexOf(':'),value=line.slice(i+1).replace(/\\([\\,;])/g,'$1'),params=Object.fromEntries(line.slice(0,i).split(';').slice(1).map(p=>{const j=p.indexOf('=');return [p.slice(0,j).toUpperCase(),p.slice(j+1)];}));
    const sourceUrl=source.contactData.urls.find(u=>u.value===value);if(!sourceUrl)throw Error('Social URL changed');
    if(params['X-USERID'])throw Error('Existing profile ID requires separate review');
    const user=params['X-USER']||'';
    if(user!==(sourceUrl.username||'')&&!(user&&user===sourceUrl.userId&&!sourceUrl.username&&['flickr','myspace'].includes(sourceUrl.type)))throw Error('Distinct username must be preserved');
   }
  }
 }
 const patch=patchSharedFields({uid,existingVcard,contactData:{urls:source.contactData.urls}});
 if(!patch.changed||JSON.stringify(patch.changedFields)!=='["urls"]')throw Error('No supported URL-only change');
 return {vcard:patch.vcard,targetEtag,sourceEtag:source.etag,updatedFields:['urls']};
}
module.exports=prepareUrlLabelRepair;
