// Bundled after shared-fields.js, sync-state.js and prepare-shared-update.js.
// Malformed/unsupported source data is retained as a held event, not a write.
try {
  const source=readSourceResponse(input.source);
  const baseline=typeof input.baseline==='string'&&input.baseline?JSON.parse(input.baseline):input.baseline||null;
  const r=prepareSharedUpdate({...input,source,baseline});
  return {...r,eventState:r.status==='prepared-only'?'prepared_shared_fields':
    r.status==='unchanged'?'unchanged_shared_fields':
    r.status==='needs_baseline'?'held_needs_baseline':'held_field_conflict'};
} catch(error) {
  return {changed:false,writesApplied:false,status:'held',eventState:'held_validation',reason:String(error.message)};
}
