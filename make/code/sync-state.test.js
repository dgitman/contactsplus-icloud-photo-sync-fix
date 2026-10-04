const {test}=require('node:test');
const assert=require('node:assert/strict');
const {hash,planFields,reconcile,deletionDecision}=require('./sync-state');
const baseline={notes:{source:hash('old'),target:hash('old')}};
const plan=(s,t)=>planFields({source:{notes:s},target:{notes:t},baseline,fields:['notes']});
test('source change becomes a patch only while target is unchanged',()=>assert.deepEqual(plan('new','old').patch,{notes:'new'}));
test('target-only edits are preserved and echo events produce no write',()=>{
 assert.equal(plan('old','apple edit').status,'unchanged');
 assert.equal(plan('new','new').status,'unchanged');
});
test('opposing edits hold the whole contact and explicit clearing is supported',()=>{
 assert.equal(plan('source edit','apple edit').status,'conflict');
 assert.deepEqual(plan('','old').patch,{notes:''});
});
test('unmapped and incomplete snapshots never imply creation or field removal',()=>{
 assert.equal(planFields({}).status,'needs_baseline');
 assert.throws(()=>planFields({source:{},target:{notes:''},baseline,fields:['notes']}),/Incomplete/);
});
test('interrupted updates are verified by readback, never blindly retried',()=>{
 const p={operation:'update',exists:true,expectedUid:'x',actualUid:'x',expectedHash:'after',beforeHash:'before'};
 assert.equal(reconcile({...p,currentHash:'after'}),'verified');
 assert.equal(reconcile({...p,currentHash:'before'}),'hold_unconfirmed_update');
 assert.equal(reconcile({...p,currentHash:'other'}),'conflict');
 assert.equal(reconcile({...p,actualUid:'wrong',currentHash:'after'}),'identity_conflict');
});
test('uncertain creates and deletions remain held unless outcome is observed',()=>{
 assert.equal(reconcile({operation:'create',exists:false}),'hold_unconfirmed_create');
 assert.equal(reconcile({operation:'delete',exists:false}),'verified_deleted');
 assert.equal(reconcile({operation:'delete',exists:true,expectedUid:'x',actualUid:'x'}),'hold_uncertain_delete');
});
test('merge deletion is not automatically propagated',()=>{
 assert.equal(deletionDecision({mappingState:'verified',sourceMissing:true}),'review_merge_or_delete');
 assert.equal(deletionDecision({mappingState:'verified',sourceMissing:true,mergeDisposition:'confirmed_standalone_delete'}),'delete');
});
test('hashes are stable for object key ordering',()=>assert.equal(hash({a:1,b:2}),hash({b:2,a:1})));
