// Builds a bounded repair using the previously verified connected pilot blueprint.
// Inputs and generated blueprint are private and must stay outside Git.
const fs=require('node:fs');
const [selection,template]=process.argv.slice(2);
if(!selection||!template)throw Error('Private selection and connected pilot required');
const rows=JSON.parse(fs.readFileSync(selection)),b=JSON.parse(fs.readFileSync(template));
if(!rows.length||rows.length>50||new Set(rows.map(r=>r.sourceId)).size!==rows.length||rows.some(r=>!/^[a-f0-9]{32}$/.test(r.sourceId)||JSON.stringify(r.urlDiagnosis?.differences)!=='["label"]'))throw Error('Expected 1–50 reviewed label-only records');
const get=id=>{const m=b.flow.find(m=>m.id===id);if(!m)throw Error('Pilot shape changed');return m;};
get(2).mapper.array=rows.map(r=>({sourceId:r.sourceId}));
const code=get(13).mapper.codeEditorJavascript,tail='return prepareUrlLabelRepair({...input,source:readSourceResponse(input.source)});';
if(!code.endsWith(tail))throw Error('Preparation code changed');
get(13).mapper.codeEditorJavascript=code.slice(0,-tail.length)+`try {return {...prepareUrlLabelRepair({...input,source:readSourceResponse(input.source)}),status:'prepared',sourceId:input.mapping.sourceContactId};}catch(error){return {status:'held_before_write',reason:String(error.message),sourceId:input.mapping.sourceContactId,writesApplied:false};}`;
get(16).filter={name:'Only freshly verified label-only repairs',conditions:[[{a:'{{13.result.status}}',o:'text:equal',b:'prepared'}]]};
b.name='Contacts sync — reviewed website label repairs';process.stdout.write(JSON.stringify(b,null,2)+'\n');
