const {walk}=require('./optimize-credit-steps');
function optimizePhotoOverhead(blueprint){
 const b=structuredClone(blueprint),modules=walk(b.flow),at=id=>modules.find(m=>m.id===id);
 for(const id of [12,14,32,36,37,48])if(!at(id))throw Error('Expected pre-optimization module '+id);
 const photoState=at(48).mapper.data.state.slice(2,-2);
 at(14).mapper.data.state=`{{if(13.result.status = "unchanged"; ${photoState}; if(13.result.status = "conflict"; ${photoState}; 13.result.eventState))}}`;
 at(32).filter={name:'Photo-only or unchanged source with eligible photo',conditions:at(48).filter.conditions.flatMap(a=>at(32).filter.conditions.map(c=>[...a,...c]))};
 // Keep the original target version for the conditional PUT. A concurrent edit
 // causes If-Match to fail, rather than paying for another pre-write GET.
 for(const input of at(37).mapper.input){
  if(input.name==='card'&&input.value==='{{36.data}}')input.value='{{12.data}}';
  else if(input.name==='etag'&&input.value==='{{36.headers.etag}}')input.value='{{12.headers.etag}}';
 }
 const trim=flow=>flow.filter(m=>![36,48].includes(m.id)).map(m=>{for(const r of m.routes||[])r.flow=trim(r.flow);return m;});
 b.flow=trim(b.flow);
 for(const m of walk(b.flow))if(/\b(?:36|48)\./.test(JSON.stringify({...m.mapper,codeEditorJavascript:undefined})+JSON.stringify(m.filter)))throw Error('Dangling removed-module reference');
 return b;
}
module.exports=optimizePhotoOverhead;
