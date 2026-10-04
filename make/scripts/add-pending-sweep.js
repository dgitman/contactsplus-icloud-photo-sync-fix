// On-demand maintenance branch in the existing webhook scenario. No timer,
// additional scenario, incoming contact payload, or contact writer is added.
function addPendingSweep(blueprint){
 const b=JSON.parse(JSON.stringify(blueprint));if(b.flow.some(x=>x.id===71))throw Error('Sweep already installed');
 const recovery=b.flow.find(x=>x.id===60)?.routes[1].flow;if(!recovery)throw Error('Recovery route required');
 const source=recovery.find(x=>x.id===61),ids={61:161,62:162,63:163,64:164,65:165,66:166,67:167,68:168,69:169,70:170};
 const remap=s=>s.replace(/\{\{[^}]*\}\}/g,expression=>expression.replace(/\{\{`2`\}\}/g,'{{73.result}}').replace(/(?<![A-Za-z0-9_])2\./g,'73.result.').replace(/(?<![A-Za-z0-9_])(\d+)(?=\.)/g,(all,n)=>ids[n]||n).replace(/`(\d+)`/g,(all,n)=>'`'+(ids[n]||n)+'`'));
 const clone=JSON.parse(remap(JSON.stringify(recovery)));function renumber(flow){for(const x of flow){x.id=ids[x.id]||x.id;for(const r of x.routes||[])renumber(r.flow);}}renumber(clone);
 clone[0].filter={name:'Valid stored event identity',conditions:[[{a:'{{73.result.valid}}',o:'boolean:equal',b:true}]]};
 const search={id:72,module:'datastore:SearchRecord',version:1,parameters:{...source.parameters,continueWhenNoRes:false,limit:25},filter:{name:'Explicit pending-recovery command',conditions:[[{a:'{{1.recoverPending}}',o:'boolean:equal',b:true}]]},mapper:{filter:[[{a:'state',o:'text:equal',b:'prepared_shared_fields'},{a:'writeReceiptJson',o:'exist'},{a:'sourceAccountId',o:'text:equal',b:'contactsplus-primary'}]],sort:[{key:'receivedAt',order:1}]}};
 const event={id:73,module:'code:ExecuteCode',version:1,mapper:{language:'javascript',inputFormat:'editor',input:[{name:'record',value:'{{`72`}}'}],codeEditorJavascript:`const row=input.record, d=row?.data;
if(!d||row.key!=='contactsplus-primary:'+d.eventId||d.sourceAccountId!=='contactsplus-primary'||d.state!=='prepared_shared_fields'||!d.eventId||!d.sourceContactId||!['contact.added','contact.updated'].includes(d.triggerId)||!d.writeReceiptJson)return {valid:false};
return {valid:true,eventId:d.eventId,triggerId:d.triggerId,data:{contactId:d.sourceContactId}};`}};
 const normal=b.flow.splice(1);normal[0].filter={name:'Normal event delivery',conditions:[[{a:'{{1.recoverPending}}',o:'boolean:notequal',b:true}]]};
 b.flow.push({id:71,module:'builtin:BasicRouter',version:1,mapper:null,routes:[{flow:normal},{flow:[search,event,...clone]}]});return b;
}
module.exports=addPendingSweep;
