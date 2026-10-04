const bundle=require('../code/bundle-photo-fill');
function build(blueprint,{nonce='REPLACE_WITH_FRESH_NONCE'}={}){
 if(!/^[a-z0-9-]+$/i.test(nonce))throw Error('Alphanumeric nonce required');
 const walk=f=>f.flatMap(m=>[m,...(m.routes||[]).flatMap(r=>walk(r.flow))]),ms=walk(blueprint.flow),at=id=>ms.find(m=>m.id===id),copy=id=>JSON.parse(JSON.stringify(at(id)));
 const uid='codex-photo-replace-'+nonce,sourceId='photo-replacement-pilot-'+nonce,eventId='photo-replacement-event-'+nonce;
 const book=at(63).mapper.input.find(x=>x.name==='bookUrl').value;
 const b64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aU1kAAAAASUVORK5CYII=';
 const before='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:'+uid+'\r\nN:ReplacementPilot'+nonce+';Codex;;;\r\nFN:Codex ReplacementPilot'+nonce+'\r\nNOTE:Disposable photo replacement test\r\nPHOTO;ENCODING=b;TYPE=PNG:'+b64+'\r\nEND:VCARD\r\n';
 const old={contactId:sourceId,etag:'old-version',contactData:{photos:[{value:'https://img.contactsplus.com/old-pilot'}]}};
 const source={...old,etag:'new-version',contactData:{photos:[{value:'https://img.contactsplus.com/new-pilot'}]}};
 const code=(id,js,input=[])=>({id,module:'code:ExecuteCode',version:1,mapper:{language:'javascript',inputFormat:'editor',input,codeEditorJavascript:js}});
 const arg=(name,value)=>({name,value});
 const put=copy(39);put.id=500;delete put.filter;put.mapper.url=book+uid+'.vcf';put.mapper.headers=[{name:'If-None-Match',value:'*'}];put.mapper.rawBodyContent=before;
 const get=copy(40);get.id=501;delete get.filter;get.mapper.url=book+uid+'.vcf';
 const identity=code(8,bundle()+`\nif(Number(input.created)!==201)throw Error('Disposable create failed');const old=${JSON.stringify(old)},uid=${JSON.stringify(uid)};const baseline=snapshot({sourceContactId:old.contactId,uid,existingVcard:input.card,contactData:old.contactData});if(!input.card.includes('Disposable photo replacement test'))throw Error('Wrong test card');baseline.photoBaseline={version:1,sourceContactId:old.contactId,uid,sourceContentHash:crypto.createHash('sha256').update(Buffer.from(${JSON.stringify(b64)},'base64')).digest('hex'),targetPropertyHash:baseline.fields.photos.target};return {sourceContactId:old.contactId,targetUid:uid,targetHref:${JSON.stringify(book+uid+'.vcf')},baselineJson:JSON.stringify(baseline)};`,[arg('card','{{501.data}}'),arg('created','{{500.statusCode}}')]);
 const seed={id:502,module:'datastore:AddRecord',version:1,parameters:{...at(8).parameters},mapper:{key:'contactsplus-primary:'+sourceId,overwrite:false,data:{state:'verified',sourceAccountId:'contactsplus-primary',sourceContactId:sourceId,targetUid:uid,targetHref:book+uid+'.vcf',baselineJson:'{{8.result.baselineJson}}'}}};
 const inbox=copy(10);delete inbox.filter;inbox.mapper.data.state='pending';
 const event=code(2,'return '+JSON.stringify({eventId,triggerId:'contact.updated',data:{contactId:sourceId}})+';');
 const sourceModule=id=>code(id,'return '+JSON.stringify(source)+';');
 const target=copy(12);delete target.filter;target.mapper.url=book+uid+'.vcf';
 const phase=copy(30).routes.find(r=>r.flow.some(m=>m.id===31)).flow;
 phase[phase.findIndex(m=>m.id===35)]=sourceModule(35);
 phase.find(m=>m.id===32).mapper.url='https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png';
 const flow=[put,get,identity,seed,event,inbox,sourceModule(11),target,code(13,"return {status:'conflict'};"),...phase];
 function remap(v){if(typeof v==='string')return v.replace(/\{\{[^}]*\}\}/g,e=>e.replace(/`(2|8|11|35)`/g,'$1.result').replace(/(?<![\w`])(2|8|11|35)\.(?!result)/g,'$1.result.'));if(Array.isArray(v))return v.map(remap);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,remap(x)]));return v;}
 return {name:'Disposable photo replacement verification',metadata:{version:1},flow:remap(flow)};
}
module.exports=build;
