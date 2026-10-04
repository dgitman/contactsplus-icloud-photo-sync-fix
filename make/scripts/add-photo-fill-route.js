const bundle=require('../code/bundle-photo-fill');
function addPhotoFillRoute(blueprint,pilot){
 const b=JSON.parse(JSON.stringify(blueprint)),entry=b.flow.find(x=>x.id===71)?.routes[0].flow||b.flow,router=(entry.find(x=>x.id===60)?.routes[0].flow||entry).find(x=>x.id===3);
 const route=router.routes.find(r=>r.flow.some(m=>m.id===5));
 if(route.flow.some(x=>x.id===30))throw Error('Photo route already installed');
 const old=route.flow.splice(route.flow.findIndex(x=>x.id===16));
 const template=JSON.parse(JSON.stringify(pilot.flow));
 const ids={4:32,5:33,6:34,7:35,9:36,10:37,11:39,12:40,13:41,14:42,15:43,16:44,17:45};
 const map=s=>s.replace(/\{\{[^}]*\}\}/g,expression=>expression.replace(/(?<![A-Za-z0-9_])(\d+)(?=\.)/g,(all,n)=>ids[n]||n).replace(/`(\d+)`/g,(all,n)=>'`'+(ids[n]||n)+'`'));
 const modules=template.filter(m=>ids[m.id]).map(m=>{const r=JSON.parse(map(JSON.stringify(m)));r.id=ids[m.id];return r;});
 const at=id=>modules.find(m=>m.id===id),code=bundle();
 const baseline="const baseline=typeof input.baseline==='string'?JSON.parse(input.baseline):input.baseline;";
 const gate={id:31,module:'code:ExecuteCode',version:1,parameters:{},filter:{name:'Photo-only or unchanged source',conditions:[[{a:'{{13.result.status}}',b:'conflict',o:'text:equal'}],[{a:'{{13.result.status}}',b:'unchanged',o:'text:equal'}]]},mapper:{language:'javascript',inputFormat:'editor',input:[{name:'source',value:'{{`11`}}'},{name:'sourceContactId',value:'{{8.sourceContactId}}'},{name:'uid',value:'{{8.targetUid}}'},{name:'existingVcard',value:'{{12.data}}'},{name:'baseline',value:'{{8.baselineJson}}'}],codeEditorJavascript:code+'\ntry{'+baseline+'return photoFillGate({...input,source:readSourceResponse(input.source),baseline});}catch(e){return {status:"held",reason:String(e.message)};}'}};
 const inbox=(id,state)=>({id,module:'datastore:UpdateRecord',version:1,parameters:{...route.flow.find(m=>m.id===14).parameters},mapper:{key:'contactsplus-primary:{{2.eventId}}',upsert:false,overwriteArrays:false,data:{state}}});
 at(32).mapper.url='{{31.result.primaryUrl}}';at(32).mapper.stopOnHttpError=false;
 at(32).filter={name:'Verified missing photo only',conditions:[[{a:'{{31.result.status}}',b:'eligible',o:'text:equal'}]]};
 at(33).filter={name:'Source download succeeded',conditions:[[{a:'{{32.statusCode}}',b:200,o:'number:equal'}]]};
 at(35).parameters={...route.flow.find(m=>m.id===11).parameters};
 at(35).mapper={url:'/v1/contacts.get',body:'{"contactIds":["{{8.sourceContactId}}"]}'};
 for(const id of [36,39,40]){
  at(id).parameters={...route.flow.find(m=>m.id===12).parameters};
  at(id).mapper.url=route.flow.find(m=>m.id===12).mapper.url;
 }
 at(37).mapper.input=[{name:'source',value:'{{`35`}}'},{name:'selection',value:'{{31.result}}'},{name:'sourceContactId',value:'{{8.sourceContactId}}'},{name:'uid',value:'{{8.targetUid}}'},{name:'baseline',value:'{{8.baselineJson}}'},{name:'card',value:'{{36.data}}'},{name:'etag',value:'{{36.headers.etag}}'},{name:'b64',value:'{{base64(33.data)}}'},{name:'width',value:'{{34.width}}'},{name:'height',value:'{{34.height}}'}];
 at(37).mapper.codeEditorJavascript=code+'\n'+baseline+`
const source=readSourceResponse(input.source),selection=typeof input.selection==='string'?JSON.parse(input.selection):input.selection;
const gate=photoFillGate({source,sourceContactId:input.sourceContactId,uid:input.uid,existingVcard:input.card,baseline});
if(gate.status!=='eligible')return {status:'held',reason:gate.reason};
const byteHash=crypto.createHash('sha256').update(Buffer.from(input.b64,'base64')).digest('hex');
return preparePhotoFill({source,sourceContactId:input.sourceContactId,uid:input.uid,existingVcard:input.card,targetEtag:input.etag,selection,download:{requestedUrl:selection.primaryUrl,statusCode:200,imageBase64:input.b64,decodedImage:{decoded:true,mime:'image/jpeg',width:Number(input.width),height:Number(input.height),byteHash}}});`;
 at(39).filter={name:'Prepared missing-photo fill only',conditions:[[{a:'{{37.result.status}}',b:'prepared-only',o:'text:equal'}]]};
 at(45).mapper.input.push({name:'source',value:'{{`35`}}'},{name:'baseline',value:'{{8.baselineJson}}'});
 at(45).mapper.codeEditorJavascript=code+'\n'+baseline+`
return advancePhotoBaseline({source:readSourceResponse(input.source),baseline,prepared:typeof input.prepared==='string'?JSON.parse(input.prepared):input.prepared,actual:input.actual,targetEtag:input.targetEtag,download:{propertyHash:input.propertyHash,statusCode:200,decoded:true,width:Number(input.width),height:Number(input.height),imageBase64:input.b64}});`;
 const mapping=JSON.parse(JSON.stringify(old.find(m=>m.id===28)));mapping.id=46;
 mapping.mapper.data={baselineJson:'{{45.result.baselineJson}}',targetEtag:'{{45.result.targetEtag}}',sourceEtag:'{{37.result.sourceEtag}}',lastEventId:'{{2.eventId}}',lastVerifiedAt:'{{now}}'};
 const flow=[gate,inbox(48,'{{if(31.result.status = "eligible"; "photo_download_pending"; "held_photo_check")}}'),...modules];
 flow.splice(flow.findIndex(m=>m.id===33),0,inbox(49,'{{if(32.statusCode = 200; "photo_decode_pending"; "held_source_photo_unavailable")}}'));
 flow.splice(flow.findIndex(m=>m.id===39),0,inbox(38,'{{if(37.result.status = "prepared-only"; "photo_write_pending"; "held_photo_preflight")}}'));
 flow.push(mapping,inbox(47,'verified_photo_fill'));
 route.flow.push({id:30,module:'builtin:BasicRouter',version:1,mapper:null,routes:[{flow:old},{flow}]});
 return b;
}
module.exports=addPhotoFillRoute;
if(require.main===module){const fs=require('node:fs');console.log(JSON.stringify(addPhotoFillRoute(JSON.parse(fs.readFileSync(process.argv[2])),JSON.parse(fs.readFileSync(process.argv[3])).blueprint),null,2));}
