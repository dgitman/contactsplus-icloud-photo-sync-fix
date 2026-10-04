// Lightweight sync decisions: no contact bodies or photos are persisted here.
const crypto = require('node:crypto');
function stable(value) {
  if (value === undefined) throw new Error('Incomplete snapshot');
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',') + '}';
}
function hash(value) { return crypto.createHash('sha256').update(stable(value)).digest('hex'); }
function planFields({source,target,baseline,fields}) {
  if (!baseline) return {status:'needs_baseline',patch:{},conflicts:[]};
  const patch={}, conflicts=[];
  for (const field of fields) {
    if (!Object.hasOwn(source,field)||!Object.hasOwn(target,field)||!baseline[field])
      throw Error('Incomplete field snapshot: '+field);
    const s=hash(source[field]), t=hash(target[field]), old=baseline[field];
    if(s===t || s===old.source) continue; // Converged, or only target changed.
    if(t!==old.target) conflicts.push(field);
    else patch[field]=source[field];
  }
  // Apply nothing on a conflict: one contact is one atomic CardDAV resource.
  if(conflicts.length)return {status:'conflict',patch:{},conflicts};
  return {status:Object.keys(patch).length?'update':'unchanged',patch,conflicts};
}
function reconcile({operation,currentHash,beforeHash,expectedHash,exists,expectedUid,actualUid}) {
  if (exists && (!expectedUid || actualUid!==expectedUid)) return 'identity_conflict';
  if(operation==='delete') return exists?'hold_uncertain_delete':'verified_deleted';
  if(!['create','update'].includes(operation))throw Error('Unknown operation');
  if(exists && expectedHash && currentHash===expectedHash)return 'verified';
  // A stale/reordered source event must never force a second uncertain write.
  if(operation==='create' && !exists)return 'hold_unconfirmed_create';
  if(operation==='update' && exists && beforeHash && currentHash===beforeHash)return 'hold_unconfirmed_update';
  return 'conflict';
}
function deletionDecision({sourceMissing,mergeDisposition,mappingState}) {
  if(mappingState==='deleted')return 'already_deleted';
  if(mappingState!=='verified'||!sourceMissing)return 'hold';
  // A deletion event alone cannot tell us whether fields moved to a survivor.
  return mergeDisposition==='confirmed_standalone_delete'?'delete':'review_merge_or_delete';
}
module.exports={hash,planFields,reconcile,deletionDecision};
