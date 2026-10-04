const fs=require('node:fs'),path=require('node:path');
function bundlePreparedReceipt(){
 const adapter=fs.readFileSync(path.join(__dirname,'shared-update-adapter.js'),'utf8').replace('const r=prepareSharedUpdate({...input,source,baseline});',`const r=prepareSharedUpdate({...input,source,baseline});
  if(r.status==='prepared-only')r.writeReceiptJson=JSON.stringify(createSharedWriteReceipt({...input,source,baseline}));`);
 return require('./bundle-write-recovery')()+'\n'+adapter;
}
module.exports=bundlePreparedReceipt;
if(require.main===module)process.stdout.write(bundlePreparedReceipt());
