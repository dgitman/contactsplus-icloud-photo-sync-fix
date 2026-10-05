const test=require('node:test'),assert=require('node:assert/strict');
const optimize=require('../scripts/optimize-photo-overhead');
const {walk}=require('../scripts/optimize-credit-steps');
const blueprint=require('../unified.blueprint.json');
test('photo path reuses an exact target version and retains conditional write and readback',()=>{
 const ms=new Map(walk(blueprint.flow).map(m=>[m.id,m]));
 assert.ok(!ms.has(36)&&!ms.has(48));
 assert.equal(ms.get(37).mapper.input.find(i=>i.name==='card').value,'{{12.data}}');
 assert.equal(ms.get(37).mapper.input.find(i=>i.name==='etag').value,'{{12.headers.etag}}');
 assert.ok(ms.get(39).mapper.headers.some(h=>h.name==='If-Match'&&h.value.includes('37.result')));
 assert.ok([35,38,40,41,42,43,44,45,46,47].every(id=>ms.has(id)));
 for(const group of ms.get(32).filter.conditions){assert.ok(group.some(c=>c.a==='{{13.result.photoCheck.status}}'&&c.b==='eligible'));assert.ok(group.some(c=>c.a==='{{13.result.status}}'&&['unchanged','conflict'].includes(c.b)));}
 assert.match(ms.get(14).mapper.data.state,/photo_download_pending/);
});
test('transform combines route gates without weakening either condition',()=>{
 const mod=(id,mapper={},filter)=>({id,mapper,filter});
 const b={flow:[mod(12),mod(14,{data:{state:'old'}}),mod(32,{}, {conditions:[[{a:'eligible'}]]}),mod(36),mod(37,{input:[{name:'card',value:'{{36.data}}'},{name:'etag',value:'{{36.headers.etag}}'}]}),mod(48,{data:{state:'{{photoState}}'}},{conditions:[[{a:'unchanged'}],[{a:'conflict'}]]})]};
 const next=optimize(b);assert.deepEqual(next.flow.find(m=>m.id===32).filter.conditions,[[{a:'unchanged'},{a:'eligible'}],[{a:'conflict'},{a:'eligible'}]]);assert.equal(b.flow.length,6);assert.equal(next.flow.length,4);
});
