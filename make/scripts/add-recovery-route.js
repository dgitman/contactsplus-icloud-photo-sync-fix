const fs=require('node:fs'),path=require('node:path');
const bundle=require('../code/bundle-write-recovery');
function addRecoveryRoute(blueprint){
 const b=JSON.parse(JSON.stringify(blueprint));
 if(b.flow.some(x=>x.id===60))throw Error('Recovery route already installed');
 const at=id=>{function find(flow){for(const m of flow){if(m.id===id)return m;for(const r of m.routes||[]){const n=find(r.flow);if(n)return n;}}}const m=find(b.flow);if(!m)throw Error('Missing module '+id);return JSON.parse(JSON.stringify(m));};
 const inbox=at(14),mapping=at(28),source=at(11),target=at(12);
 const bookUrl=target.mapper.url.split('{{')[0];if(!bookUrl.endsWith('/'))throw Error('Fixed book URL required');
 const code=(id,input,body)=>({id,module:'code:ExecuteCode',version:1,mapper:{language:'javascript',inputFormat:'editor',input:Object.entries(input).map(([name,value])=>({name,value})),codeEditorJavascript:body}});
 const eq=(a,b,o='text:equal')=>({a,b,o});
 const gate=(name,conditions)=>({name,conditions:[conditions]});
 const eventRead=at(8);eventRead.id=61;eventRead.parameters={...inbox.parameters};eventRead.mapper.key='contactsplus-primary:{{2.eventId}}';eventRead.filter=gate('Repeated event only',[eq('{{9.exist}}',true,'boolean:equal')]);
 const mapRead=at(8);mapRead.id=62;mapRead.filter={name:'Unfinished shared receipt only',conditions:['prepared_shared_fields','held_recovery'].map(s=>[eq('{{61.state}}',s),eq('{{61.sourceContactId}}','{{2.data.contactId}}'),eq('{{61.eventId}}','{{2.eventId}}'),{a:'{{61.writeReceiptJson}}',o:'exist'}])};
 const gateCode=fs.readFileSync(path.join(__dirname,'../code/recovery-event-gate.js'),'utf8').replace('module.exports=recoveryEventGate;','');
 const preflight=code(63,{event:'{{`2`}}',inbox:'{{`61`}}',mapping:'{{`62`}}',bookUrl},gateCode+'\nreturn recoveryEventGate(input);');
 source.id=64;source.mapper.body='{"contactIds":["{{62.sourceContactId}}"]}';source.filter=gate('Verified receipt identity',[eq('{{63.result.eligible}}',true,'boolean:equal')]);
 target.id=65;target.mapper.url=bookUrl+'{{62.targetUid}}.vcf';target.mapper.stopOnHttpError=false;target.filter=gate('Source read succeeded',[eq('{{64.statusCode}}',200,'number:equal')]);
 const check=code(66,{receipt:'{{61.writeReceiptJson}}',eventId:'{{2.eventId}}',sourceContactId:'{{62.sourceContactId}}',uid:'{{62.targetUid}}',source:'{{`64`}}',baseline:'{{62.baselineJson}}',statusCode:'{{65.statusCode}}',actual:'{{65.data}}',targetEtag:'{{65.headers.etag}}'},bundle()+`\ntry{return reconcileSharedWrite({...input,receipt:JSON.parse(input.receipt),baseline:JSON.parse(input.baseline),source:readSourceResponse(input.source),statusCode:Number(input.statusCode)});}catch(e){return {status:'held',reason:String(e.message),writesAllowed:false};}`);
 mapping.id=68;mapping.filter=gate('Readback verified recovery',[eq('{{66.result.status}}','verified_recovered')]);mapping.mapper.data={baselineJson:'{{66.result.baselineJson}}',targetEtag:'{{66.result.targetEtag}}',sourceEtag:'{{66.result.sourceEtag}}',lastEventId:'{{2.eventId}}',lastVerifiedAt:'{{now}}'};
 const success=at(19);success.id=69;success.mapper.data.state='verified_shared_fields_recovered';
 const held=at(19);held.id=70;held.filter=gate('Uncertain recovery remains held',[eq('{{66.result.status}}','held')]);held.mapper.data.state='held_recovery';
 const recovery=[eventRead,mapRead,preflight,source,target,check,{id:67,module:'builtin:BasicRouter',version:1,mapper:null,routes:[{flow:[mapping,success]},{flow:[held]}]}];
 const split=b.flow.findIndex(x=>x.id===9)+1;if(!split)throw Error('Missing deduplication');const normal=b.flow.splice(split);
 b.flow.push({id:60,module:'builtin:BasicRouter',version:1,mapper:null,routes:[{flow:normal},{flow:recovery}]});return b;
}
module.exports=addRecoveryRoute;
