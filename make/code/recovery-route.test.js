const test=require('node:test'),assert=require('node:assert/strict'),add=require('../scripts/add-recovery-route');
const current=require('../unified.blueprint.json');const base=JSON.parse(JSON.stringify(current));if(base.flow.some(x=>x.id===60)){const router=base.flow.pop();base.flow.push(...router.routes[0].flow);}
const b=add(base),router=b.flow.find(x=>x.id===60),recovery=router.routes[1].flow;
function all(flow){return flow.flatMap(x=>[x,...(x.routes||[]).flatMap(r=>all(r.flow))]);}
test('normal route preserved and receipt recovery never writes a contact',()=>{assert.deepEqual(router.routes[0].flow,base.flow.slice(base.flow.findIndex(x=>x.id===9)+1));const http=all(recovery).filter(x=>x.module.startsWith('http:'));assert.equal(http.length,1);assert.equal(http[0].mapper.method,'get');assert.equal(http[0].mapper.allowRedirects,false);});
test('fresh reads are gated and only verified outcome advances baseline',()=>{assert.equal(recovery.find(x=>x.id===64).filter.conditions[0][0].a,'{{63.result.eligible}}');const mapping=all(recovery).find(x=>x.id===68);assert.equal(mapping.mapper.upsert,false);assert.equal(mapping.filter.conditions[0][0].b,'verified_recovered');assert.equal(new Set(all(b.flow).map(x=>x.id)).size,all(b.flow).length);});
test('duplicate route installation is refused',()=>assert.throws(()=>add(b),/already/));
