const bundle=require('../code/bundle-delete-transaction');
function enableDeletion(blueprint){
 const b=JSON.parse(JSON.stringify(blueprint)),walk=f=>f.flatMap(m=>[m,...(m.routes||[]).flatMap(r=>walk(r.flow))]),at=id=>walk(b.flow).find(m=>m.id===id),clone=x=>JSON.parse(JSON.stringify(x));
 if(at(401))throw Error('Deletion already installed');
 const book=at(63).mapper.input.find(x=>x.name==='bookUrl').value;
 const gate=(a,b)=>({name:'Guarded deletion',conditions:[[{a,b,o:'text:equal'}]]});
 const code=(id,js,input)=>({id,module:'code:ExecuteCode',version:1,mapper:{language:'javascript',inputFormat:'editor',input:Object.entries(input).map(([name,value])=>({name,value})),codeEditorJavascript:bundle()+'\n'+js}});
 const inboxTemplate=clone(at(27));
 const inbox=(id,state,extra={})=>{const m=clone(inboxTemplate);m.id=id;m.mapper.data={state,...extra};return m;};
 const source=clone(at(11));source.id=401;delete source.filter;
 const target=clone(at(12));target.id=402;delete target.filter;target.mapper.stopOnHttpError=false;
 const args={event:'{{`2`}}',mapping:'{{`8`}}',bookUrl:book,response:'{{`401`}}',statusCode:'{{402.statusCode}}',actual:'{{402.data}}',targetEtag:'{{402.headers.etag}}'};
 const prep=code(403,'return deletion.prepareDelete({...input,statusCode:Number(input.statusCode)});',args);
 const receipt=inbox(404,'{{if(403.result.status = "held"; "held_delete_conflict"; "delete_preflight")}}');
 const pending=inbox(406,'delete_pending',{writeReceiptJson:'{{403.result.receiptJson}}'});pending.filter=gate('{{403.result.status}}','delete_prepared');
 const mapPending=clone(at(28));mapPending.id=407;delete mapPending.filter;mapPending.mapper.data={state:'delete_pending',lastEventId:'{{2.eventId}}'};
 const del=clone(target);del.id=408;del.mapper.method='delete';del.mapper.headers=[{name:'If-Match',value:'{{403.result.receipt.beforeEtag}}'}];del.mapper.stopOnHttpError=false;
 const read=clone(target);read.id=409;
 const check=code(410,"return deletion.recoverDelete({...input,receipt:input.receipt,statusCode:Number(input.statusCode)});",{...args,receipt:'{{403.result.receipt}}',statusCode:'{{409.statusCode}}'});
 const doneMapping=(id,status)=>{const m=clone(at(28));m.id=id;m.filter=gate(status,'verified_deleted');m.mapper.data={state:'deleted',lastEventId:'{{2.eventId}}',lastVerifiedAt:'{{now}}'};return m;};
 const done=inbox(412,'verified_deleted');
 const flow=[at(6),source,target,prep,receipt,{id:405,module:'builtin:BasicRouter',version:1,mapper:null,routes:[{flow:[pending,mapPending,del,read,check,inbox(411,'{{if(410.result.status = "verified_deleted"; "delete_verified_mapping_pending"; "delete_pending")}}'),doneMapping(413,'{{410.result.status}}'),done]},{flow:[doneMapping(414,'{{403.result.status}}'),inbox(415,'verified_deleted')]}]}];
 const r=at(3).routes.find(r=>r.flow.some(m=>m.id===6));r.flow=flow;
 // Repeated deletion delivery reconciles only: never retries DELETE.
 const mapRead=clone(at(8));mapRead.id=421;mapRead.filter={name:'Unfinished deletion receipt',conditions:['delete_pending','delete_verified_mapping_pending'].map(s=>[{a:'{{61.state}}',b:s,o:'text:equal'},{a:'{{61.sourceContactId}}',b:'{{2.data.contactId}}',o:'text:equal'},{a:'{{61.eventId}}',b:'{{2.eventId}}',o:'text:equal'}])};
 const checkIdentity=code(422,"try{const receipt=JSON.parse(input.receipt);return {eligible:deletion.deleteIdentity(input)&&receipt.operation==='delete'&&receipt.eventId===input.event.eventId&&receipt.uid===input.mapping.targetUid};}catch{return {eligible:false};}",{event:'{{`2`}}',mapping:'{{`421`}}',bookUrl:book,receipt:'{{61.writeReceiptJson}}'});
 const fresh=clone(source);fresh.id=423;fresh.mapper.body='{"contactIds":["{{421.sourceContactId}}"]}';fresh.filter={name:'Exact saved delete receipt',conditions:[[{a:'{{422.result.eligible}}',b:true,o:'boolean:equal'}]]};
 const get=clone(target);get.id=424;get.mapper.url=book+'{{last(split(421.targetHref; "/"))}}';
 const recovered=code(425,"try{return deletion.recoverDelete({...input,receipt:JSON.parse(input.receipt),statusCode:Number(input.statusCode)});}catch{return {status:'held'};}",{event:'{{`2`}}',mapping:'{{`421`}}',bookUrl:book,response:'{{`423`}}',receipt:'{{61.writeReceiptJson}}',statusCode:'{{424.statusCode}}'});
 const saved=doneMapping(426,'{{425.result.status}}');saved.mapper.key='contactsplus-primary:{{421.sourceContactId}}';
 const old=at(60).routes[1].flow;const rest=old.splice(1);old.push({id:420,module:'builtin:BasicRouter',version:1,mapper:null,routes:[{flow:rest},{flow:[mapRead,checkIdentity,fresh,get,recovered,saved,inbox(427,'verified_deleted')]}]});
 return b;
}
module.exports=enableDeletion;
