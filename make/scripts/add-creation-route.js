const bundle=require('../code/bundle-create-transaction');
const fs=require('node:fs'),path=require('node:path');
function addCreationRoute(blueprint,{connectionId}={}){
 const b=JSON.parse(JSON.stringify(blueprint));
 const walk=f=>f.flatMap(m=>[m,...(m.routes||[]).flatMap(r=>walk(r.flow))]);
 const at=id=>walk(b.flow).find(m=>m.id===id),copy=id=>JSON.parse(JSON.stringify(at(id)));
 if(at(200))throw Error('Creation route already installed');
 if(!connectionId)throw Error('CardDAV connection required');
 const first=at(60).routes[0].flow,index=first.findIndex(m=>m.id===8);
 if(index<0||!at(10)||!at(12))throw Error('Expected intake layout');
 const existing=first.splice(index);
 const book=at(63)?.mapper.input.find(x=>x.name==='bookUrl')?.value;
 if(!book||!book.endsWith('/'))throw Error('Configured address book required');
 const sourceTemplate=existing.flatMap(w=>[w,...(w.routes||[]).flatMap(r=>walk(r.flow))]).find(m=>m.id===11);
 const httpTemplate=existing.flatMap(w=>[w,...(w.routes||[]).flatMap(r=>walk(r.flow))]).find(m=>m.id===12);
 const dsParams=existing[0].parameters;
 const eq=(a,b,o='text:equal')=>({a,b,o});
 const filter=(name,...conditions)=>({name,conditions:[conditions]});
 const arg=(name,value)=>({name,value});
 const source=id=>({...JSON.parse(JSON.stringify(sourceTemplate)),id,mapper:{url:'/v1/contacts.get',body:'{"contactIds":["{{2.data.contactId}}"]}'}});
 const code=(id,js,input)=>({id,module:'code:ExecuteCode',version:1,mapper:{language:'javascript',inputFormat:'editor',input,codeEditorJavascript:bundle()+'\n'+fs.readFileSync(path.join(__dirname,'../code/read-source-response.js'),'utf8').replace('module.exports=readSourceResponse;','')+'\n'+js}});
 const inbox=(id,state,extra={})=>({id,module:'datastore:UpdateRecord',version:1,parameters:{...at(10).parameters},mapper:{key:'contactsplus-primary:{{2.eventId}}',upsert:false,overwriteArrays:false,data:{state,...extra}}});
 const ds=(id,op,mapper)=>({id,module:'datastore:'+op,version:1,parameters:{...dsParams},mapper:{key:'contactsplus-primary:{{2.data.contactId}}',...mapper}});
 const http=(id,method,extra={})=>({...JSON.parse(JSON.stringify(httpTemplate)),id,filter:undefined,mapper:{...httpTemplate.mapper,url:'{{204.result.reservation.targetHref}}',method,stopOnHttpError:false,...extra}});
 const entry=source(201);entry.filter=filter('Unmapped added contacts only',eq('{{7.exist}}',false,'boolean:equal'),eq('{{2.triggerId}}','contact.added'));
 const flow=[entry,
 code(202,`try{return creation.newContactQuery({source:readSourceResponse(input.source),event:input.event});}catch(e){return {status:'held',reason:String(e.message)};}`,[arg('source','{{`201`}}'),arg('event','{{`2`}}')]),
 inbox(222,'{{if(202.result.status = "query_prepared"; "creation_query_pending"; "held_creation_identity")}}'),
 {id:203,module:'app#icloud-carddav-sync-ctnuju:queryAddressBook',version:1,parameters:{__IMTCONN__:connectionId},filter:filter('Bounded identity query only',eq('{{202.result.status}}','query_prepared')),mapper:{method:'REPORT',body:'{{202.result.query}}'}},
 code(204,`try{const r=creation.prepareCreateTransaction({...input,source:readSourceResponse(input.source),lookupPolicyEnabled:true,completeSource:true,checkedAt:Date.now(),now:Date.now()});return {...r,reservationJson:r.reservation?JSON.stringify(r.reservation):''};}catch(e){return {status:'held',reason:String(e.message)};}`,[arg('source','{{`201`}}'),arg('event','{{`2`}}'),arg('plan','{{202.result}}'),arg('response','{{`203`}}'),arg('bookUrl',book),arg('sourceAccountId','contactsplus-primary')]),
 inbox(205,'{{if(204.result.status = "reservation_prepared"; "create_reserved"; "held_creation_preflight")}}'),
 ds(206,'AddRecord',{overwrite:false,data:{sourceAccountId:'contactsplus-primary',sourceContactId:'{{2.data.contactId}}',targetUid:'{{204.result.reservation.uid}}',targetHref:'{{204.result.reservation.targetHref}}',state:'create_reserved',baselineJson:'{{204.result.reservationJson}}'}}),
 ds(207,'GetRecord',{returnWrapped:false}),source(208),
 code(209,`try{const r=creation.prepareFirstCreateAttempt({...input,source:readSourceResponse(input.source),reservation:JSON.parse(input.saved),now:Date.now()});return {...r,attemptJson:r.attemptedReservation?JSON.stringify(r.attemptedReservation):''};}catch(e){return {status:'held',reason:String(e.message)};}`,[arg('source','{{`208`}}'),arg('event','{{`2`}}'),arg('saved','{{207.baselineJson}}'),arg('prepared','{{204.result}}')]),
 inbox(210,'{{if(209.result.status = "attempt_marker_prepared"; "create_prepared"; "held_creation_changed")}}'),
 ds(211,'UpdateRecord',{upsert:false,overwriteArrays:false,data:{state:'create_attempted',baselineJson:'{{209.result.attemptJson}}'}}),ds(212,'GetRecord',{returnWrapped:false}),
 code(213,`if(input.state!=='create_attempted'||JSON.stringify(JSON.parse(input.saved))!==JSON.stringify(input.expected))throw Error('Attempt not durably recorded');return {ready:true};`,[arg('state','{{212.state}}'),arg('saved','{{212.baselineJson}}'),arg('expected','{{209.result.attemptedReservation}}')]),
 inbox(214,'create_attempted',{writeReceiptJson:'{{209.result.attemptJson}}'}),
 http(215,'put',{headers:[{name:'If-None-Match',value:'*'}],contentType:'custom',contentTypeValue:'text/vcard; charset=utf-8',rawBodyContent:'{{209.result.request.body}}'}),http(216,'get'),source(217),
 code(218,`try{if(![201,204].includes(Number(input.putStatus)))return {status:'held',reason:'create_response_unconfirmed'};return creation.reconcileCreateTransaction({...input,source:readSourceResponse(input.source),reservation:JSON.parse(input.saved),statusCode:Number(input.statusCode)});}catch(e){return {status:'held',reason:String(e.message)};}`,[arg('putStatus','{{215.statusCode}}'),arg('source','{{`217`}}'),arg('saved','{{212.baselineJson}}'),arg('statusCode','{{216.statusCode}}'),arg('actual','{{216.data}}'),arg('targetEtag','{{216.headers.etag}}')]),
 inbox(219,'{{if(218.result.status = "verified_create"; "create_verified_mapping_pending"; "held_create_readback")}}'),
 ds(220,'UpdateRecord',{upsert:false,overwriteArrays:false,data:{state:'verified',baselineJson:'{{218.result.mapping.baselineJson}}',targetEtag:'{{218.result.mapping.targetEtag}}',sourceEtag:'{{218.result.mapping.sourceEtag}}',lastEventId:'{{2.eventId}}',lastVerifiedAt:'{{now}}'}}),inbox(221,'verified_created')];
 flow.find(m=>m.id===206).filter=filter('Supported source and no duplicate candidates',eq('{{204.result.status}}','reservation_prepared'));
 flow.find(m=>m.id===211).filter=filter('Fresh source and first attempt only',eq('{{209.result.status}}','attempt_marker_prepared'));
 flow.find(m=>m.id===220).filter=filter('Exact creation readback only',eq('{{218.result.status}}','verified_create'));
 // Pending creations must not enter update routing as verified mappings.
 const known=walk(existing).find(m=>m.id===5);for(const conditions of known.filter.conditions)conditions.push(eq('{{8.state}}','verified'));
 first.push({id:200,module:'builtin:BasicRouter',version:1,mapper:null,routes:[{flow:existing},{flow}]});
 return b;
}
module.exports=addCreationRoute;
