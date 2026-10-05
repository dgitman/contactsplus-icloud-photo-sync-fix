const fs=require('fs');
const removedIds=[5,6,31,49,222,224,205,210,229,305,310,404];
const walk=f=>f.flatMap(m=>[m,...(m.routes||[]).flatMap(r=>walk(r.flow))]);
function optimizeCreditSteps(blueprint){
 const b=structuredClone(blueprint),all=walk(b.flow),at=id=>all.find(m=>m.id===id);
 if(!removedIds.every(id=>at(id)))throw Error('Expected pre-optimization workflow');
 // Fold the existing pure photo eligibility check into the shared preparation
 // invocation. Isolated scopes retain both adapters without declaration clashes.
 const shared=at(13),photo=at(31);
 for(const item of photo.mapper.input){
  if(shared.mapper.input.find(x=>x.name===item.name)?.value!==item.value)throw Error('Photo input differs: '+item.name);
 }
 shared.mapper.codeEditorJavascript=`const result=(function(input){\n${shared.mapper.codeEditorJavascript}\n})(input);\nif(['unchanged','conflict'].includes(result.status)){\nresult.photoCheck=(function(input){\n${photo.mapper.codeEditorJavascript}\n})(input);\n}\nreturn result;`;
 shared.metadata.designer.name='Prepare supported fields and photo eligibility';
 // Transfer route gates before removing their otherwise-unused variable steps.
 for(const [oldId,nextId] of [[5,11],[6,401],[31,48]]){
  if(at(nextId).filter)throw Error('Destination already filtered');
  at(nextId).filter=structuredClone(at(oldId).filter);
 }
 function rewrite(value){
  if(typeof value==='string')return value.replace(/\b31\.result\b/g,'13.result.photoCheck');
  if(Array.isArray(value))return value.map(rewrite);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rewrite(v)]));
  return value;
 }
 function trim(flow){return flow.filter(m=>!removedIds.includes(m.id)).map(m=>{
  // Do not rewrite JavaScript literals; only mapped inputs and route conditions.
  if(m.mapper){const code=m.mapper.codeEditorJavascript;m.mapper=rewrite(m.mapper);if(code)m.mapper.codeEditorJavascript=code;}
  if(m.filter)m.filter=rewrite(m.filter);
  if(m.routes)for(const r of m.routes)r.flow=trim(r.flow);
  return m;
 });}
 b.flow=trim(b.flow);
 for(const m of walk(b.flow)){
  const mapped=JSON.stringify({...m.mapper,codeEditorJavascript:undefined})+JSON.stringify(m.filter);
  for(const id of removedIds)if(new RegExp('\\{\\{[^}]*\\b'+id+'\\.').test(mapped))throw Error('Dangling reference '+id);
 }
 return b;
}
module.exports={optimizeCreditSteps,removedIds,walk};
if(require.main===module){const raw=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));process.stdout.write(JSON.stringify(optimizeCreditSteps(raw.blueprint||raw),null,2)+'\n');}
