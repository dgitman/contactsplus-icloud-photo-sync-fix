const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const build=require('../scripts/add-creation-route'),bundle=require('./bundle-create-transaction');
const walk=f=>f.flatMap(m=>[m,...(m.routes||[]).flatMap(r=>walk(r.flow))]);
test('cloud creation bundle preserves guarded public API',()=>{const c=new Function('require',bundle()+'return creation;')(require);assert.equal(c.prepareCreateTransaction({}).reason,'new_contact_lookup_policy_disabled');assert.equal(c.reconcileCreateTransaction({statusCode:404}).writesAllowed,false);});
test('creation cloud route persists attempt before conditional PUT and gates verified mapping',()=>{
 const original=JSON.parse(fs.readFileSync(path.join(__dirname,'../unified.blueprint.json')));const first=walk(original.flow).find(m=>m.id===60).routes[0].flow;const pos=first.findIndex(m=>m.id===200);if(pos>=0)first.splice(pos,1,...first[pos].routes[0].flow);const b=build(original,{connectionId:1});const m=walk(b.flow),at=id=>m.find(x=>x.id===id);assert.equal(new Set(m.map(x=>x.id)).size,m.length);
 const f=at(200).routes[1].flow.map(x=>x.id);assert.ok(f.indexOf(211)<f.indexOf(215));assert.ok(f.indexOf(212)<f.indexOf(215));assert.equal(at(206).mapper.overwrite,false);assert.equal(at(215).mapper.headers[0].name,'If-None-Match');assert.equal(at(215).mapper.headers[0].value,'*');assert.equal(at(220).filter.conditions[0][0].b,'verified_create');assert.ok(at(11).filter.conditions.every(c=>c.some(x=>x.a==='{{8.state}}'&&x.b==='verified')));
 assert.throws(()=>build(b,{connectionId:1}),/already installed/);
});
