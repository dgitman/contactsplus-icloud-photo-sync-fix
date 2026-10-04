const test=require('node:test'),assert=require('node:assert/strict');
const execute=new Function('input','require',require('./bundle-shared-update')());
const run=input=>execute(input,require);
const {snapshot}=require('./prepare-shared-update');
const existingVcard='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:test\r\nFN:Test\r\nNOTE:Old\r\nEND:VCARD\r\n';
const baseline=snapshot({sourceContactId:'source',uid:'test',existingVcard,contactData:{notes:'Old'}});
const input={source:{contactId:'source',contactData:{notes:'New'}},sourceContactId:'source',uid:'test',existingVcard,targetEtag:'"v1"',baseline:JSON.stringify(baseline)};
test('bundled Make adapter prepares a safe update',()=>{const r=run(input);assert.equal(r.eventState,'prepared_shared_fields');assert.deepEqual(r.updatedFields,['notes']);});
test('bundled Make adapter records a missing baseline as held',()=>{const r=run({...input,baseline:''});assert.equal(r.eventState,'held_needs_baseline');assert.equal(r.changed,false);});
test('bundled Make adapter records conflicts without a writable vCard',()=>{const r=run({...input,existingVcard:existingVcard.replace('Old','Local')});assert.equal(r.eventState,'held_field_conflict');assert.equal(r.vcard,undefined);});
test('bundled Make adapter quarantines malformed data',()=>{const r=run({...input,source:'invalid json'});assert.equal(r.eventState,'held_validation');assert.equal(r.changed,false);});
test('raw API contact prepares updates and preserves source version',()=>{
  const r=run({...input,source:{statusCode:200,body:{contacts:[{...input.source,etag:'source-version'}]}}});
  assert.equal(r.eventState,'prepared_shared_fields');assert.equal(r.sourceEtag,'source-version');
});
test('raw API wrong identity and missing contacts cannot produce a write',()=>{
  for(const contacts of [[],[{...input.source,contactId:'other',etag:'version'}]]){
    const r=run({...input,source:{statusCode:200,body:{contacts}}});
    assert.equal(r.eventState,'held_validation');assert.equal(r.changed,false);assert.equal(r.vcard,undefined);
  }
});
