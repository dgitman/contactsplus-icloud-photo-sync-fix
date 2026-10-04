const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const b=JSON.parse(fs.readFileSync(path.join(__dirname,'../unified.blueprint.json')));
const all=[];function walk(ms){for(const m of ms){all.push(m);for(const r of m.routes||[])walk(r.flow)}}walk(b.flow);
test('photo route uses downloaded target bytes and verified baseline before success',()=>{
 assert.equal(all.find(m=>m.id===45).mapper.input.find(x=>x.name==='b64').value,'{{base64(42.data)}}');
 assert.equal(all.find(m=>m.id===46).mapper.data.baselineJson,'{{45.result.baselineJson}}');
 assert.equal(all.find(m=>m.id===47).mapper.data.state,'verified_photo_fill');
});
test('photo route source download has no Apple credentials',()=>{
 assert.deepEqual(all.find(m=>m.id===32).parameters,{authenticationType:'noAuth'});
 assert.equal(all.find(m=>m.id===39).mapper.headers[0].name,'If-Match');
});
test('blueprint references exist and module IDs are unique',()=>{
 const ids=all.map(m=>m.id);assert.equal(new Set(ids).size,ids.length);
 for(const exp of JSON.stringify(b).match(/\{\{[^}]*\}\}/g)||[])for(const match of exp.matchAll(/(?:`(\d+)`|(?<![A-Za-z0-9_])(\d+)\.)/g))assert.ok(ids.includes(Number(match[1]||match[2])),exp);
});
