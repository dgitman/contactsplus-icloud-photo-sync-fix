const {snapshot}=require('./prepare-shared-update');
const selectPrimaryPhoto=require('./select-primary-photo');
const {verifyPhotoFill}=require('./prepare-photo-fill');
// Only photo-only changes are admitted. Mixed edits remain held atomically.
function photoFillGate({source,sourceContactId,uid,existingVcard,baseline}){
  const hold=reason=>({status:'held',reason});
  if(!baseline||baseline.version!==1||baseline.uid!==uid||baseline.sourceContactId!==sourceContactId||!baseline.fields)throw Error('Accepted mapping baseline required');
  const selected=selectPrimaryPhoto({source,sourceContactId});
  if(selected.status!=='download')return hold(selected.reason);
  const current=snapshot({sourceContactId,uid,existingVcard,contactData:source.contactData});
  for(const field of new Set([...Object.keys(current.fields),...Object.keys(baseline.fields)])){
    if(field==='photos')continue;
    if(!current.fields[field]||!baseline.fields[field]||current.fields[field].source!==baseline.fields[field].source)return hold('mixed_source_changes');
  }
  if(existingVcard.replace(/\r\n[ \t]/g,'').split('\r\n').some(l=>/^(?:[^.;:]+\.)?(PHOTO|X-IMAGEHASH|X-IMAGETYPE)[;:]/i.test(l)))return hold('existing_photo_preserved');
  if(baseline.fields.photos&&current.fields.photos.target!==baseline.fields.photos.target)return hold('independent_photo_removal');
  return {...selected,status:'eligible'};
}
function advancePhotoBaseline({source,baseline,prepared,actual,targetEtag,download}){
  if(source.contactId!==prepared.sourceContactId||source.etag!==prepared.sourceEtag)throw Error('Source verification mismatch');
  if(!baseline||baseline.uid!==prepared.uid||baseline.sourceContactId!==source.contactId||baseline.version!==1||!baseline.fields)throw Error('Baseline identity mismatch');
  const verified=verifyPhotoFill({prepared,actual,targetEtag,download});
  const current=snapshot({sourceContactId:source.contactId,uid:prepared.uid,existingVcard:actual,contactData:source.contactData});
  if(!current.fields.photos)throw Error('Source photo snapshot required');
  const next=JSON.parse(JSON.stringify(baseline));
  next.fields.photos=current.fields.photos;next.photoBaseline=verified.photoBaseline;
  return {...verified,baselineJson:JSON.stringify(next)};
}
module.exports={photoFillGate,advancePhotoBaseline};
