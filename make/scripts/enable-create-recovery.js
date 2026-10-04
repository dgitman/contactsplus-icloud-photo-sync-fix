const fs=require('fs'),path=require('path'),bundle=require('../code/bundle-create-transaction');
function enableCreateRecovery(blueprint){
 const b=JSON.parse(JSON.stringify(blueprint)),walk=f=>f.flatMap(m=>[m,...(m.routes||[]).flatMap(r=>walk(r.flow))]),at=id=>walk(b.flow).find(m=>m.id===id),clone=x=>JSON.parse(JSON.stringify(x));
 if(at(431))throw Error('Create recovery already installed');
 const book=at(63).mapper.input.find(x=>x.name==='bookUrl').value,prefix=at(66).mapper.input.find(x=>x.name==='photoPathPrefix').value;
 const lib=bundle()+'\n'+fs.readFileSync(path.join(__dirname,'../code/read-source-response.js'),'utf8').replace('module.exports=readSourceResponse;','');
 const code=(id,js,input)=>({id,module:'code:ExecuteCode',version:1,mapper:{language:'javascript',inputFormat:'editor',input:Object.entries(input).map(([name,value])=>({name,value})),codeEditorJavascript:lib+'\n'+js}});
 const states=['create_attempted','held_create_readback','held_create_photo_readback','create_verified_mapping_pending'];
 const m=clone(at(8));m.id=431;m.filter={name:'Unfinished creation receipt',conditions:states.map(s=>[{a:'{{61.state}}',b:s,o:'text:equal'},{a:'{{61.eventId}}',b:'{{2.eventId}}',o:'text:equal'},{a:'{{61.sourceContactId}}',b:'{{2.data.contactId}}',o:'text:equal'}])};
 const gate=code(432,`try{const r=JSON.parse(input.receipt),m=input.mapping,e=input.event;return {eligible:e.triggerId==='contact.added'&&r.version===1&&r.operation==='create'&&r.state==='create_attempted'&&r.eventId===e.eventId&&r.sourceAccountId==='contactsplus-primary'&&r.sourceContactId===e.data.contactId&&m.sourceContactId===r.sourceContactId&&m.sourceAccountId===r.sourceAccountId&&['create_attempted','verified'].includes(m.state)&&r.uid===creation.creationUid(r.sourceAccountId,r.sourceContactId)&&m.targetUid===r.uid&&r.targetHref===input.bookUrl+r.uid+'.vcf'&&m.targetHref===r.targetHref};}catch{return {eligible:false};}`,{receipt:'{{61.writeReceiptJson}}',mapping:'{{`431`}}',event:'{{`2`}}',bookUrl:book});
 const src=clone(at(11));src.id=433;src.mapper.body='{"contactIds":["{{431.sourceContactId}}"]}';src.filter={name:'Exact creation receipt identity',conditions:[[{a:'{{432.result.eligible}}',b:true,o:'boolean:equal'}]]};
 const get=clone(at(12));get.id=434;delete get.filter;get.mapper.url=book+'{{431.targetUid}}.vcf';get.mapper.stopOnHttpError=false;
 const input={receipt:'{{61.writeReceiptJson}}',source:'{{`433`}}',statusCode:'{{434.statusCode}}',actual:'{{434.data}}',targetEtag:'{{434.headers.etag}}',photoPathPrefix:prefix};
 const args="const args={...input,reservation:JSON.parse(input.receipt),source:readSourceResponse(input.source),statusCode:Number(input.statusCode)};";
 const verify=code(435,`try{${args}const r=creation.reconcileCreateTransaction(args);return r.status==='verified_create'?r:creation.planCreatePhotoRecovery(args);}catch(e){return {status:'held',reason:String(e.message)};}`,input);
 const map=(id,ref)=>{const m=clone(at(220));m.id=id;m.mapper.key='contactsplus-primary:{{431.sourceContactId}}';m.filter={name:'Verified recovered creation',conditions:[[{a:'{{'+ref+'.result.status}}',b:'verified_create',o:'text:equal'}]]};m.mapper.data=JSON.parse(JSON.stringify(m.mapper.data).replaceAll('218.result',ref+'.result'));return m;};
 const done=id=>{const m=clone(at(221));m.id=id;m.mapper.data.state='verified_create_recovered';return m;};
 const download=clone(at(341));download.id=439;download.mapper.url='{{435.result.url}}';download.filter={name:'Verified URI plan',conditions:[[{a:'{{435.result.status}}',b:'uri_photo_download',o:'text:equal'}]]};
 const decode=clone(at(342));decode.id=440;decode.mapper.data='{{439.data}}';decode.filter.conditions[0][0].a='{{439.statusCode}}';
 const meta=clone(at(343));meta.id=441;meta.mapper={data:'{{440.data}}',fileName:'{{440.fileName}}'};
 const finish=code(442,`try{${args}return creation.finishCreatePhotoRecovery({...args,download:{requestedUrl:input.url,statusCode:Number(input.downloadStatus),decoded:true,imageBase64:input.b64,width:Number(input.width),height:Number(input.height)}});}catch(e){return {status:'held',reason:String(e.message)};}`,{...input,url:'{{435.result.url}}',downloadStatus:'{{439.statusCode}}',b64:'{{base64(439.data)}}',width:'{{441.width}}',height:'{{441.height}}'});
 at(420).routes.push({flow:[m,gate,src,get,verify,{id:436,module:'builtin:BasicRouter',version:1,mapper:null,routes:[{flow:[map(437,435),done(438)]},{flow:[download,decode,meta,finish,map(443,442),done(444)]}]}]});
 // Reuse the exact read-only recovery router for bounded maintenance sweeps.
 const maintenance=at(71).routes[1].flow,router=clone(at(420));router.routes=router.routes.slice(1);
 const originalIds=walk([router]).map(m=>m.id),ids=Object.fromEntries(originalIds.map(id=>[id,id+1000]));ids[61]=161;ids[2]=73;
 let s=JSON.stringify(router).replace(/\{\{[^}]*\}\}/g,x=>x.replace(/\{\{`2`\}\}/g,'{{73.result}}').replace(/(?<![A-Za-z0-9_])2\./g,'73.result.').replace(/(?<![A-Za-z0-9_])(\d+)(?=\.)/g,(x,n)=>ids[n]||n).replace(/`(\d+)`/g,(x,n)=>'`'+(ids[n]||n)+'`'));
 const copied=JSON.parse(s);function renumber(f){for(const m of f){m.id=ids[m.id]||m.id;for(const r of m.routes||[])renumber(r.flow);}}renumber([copied]);
 const original=maintenance.splice(maintenance.findIndex(m=>m.id===162));copied.routes.unshift({flow:original});maintenance.push(copied);
 const allStates=['prepared_shared_fields','photo_write_pending','delete_pending','delete_verified_mapping_pending',...states];
 at(72).mapper.filter=allStates.map(s=>[{a:'state',b:s,o:'text:equal'},{a:'writeReceiptJson',o:'exist'},{a:'sourceAccountId',b:'contactsplus-primary',o:'text:equal'}]);
 at(73).mapper.codeEditorJavascript=`const row=input.record,d=row?.data;if(!d||row.key!=='contactsplus-primary:'+d.eventId||d.sourceAccountId!=='contactsplus-primary'||!${JSON.stringify(allStates)}.includes(d.state)||!d.eventId||!d.sourceContactId||!['contact.added','contact.updated','contact.deleted'].includes(d.triggerId)||!d.writeReceiptJson)return {valid:false};return {valid:true,eventId:d.eventId,triggerId:d.triggerId,data:{contactId:d.sourceContactId}};`;
 return b;
}
module.exports=enableCreateRecovery;
