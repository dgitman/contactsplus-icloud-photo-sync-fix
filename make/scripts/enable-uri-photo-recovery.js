const fs=require('fs'),path=require('path');
const {bundlePhotoReceipt,receiptCode}=require('../code/bundle-photo-receipt');
const sharedBundle=require('../code/bundle-write-recovery');
const uriCode=()=>fs.readFileSync(path.join(__dirname,'../code/uri-photo-recovery.js'),'utf8').replace(/^const .*require\('\.\/[^']+'\);$/gm,'').replace(/^module\.exports=.*;$/gm,'');
function enableUriPhotoRecovery(blueprint){
 const b=JSON.parse(JSON.stringify(blueprint)),walk=f=>f.flatMap(m=>[m,...(m.routes||[]).flatMap(r=>walk(r.flow))]),at=id=>walk(b.flow).find(m=>m.id===id),copy=id=>JSON.parse(JSON.stringify(at(id)));
 if(at(80))throw Error('URI recovery already installed');
 const prefix=at(41).mapper.codeEditorJavascript.match(/u\.pathname\.startsWith\('([^']+)'\)/)?.[1];
 if(!prefix||!/^\/contacts\/(?:[0-9]+|YOUR_ACCOUNT_ID)\/ck\/card\/$/.test(prefix))throw Error('Configured account photo path required');
 const prep=at(37);const start=prep.mapper.codeEditorJavascript.lastIndexOf('\nconst baseline=');if(start<0)throw Error('Unknown photo preparation adapter');
 prep.mapper.codeEditorJavascript=bundlePhotoReceipt()+prep.mapper.codeEditorJavascript.slice(start);
 const code=sharedBundle()+'\n'+receiptCode()+'\n'+uriCode();
 const parse=`const args={...input,receipt:JSON.parse(input.receipt),baseline:JSON.parse(input.baseline),source:readSourceResponse(input.source),statusCode:Number(input.statusCode)};`;
 const eq=(a,b,o='text:equal')=>({a,b,o}),filter=(name,conditions)=>({name,conditions:[conditions]});
 for(const n of [0,100]){
  const check=at(66+n);check.mapper.input.push({name:'photoPathPrefix',value:prefix});
  check.mapper.codeEditorJavascript=code+`\ntry{${parse}const result=args.receipt.operation==='photo_fill'?reconcilePhotoWrite(args):reconcileSharedWrite(args);return {...(args.receipt.operation==='photo_fill'&&result.status==='held'?planUriPhotoRecovery(args):result),operation:args.receipt.operation};}catch(e){return {status:'held',reason:String(e.message),writesAllowed:false};}`;
  const mark=copy(70+n);mark.id=89+n;mark.filter=filter('Account-bound photo readback only',[eq('{{'+(66+n)+'.result.status}}','uri_photo_download')]);
  const download=copy(65+n);download.id=80+n;delete download.filter;download.mapper.url='{{'+(66+n)+'.result.url}}';download.mapper.allowRedirects=false;download.mapper.stopOnHttpError=false;
  const convert=copy(43);convert.id=81+n;convert.mapper.data='{{'+(80+n)+'.data}}';convert.filter=filter('Photo download succeeded',[eq('{{'+(80+n)+'.statusCode}}',200,'number:equal')]);
  const dimensions=copy(44);dimensions.id=82+n;dimensions.mapper.data='{{'+(81+n)+'.data}}';dimensions.mapper.fileName='{{'+(81+n)+'.fileName}}';
  const verify=copy(66+n);verify.id=83+n;verify.mapper.input.push(...[{name:'requestedUrl',value:'{{'+(66+n)+'.result.url}}'},{name:'downloadStatus',value:'{{'+(80+n)+'.statusCode}}'},{name:'b64',value:'{{base64('+(80+n)+'.data)}}'},{name:'width',value:'{{'+(82+n)+'.width}}'},{name:'height',value:'{{'+(82+n)+'.height}}'}]);
  verify.mapper.codeEditorJavascript=code+`\ntry{${parse}return finishUriPhotoRecovery({...args,download:{requestedUrl:input.requestedUrl,statusCode:Number(input.downloadStatus),decoded:true,width:Number(input.width),height:Number(input.height),imageBase64:input.b64}});}catch(e){return {status:'held',reason:String(e.message),writesAllowed:false};}`;
  const mapping=copy(68+n);mapping.id=85+n;mapping.filter=filter('Decoded exact photo verified',[eq('{{'+(83+n)+'.result.status}}','verified_recovered')]);for(const k of Object.keys(mapping.mapper.data))mapping.mapper.data[k]=mapping.mapper.data[k].replaceAll((66+n)+'.result',(83+n)+'.result');
  const done=copy(69+n);done.id=86+n;done.mapper.data.state='verified_photo_fill_recovered';
  const held=copy(70+n);held.id=87+n;held.filter=filter('Photo recovery remains held',[eq('{{'+(83+n)+'.result.status}}','held')]);
  at(67+n).routes.push({flow:[mark,download,convert,dimensions,verify,{id:84+n,module:'builtin:BasicRouter',version:1,mapper:null,routes:[{flow:[mapping,done]},{flow:[held]}]}]});
 }
 return b;
}
module.exports={enableUriPhotoRecovery,uriCode};
