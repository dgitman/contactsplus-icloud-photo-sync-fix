const fs=require('node:fs'),path=require('node:path');
const {bundlePhotoReceipt,receiptCode}=require('../code/bundle-photo-receipt');
const sharedBundle=require('../code/bundle-write-recovery');
function enablePhotoRecovery(blueprint){
 const b=JSON.parse(JSON.stringify(blueprint));
 const walk=flow=>flow.flatMap(m=>[m,...(m.routes||[]).flatMap(r=>walk(r.flow))]);const modules=walk(b.flow),at=id=>modules.find(m=>m.id===id);
 const prep=at(37);if(prep.mapper.input.some(i=>i.name==='eventId'))throw Error('Photo recovery already installed');
 prep.mapper.input.push({name:'eventId',value:'{{2.eventId}}'});
 const old=require('../code/bundle-photo-fill')();
 if(!prep.mapper.codeEditorJavascript.startsWith(old))throw Error('Unexpected photo preparer');
 prep.mapper.codeEditorJavascript=bundlePhotoReceipt()+prep.mapper.codeEditorJavascript.slice(old.length).replace('return preparePhotoFill(', 'const prepared=preparePhotoFill(')+`\nif(prepared.status==='prepared-only')prepared.writeReceiptJson=JSON.stringify(createPhotoWriteReceipt({prepared,source,baseline,eventId:input.eventId,before:input.card}));return prepared;`;
 at(38).mapper.data.writeReceiptJson='{{37.result.writeReceiptJson}}';
 const gate=fs.readFileSync(path.join(__dirname,'../code/recovery-event-gate.js'),'utf8').replace('module.exports=recoveryEventGate;','');
 for(const offset of [0,100]){
  const mapping=at(62+offset),stateField='{{'+(61+offset)+'.state}}';
  const first=JSON.parse(JSON.stringify(mapping.filter.conditions[0]));first.find(c=>c.a===stateField).b='photo_write_pending';mapping.filter.conditions.push(first);
  at(63+offset).mapper.codeEditorJavascript=gate+'\nreturn recoveryEventGate(input);';
  const check=at(66+offset);check.mapper.codeEditorJavascript=sharedBundle()+'\n'+receiptCode()+`\ntry{const args={...input,receipt:JSON.parse(input.receipt),baseline:JSON.parse(input.baseline),source:readSourceResponse(input.source),statusCode:Number(input.statusCode)};return {...(args.receipt.operation==='photo_fill'?reconcilePhotoWrite(args):reconcileSharedWrite(args)),operation:args.receipt.operation};}catch(e){return {status:'held',reason:String(e.message),writesAllowed:false};}`;
  at(69+offset).mapper.data.state='{{if('+(66+offset)+'.result.operation = "photo_fill"; "verified_photo_fill_recovered"; "verified_shared_fields_recovered")}}';
 }
 const search=at(72);const alt=JSON.parse(JSON.stringify(search.mapper.filter[0]));alt.find(x=>x.a==='state').b='photo_write_pending';search.mapper.filter.push(alt);
 at(73).mapper.codeEditorJavascript=at(73).mapper.codeEditorJavascript.replace("d.state!=='prepared_shared_fields'","!['prepared_shared_fields','photo_write_pending'].includes(d.state)");
 return b;
}
module.exports=enablePhotoRecovery;
