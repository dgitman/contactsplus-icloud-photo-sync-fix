const test=require('node:test'),assert=require('node:assert/strict');
const {optimizeCreditSteps,removedIds,walk}=require('../scripts/optimize-credit-steps');
const deployed=require('../unified.blueprint.json');
const deployedModules=new Map(walk(deployed.flow).map(m=>[m.id,m]));
const combined=deployedModules.get(13).mapper.codeEditorJavascript;
const prefix='const result=(function(input){\n', separator="\n})(input);\nif(['unchanged','conflict'].includes(result.status)){\nresult.photoCheck=(function(input){\n",suffix='\n})(input);\n}\nreturn result;';
assert.ok(combined.startsWith(prefix)&&combined.endsWith(suffix));
const [sharedCode,photoCode]=combined.slice(prefix.length,-suffix.length).split(separator);
assert.ok(sharedCode&&photoCode);
// Minimal pre-migration graph exercises removal, route gates and reference rewriting.
const retained=[11,13,32,37,48,401,16,17,18,28,19,38,39,40,41,45,46,47,206,207,211,212,213,214,215,216,218,219,220,306,311,314,315,316,318,406,407,408,409,410,411,413,66,166,425,1425,435,1435];
const original={flow:[...removedIds,...retained].map(id=>({id,mapper:{input:[]},metadata:{designer:{}}}))};
for(const [id,code] of [[13,sharedCode],[31,photoCode]])original.flow.find(m=>m.id===id).mapper.codeEditorJavascript=code;
for(const id of [5,6,31])original.flow.find(m=>m.id===id).filter={name:'gate '+id,conditions:[[{a:'{{1.type}}',o:'text:equal',b:String(id)}]]};
original.flow.find(m=>m.id===32).mapper.result='{{31.result.action}}';
const optimized=optimizeCreditSteps(original),before=new Map(walk(original.flow).map(m=>[m.id,m])),after=new Map(walk(optimized.flow).map(m=>[m.id,m]));
test('removes twelve overhead modules while preserving write and recovery boundaries',()=>{
 assert.equal(before.size-after.size,12);
 for(const id of removedIds)assert.ok(!deployedModules.has(id));
 assert.equal(after.get(32).mapper.result,'{{13.result.photoCheck.action}}');
 assert.equal(after.get(13).mapper.codeEditorJavascript,combined);
 for(const id of removedIds)assert.ok(!after.has(id));
 for(const id of [16,17,18,28,19,38,39,40,41,45,46,47,206,207,211,212,213,214,215,216,218,219,220,306,311,314,315,316,318,406,407,408,409,410,411,413,66,166,425,1425,435,1435])assert.deepEqual(after.get(id),before.get(id));
 for(const [oldId,nextId] of [[5,11],[6,401],[31,48]])assert.deepEqual(after.get(nextId).filter,before.get(oldId).filter);
});
test('combined preparation returns exactly the original shared and photo decisions',()=>{
 const run=(m,input)=>new Function('input','require',m.mapper.codeEditorJavascript)(input,require);
 const {snapshot}=require('./prepare-shared-update');
 const card='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:test\r\nFN:Test\r\nNOTE:Old\r\nEND:VCARD\r\n';
 const old={notes:'Old',photos:[{value:'https://example.com/photo.jpg',isPrimary:true}]};
 const baseline=JSON.stringify(snapshot({sourceContactId:'source',uid:'test',existingVcard:card,contactData:old}));
 const input={source:{contactId:'source',etag:'version',contactData:old},sourceContactId:'source',uid:'test',eventId:'event',existingVcard:card,targetEtag:'"v1"',baseline};
 for(const candidate of [input,{...input,source:{...input.source,contactData:{...old,notes:'New'}}},{...input,existingVcard:card.replace('Old','Local'),source:{...input.source,contactData:{...old,notes:'New'}}},{...input,source:'invalid json'},{...input,baseline:''}]){
  const expected=run(before.get(13),candidate),actual=run(after.get(13),candidate);
  if(['unchanged','conflict'].includes(expected.status))expected.photoCheck=run(before.get(31),candidate);
  assert.deepEqual(actual,expected);
 }
});
