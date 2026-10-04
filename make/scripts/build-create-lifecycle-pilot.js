const bundle=require('../code/bundle-create-transaction');
function build({bookUrl='https://icloud-carddav.example.invalid/book/',storeId,connectionId,keychainId,nonce='REPLACE_WITH_FRESH_NONCE'}={}){
 if(!/^[a-z0-9-]+$/i.test(nonce))throw Error('Alphanumeric nonce required');
 const code=(id,js,input=[])=>({id,module:'code:ExecuteCode',version:1,mapper:{language:'javascript',inputFormat:'editor',input,codeEditorJavascript:js}});
 const arg=(name,value)=>({name,value}),key='creation-pilot:'+nonce;
 const ds=(id,op,mapper)=>({id,module:'datastore:'+op,version:1,parameters:storeId?{datastore:storeId}:{},mapper:{key,...mapper}});
 const http=(id,method,extra={})=>({id,module:'http:MakeRequest',version:4,parameters:{authenticationType:'basicAuth',...(keychainId?{basicAuthKeychain:keychainId}:{})},mapper:{url:'{{3.result.reservation.targetHref}}',method,shareCookies:false,parseResponse:false,allowRedirects:false,stopOnHttpError:false,requestCompressedContent:false,...extra}});
 const query=id=>({id,module:'app#icloud-carddav-sync-ctnuju:queryAddressBook',version:1,parameters:connectionId?{__IMTCONN__:connectionId}:{},mapper:{method:'REPORT',body:'{{1.result.plan.query}}'}});
 const fixture=`const source={contactId:${JSON.stringify(key)},etag:'synthetic-v1',contactData:{name:{givenName:'Codex',familyName:${JSON.stringify('CreationPilot'+nonce)}},emails:[{value:${JSON.stringify(nonce+'@example.invalid')}}],photos:[],notes:'Disposable creation lifecycle test'}};const event={eventId:${JSON.stringify(key)},triggerId:'contact.added',data:{contactId:source.contactId}};`;
 const flow=[
 code(1,bundle()+fixture+`return {source,event,plan:creation.newContactQuery({source,event})};`),query(2),
 code(3,bundle()+`const r=creation.prepareCreateTransaction({...input,lookupPolicyEnabled:true,sourceAccountId:'creation-pilot',checkedAt:Date.now(),now:Date.now()});if(r.status!=='reservation_prepared')throw Error('Creation held: '+r.reason);return {...r,reservationJson:JSON.stringify(r.reservation)};`,[arg('source','{{1.result.source}}'),arg('event','{{1.result.event}}'),arg('plan','{{1.result.plan}}'),arg('response','{{`2`}}'),arg('bookUrl',bookUrl)]),
 ds(4,'AddRecord',{overwrite:false,data:{sourceAccountId:'creation-pilot',sourceContactId:'{{1.result.source.contactId}}',targetHref:'{{3.result.reservation.targetHref}}',targetUid:'{{3.result.reservation.uid}}',state:'create_reserved',baselineJson:'{{3.result.reservationJson}}'}}),
 ds(5,'GetRecord',{returnWrapped:false}),
 code(6,bundle()+`const reservation=JSON.parse(input.saved);const r=creation.prepareFirstCreateAttempt({...input,reservation,now:Date.now()});if(r.status!=='attempt_marker_prepared')throw Error('Attempt held: '+r.reason);return {...r,attemptJson:JSON.stringify(r.attemptedReservation)};`,[arg('saved','{{5.baselineJson}}'),arg('prepared','{{3.result}}'),arg('source','{{1.result.source}}'),arg('event','{{1.result.event}}')]),
 ds(7,'UpdateRecord',{upsert:false,overwriteArrays:false,data:{state:'create_attempted',baselineJson:'{{6.result.attemptJson}}'}}),ds(8,'GetRecord',{returnWrapped:false}),
 code(9,`if(input.state!=='create_attempted'||JSON.stringify(JSON.parse(input.saved))!==JSON.stringify(input.expected))throw Error('Attempt not durably recorded');return {ready:true};`,[arg('state','{{8.state}}'),arg('saved','{{8.baselineJson}}'),arg('expected','{{6.result.attemptedReservation}}')]),
 http(10,'put',{headers:[{name:'If-None-Match',value:'*'}],contentType:'custom',contentTypeValue:'text/vcard; charset=utf-8',rawBodyContent:'{{6.result.request.body}}'}),http(11,'get'),
 code(12,bundle()+`if(Number(input.putStatus)!==201)throw Error('Create did not return 201');const r=creation.reconcileCreateTransaction({...input,reservation:JSON.parse(input.saved),statusCode:Number(input.statusCode)});if(r.status!=='verified_create')throw Error('Readback held: '+r.reason);return r;`,[arg('putStatus','{{10.statusCode}}'),arg('saved','{{8.baselineJson}}'),arg('source','{{1.result.source}}'),arg('statusCode','{{11.statusCode}}'),arg('actual','{{11.data}}'),arg('targetEtag','{{11.headers.etag}}')]),
 query(13),code(14,bundle()+`const r=creation.reviewNewContactQuery(input);if(r.status!=='held'||r.reason!=='existing_or_incomplete_results')throw Error('Existing card not held');return {duplicateHeld:true};`,[arg('source','{{1.result.source}}'),arg('event','{{1.result.event}}'),arg('plan','{{1.result.plan}}'),arg('response','{{`13`}}')]),
 ds(15,'UpdateRecord',{upsert:false,overwriteArrays:false,data:{state:'verified',targetEtag:'{{12.result.mapping.targetEtag}}',sourceEtag:'{{12.result.mapping.sourceEtag}}',baselineJson:'{{12.result.mapping.baselineJson}}'}}),
 http(16,'delete',{headers:[{name:'If-Match',value:'{{11.headers.etag}}'}]}),http(17,'get'),
 code(18,`if(Number(input.status)!==404||![200,204].includes(Number(input.deleted)))throw Error('Cleanup unconfirmed');return {verifiedCreation:true,duplicateHeld:true,deleted:true};`,[arg('status','{{17.statusCode}}'),arg('deleted','{{16.statusCode}}')]),ds(19,'DeleteRecord',{})];
 return {name:'Disposable guarded creation lifecycle',metadata:{version:1,scenario:{sequential:true}},flow};
}
module.exports=build;
if(require.main===module)console.log(JSON.stringify(build(),null,2));
