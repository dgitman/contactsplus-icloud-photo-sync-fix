// Pure photo policy. Inputs are observations from fresh source/target reads and
// an image decoder, not flags copied from contact metadata. No network or writes.
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function planPhoto({sourceContactId,uid,primaryUrl,target,download,baseline}) {
  if(typeof sourceContactId!=='string'||!sourceContactId||typeof uid!=='string'||!uid)throw Error('Photo identity required');
  const result=(action,reason)=>({action,reason,writesApplied:false});
  if(!target||target.uid!==uid||!['readable','missing','unreadable','unknown'].includes(target.state))throw Error('Invalid target observation');
  if(target.state==='readable'&&!sha(target.contentHash))throw Error('Decoded target hash required');
  // This hash covers the actual PHOTO properties and their grouped metadata,
  // including URL-only representations. It is independent of decoded pixels.
  if(!sha(target.propertyHash))throw Error('Target photo property hash required');
  if(baseline&&(baseline.sourceContactId!==sourceContactId||baseline.uid!==uid||baseline.version!==1||!sha(baseline.sourceContentHash)||!sha(baseline.targetPropertyHash)))throw Error('Invalid photo baseline');
  if(target.state==='unknown')return result('hold','target_not_verified');
  if(!primaryUrl)return result('preserve','no_primary_photo');
  let url;try{url=new URL(primaryUrl);}catch{throw Error('Invalid primary photo URL');}
  if(url.protocol!=='https:'||url.username||url.password)throw Error('HTTPS primary photo URL required');
  // The caller selects the current primary from a fresh authoritative source.
  // Never assume that the first item in an unordered photo array is primary.
  if(!download||download.requestedUrl!==primaryUrl)return result('hold','primary_not_downloaded');
  if(download.statusCode!==200)return result('preserve','source_photo_unavailable');
  if(download.decoded!==true||!sha(download.contentHash)||!['image/jpeg','image/png'].includes(download.mime)||!Number.isInteger(download.width)||!Number.isInteger(download.height)||download.width<1||download.height<1||download.width*download.height>40000000)return result('hold','source_image_not_validated');
  if(target.state==='readable'&&target.contentHash===download.contentHash)return result('unchanged','same_image_content');
  if(baseline&&target.propertyHash!==baseline.targetPropertyHash)return result('hold','target_changed_since_baseline');
  if(target.state==='missing')return result('fill','confirmed_missing_photo');
  if(!baseline)return result('hold','replacement_needs_baseline');
  if(download.contentHash===baseline.sourceContentHash)return result('preserve','source_image_unchanged');
  return result('replace','source_changed_target_unchanged');
}
module.exports={planPhoto};
