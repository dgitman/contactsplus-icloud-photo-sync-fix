const fs=require('fs'),path=require('path');
const bundle=require('../code/bundle-photo-fill');
const {bundlePhotoReceipt,receiptCode}=require('../code/bundle-photo-receipt');
const shared=require('../code/bundle-write-recovery');
const {uriCode}=require('./enable-uri-photo-recovery');
function enablePhotoReplacement(blueprint){
 const b=JSON.parse(JSON.stringify(blueprint)),walk=f=>f.flatMap(m=>[m,...(m.routes||[]).flatMap(r=>walk(r.flow))]),at=id=>walk(b.flow).find(m=>m.id===id);
 for(const id of [31,45]){const m=at(id),old=m.mapper.codeEditorJavascript,marker=id===31?'\ntry{':'\nconst baseline=';const start=old.lastIndexOf(marker);if(start<0)throw Error('Unknown photo adapter');m.mapper.codeEditorJavascript=bundle()+old.slice(start);}
 const p=at(37),old=p.mapper.codeEditorJavascript,start=old.lastIndexOf('\nconst baseline=');if(start<0)throw Error('Unknown photo receipt adapter');
 p.mapper.codeEditorJavascript=bundlePhotoReceipt()+old.slice(start).replace('targetEtag:input.etag,selection,download:',"targetEtag:input.etag,selection,action:gate.action,baseline,download:");
 const reader=JSON.parse(JSON.stringify(at(80)));reader.id=32;reader.parameters={authenticationType:'noAuth'};reader.mapper.url='{{31.result.primaryUrl}}';reader.filter=at(32).filter;Object.assign(at(32),reader);
 for(const id of [66,83,166,183]){const m=at(id),s=m.mapper.codeEditorJavascript,i=s.lastIndexOf('\ntry{');if(i<0)throw Error('Unknown recovery adapter');m.mapper.codeEditorJavascript=shared()+'\n'+receiptCode()+'\n'+uriCode()+s.slice(i);}
 at(47).mapper.data.state='{{if(37.result.action = "replace"; "verified_photo_replacement"; "verified_photo_fill")}}';
 return b;
}
module.exports=enablePhotoReplacement;
