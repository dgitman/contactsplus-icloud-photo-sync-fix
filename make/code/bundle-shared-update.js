const fs=require('node:fs'),path=require('node:path');
function bundleSharedUpdate(){
  const read=n=>fs.readFileSync(path.join(__dirname,n+'.js'),'utf8');
  return read('shared-fields').replace('module.exports=patchSharedFields;','')+'\n'+
    read('sync-state').replace('module.exports={hash,planFields,reconcile,deletionDecision};','')+'\n'+
    read('prepare-shared-update').replace("const patchSharedFields = require('./shared-fields');",'').replace("const {hash} = require('./sync-state');",'').replace('module.exports={snapshot,prepareSharedUpdate};','')+'\n'+read('shared-update-adapter');
}
module.exports=bundleSharedUpdate;
if(require.main===module)process.stdout.write(bundleSharedUpdate());
