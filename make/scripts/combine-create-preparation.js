const {walk}=require('./optimize-credit-steps');
const prefix='const phase=(function(input){\n',middle='\n})(input);\nif(phase.status===\'no_photo\'){phase.prepared=(function(input){\n',suffix='\n})(input);}\nreturn phase;';
function splitCode(code){if(!code.startsWith(prefix)||!code.endsWith(suffix))throw Error('Unknown combined creation code');const parts=code.slice(prefix.length,-suffix.length).split(middle);if(parts.length!==2)throw Error('Unknown creation boundary');return parts;}
function combineCreatePreparation(blueprint){
 const b=structuredClone(blueprint),ms=walk(b.flow),at=id=>ms.find(m=>m.id===id),phase=at(223),prepare=at(204),next=at(206);
 if(!phase||!prepare||!next)throw Error('Expected separate creation preparation');
 for(const input of prepare.mapper.input){const old=phase.mapper.input.find(i=>i.name===input.name);if(old&&old.value!==input.value)throw Error('Creation input mismatch '+input.name);if(!old)phase.mapper.input.push(structuredClone(input));}
 phase.mapper.codeEditorJavascript=prefix+phase.mapper.codeEditorJavascript+middle+prepare.mapper.codeEditorJavascript+suffix;
 next.filter={name:'No-photo creation with approved reservation',conditions:prepare.filter.conditions.flatMap(a=>next.filter.conditions.map(c=>[...a,...c]))};
 const rewrite=x=>typeof x==='string'?x.replace(/\b204\.result\b/g,'223.result.prepared'):Array.isArray(x)?x.map(rewrite):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,rewrite(v)])):x;
 function trim(flow){return flow.filter(m=>m.id!==204).map(m=>{if(m.mapper){const code=m.mapper.codeEditorJavascript;m.mapper=rewrite(m.mapper);if(code)m.mapper.codeEditorJavascript=code;}if(m.filter)m.filter=rewrite(m.filter);for(const r of m.routes||[])r.flow=trim(r.flow);return m;});}b.flow=trim(b.flow);return b;
}
module.exports={combineCreatePreparation,splitCode};
