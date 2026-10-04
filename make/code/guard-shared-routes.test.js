const test=require('node:test'),assert=require('node:assert/strict'),guard=require('../scripts/guard-shared-routes');
const blueprint=require('../unified.blueprint.json');
const view=b=>{if(b.flow.some(x=>x.id===71))b.flow=[b.flow[0],...b.flow.find(x=>x.id===71).routes[0].flow];if(b.flow.some(x=>x.id===60)){const r=b.flow.pop();b.flow.push(...r.routes[0].flow);}return b;};
test('guarded blueprint has no automatic target delete route',()=>{const b=view(guard(blueprint)),route=b.flow.find(m=>m.id===3).routes.find(r=>r.flow.some(m=>m.id===6));assert.equal(route.flow.length,2);assert.equal(route.flow[1].mapper.data.state,'held_merge_or_delete');assert.ok(route.flow.every(m=>!m.module.startsWith('http:')));});
test('baseline verification precedes mapping advancement',()=>{const b=view(guard(blueprint)),route=b.flow.find(m=>m.id===3).routes.find(r=>r.flow.some(m=>m.id===5));const flow=route.flow.find(m=>m.id===30)?.routes.find(r=>r.flow.some(m=>m.id===16)).flow||route.flow;const ids=flow.map(m=>m.id);assert.ok(ids.indexOf(18)<ids.indexOf(28)&&ids.indexOf(28)<ids.indexOf(19));assert.equal(flow.find(m=>m.id===28).mapper.upsert,false);assert.equal(flow.find(m=>m.id===16).filter.conditions[0].length,2);});
test('raw source reader retains configured-target guards and is idempotent',()=>{
  const b=view(guard(blueprint)),route=b.flow.find(m=>m.id===3).routes.find(r=>r.flow.some(m=>m.id===5));
  assert.equal(route.flow.find(m=>m.id===11).module,'contactsplus:makeAPICall');
  assert.equal(route.flow.find(m=>m.id===11).mapper.url,'/v1/contacts.get');
  const gates=route.flow.find(m=>m.id===12).filter.conditions[0];
  assert.equal(gates.length,3);assert.ok(gates.some(c=>c.a==='{{8.targetHref}}'));assert.ok(gates.some(c=>c.a==='{{8.targetUid}}'));
  assert.deepEqual(guard(b),b);
});
test('added events reuse exact mapped update path, never a create branch',()=>{
  const b=view(guard(blueprint)),router=b.flow.find(m=>m.id===3);
  assert.ok(!router.routes.some(r=>r.flow.some(m=>m.id===4)));
  const gate=router.routes.find(r=>r.flow.some(m=>m.id===5)).flow[0].filter.conditions;
  assert.deepEqual(gate.map(c=>c[0].b),['contact.added','contact.updated']);
  assert.equal(router.filter.conditions[0].find(c=>c.a==='{{8.state}}').b,'verified');
  assert.equal(router.filter.conditions[0].find(c=>c.a==='{{8.sourceContactId}}').b,'{{2.data.contactId}}');
});
test('unmapped first deliveries receive an explicit hold and duplicates stop first',()=>{
  const b=view(guard(blueprint)),ids=b.flow.map(m=>m.id);
  assert.ok(ids.indexOf(9)<ids.indexOf(7)&&ids.indexOf(7)<ids.indexOf(10)&&ids.indexOf(10)<ids.indexOf(8));
  assert.deepEqual(b.flow.find(m=>m.id===7).filter.conditions,[[{a:'{{9.exist}}',b:false,o:'boolean:equal'}]]);
  assert.match(b.flow.find(m=>m.id===10).mapper.data.state,/held_needs_identity/);
  assert.equal(b.flow.find(m=>m.id===10).mapper.overwrite,false);
});

test('guard refresh preserves nested recovery branch',()=>{const b=guard(blueprint);assert.ok((b.flow.find(x=>x.id===71)?.routes[0].flow||b.flow).some(x=>x.id===60));assert.deepEqual(guard(b),b);});
