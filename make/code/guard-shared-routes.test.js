const test=require('node:test'),assert=require('node:assert/strict'),guard=require('../scripts/guard-shared-routes');
const blueprint=require('../unified.blueprint.json');
test('guarded blueprint has no automatic target delete route',()=>{const b=guard(blueprint),route=b.flow.find(m=>m.id===3).routes.find(r=>r.flow.some(m=>m.id===6));assert.equal(route.flow.length,2);assert.equal(route.flow[1].mapper.data.state,'held_merge_or_delete');assert.ok(route.flow.every(m=>!m.module.startsWith('http:')));});
test('baseline verification precedes mapping advancement',()=>{const b=guard(blueprint),route=b.flow.find(m=>m.id===3).routes.find(r=>r.flow.some(m=>m.id===5));const ids=route.flow.map(m=>m.id);assert.ok(ids.indexOf(18)<ids.indexOf(28)&&ids.indexOf(28)<ids.indexOf(19));assert.equal(route.flow.find(m=>m.id===28).mapper.upsert,false);assert.equal(route.flow.find(m=>m.id===16).filter.conditions[0].length,2);});
test('raw source reader retains configured-target guards and is idempotent',()=>{
  const b=guard(blueprint),route=b.flow.find(m=>m.id===3).routes.find(r=>r.flow.some(m=>m.id===5));
  assert.equal(route.flow.find(m=>m.id===11).module,'contactsplus:makeAPICall');
  assert.equal(route.flow.find(m=>m.id===11).mapper.url,'/v1/contacts.get');
  const gates=route.flow.find(m=>m.id===12).filter.conditions[0];
  assert.equal(gates.length,3);assert.ok(gates.some(c=>c.a==='{{8.targetHref}}'));assert.ok(gates.some(c=>c.a==='{{8.targetUid}}'));
  assert.deepEqual(guard(b),b);
});
