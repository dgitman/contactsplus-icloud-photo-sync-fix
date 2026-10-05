// Builds a bounded repair using the previously verified connected pilot blueprint.
// Inputs and generated blueprint are private and must stay outside Git.
const fs=require('node:fs'),path=require('node:path');
const [selection,template,mode='label']=process.argv.slice(2);
if(!['label','missing_profile_ids','label_and_missing_profile_ids'].includes(mode))throw Error('Unsupported repair mode');
const expected=mode==='label'?'["label"]':mode==='missing_profile_ids'?'["userId"]':'["label","userId"]';
if(!selection||!template)throw Error('Private selection and connected pilot required');
const rows=JSON.parse(fs.readFileSync(selection)),b=JSON.parse(fs.readFileSync(template));
if(!rows.length||rows.length>50||new Set(rows.map(r=>r.sourceId)).size!==rows.length||rows.some(r=>!/^[a-f0-9]{32}$/.test(r.sourceId)||JSON.stringify(r.urlDiagnosis?.differences)!==expected))throw Error('Expected 1–50 unique records reviewed for the selected mode');
const get=id=>{const m=b.flow.find(m=>m.id===id);if(!m)throw Error('Pilot shape changed');return m;};
get(2).mapper.array=rows.map(r=>({sourceId:r.sourceId}));
const strip=n=>fs.readFileSync(path.join(__dirname,'../code',n+'.js'),'utf8').replace(/^const .*require.*;$/gm,'').replace(/^module.exports=.*;$/gm,'');
const prefix=get(18).mapper.codeEditorJavascript.split('\nreturn advanceSharedBaseline(')[0];
get(13).mapper.codeEditorJavascript=prefix+'\n'+strip('classify-url-differences')+'\n'+strip('prepare-url-label-repair')+`try {return {...prepareUrlLabelRepair({...input,source:readSourceResponse(input.source),mode:${JSON.stringify(mode)}}),status:'prepared',sourceId:input.mapping.sourceContactId};}catch(error){return {status:'held_before_write',reason:String(error.message),sourceId:input.mapping.sourceContactId,writesApplied:false};}`;
// Combine two code calls without dropping the baseline-concurrency check.
const verify=get(18),fresh=get(20);
verify.mapper.input.push({name:'currentBaseline',value:'{{20.baselineJson}}'},{name:'currentState',value:'{{20.state}}'});
verify.mapper.codeEditorJavascript=verify.mapper.codeEditorJavascript.replace('\nreturn advanceSharedBaseline(',"\nif(input.baseline!==input.currentBaseline||input.currentState!=='verified')throw Error('Mapping changed; do not retry write');\nreturn advanceSharedBaseline(");
b.flow=b.flow.filter(m=>![18,20,21].includes(m.id));b.flow.splice(b.flow.findIndex(m=>m.id===28),0,fresh,verify);
get(16).filter={name:'Only freshly verified metadata repairs',conditions:[[{a:'{{13.result.status}}',o:'text:equal',b:'prepared'}]]};
b.name=mode==='label'?'Contacts sync — reviewed website label repairs':'Contacts sync — reviewed missing profile IDs';process.stdout.write(JSON.stringify(b,null,2)+'\n');
