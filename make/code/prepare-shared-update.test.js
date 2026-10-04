const test=require('node:test'),assert=require('node:assert/strict');
const {snapshot,prepareSharedUpdate:prepare}=require('./prepare-shared-update');
const card='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:test\r\nN:Person;Test;;;\r\nFN:Test Person\r\nNOTE:Original\r\nTEL:123\r\nPHOTO;VALUE=uri:https://example.test/pic\r\nEND:VCARD\r\n';
const data={notes:'Original',phoneNumbers:[{value:'123'}],photos:[{value:'https://example.test/source'}]};
const baseline=snapshot({sourceContactId:'source',uid:'test',existingVcard:card,contactData:data});
const run=(contactData=data,extra={})=>prepare({source:{contactId:'source',contactData},sourceContactId:'source',uid:'test',existingVcard:card,targetEtag:'"v1"',baseline,...extra});
test('no baseline never prepares a write',()=>assert.equal(run({...data,notes:'New'},{baseline:null}).status,'needs_baseline'));
test('source-only edit prepares conditional update',()=>{const r=run({...data,notes:'New'});assert.equal(r.status,'prepared-only');assert.equal(r.targetEtag,'"v1"');assert.equal(r.writesApplied,false);assert.match(r.vcard,/NOTE:New/);assert.match(r.vcard,/PHOTO;VALUE=uri:/);});
test('target-only edit remains unchanged',()=>{const target=card.replace('Original','Local');assert.equal(run(data,{existingVcard:target}).vcard,target);});
test('independent edits to different fields combine without loss',()=>{const r=run({...data,notes:'New'},{existingVcard:card.replace('TEL:123','TEL:456')});assert.match(r.vcard,/NOTE:New/);assert.match(r.vcard,/TEL:456/);});
test('both sides edit same field: entire contact held',()=>{const r=run({...data,notes:'Source'},{existingVcard:card.replace('Original','Target')});assert.equal(r.status,'conflict');assert.deepEqual(r.conflicts,['notes']);assert.equal(r.vcard,undefined);});
test('new field can fill an empty target but missing source field remains held',()=>{assert.equal(run({...data,emails:[]}).status,'unchanged');const {notes,...rest}=data;assert.equal(run(rest).status,'conflict');});
test('new email fills only a freshly empty target',()=>{
  const source={...data,emails:[{value:'new@example.test'}]};
  const r=run(source);assert.equal(r.status,'prepared-only');assert.match(r.vcard,/EMAIL:new@example.test/);
  assert.equal(run(source,{existingVcard:card.replace('END:VCARD','EMAIL:local@example.test\r\nEND:VCARD')}).status,'conflict');
});
test('new photo field still requires separate photo verification',()=>{
  const b=JSON.parse(JSON.stringify(baseline));delete b.fields.photos;
  assert.equal(run(data,{baseline:b,existingVcard:card.replace(/PHOTO[^\r]+\r\n/,'')}).status,'conflict');
});
test('changed primary/alternate photo data cannot be silently ignored',()=>assert.deepEqual(run({...data,photos:[]}).conflicts,['photos']));
test('wrong baseline identity and weak ETag fail',()=>{assert.throws(()=>run(data,{baseline:{...baseline,uid:'other'}}),/Baseline/);assert.throws(()=>run(data,{targetEtag:'W/"v1"'}),/ETag/);});
test('baseline stores hashes rather than contact contents',()=>{const serialized=JSON.stringify(baseline);assert.doesNotMatch(serialized,/Original|https:|PHOTO/);assert.match(serialized,/[a-f0-9]{64}/);});
test('unknown source data remains held',()=>assert.throws(()=>run({...data,dates:[{type:'Anniversary'}]}),/Unsupported populated/));
