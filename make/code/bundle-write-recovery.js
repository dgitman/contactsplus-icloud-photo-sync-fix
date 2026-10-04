const fs=require('node:fs'),path=require('node:path');
function bundleWriteRecovery(){
 const common=require('./bundle-shared-update')().split('// Bundled after shared-fields.js')[0];
 const advance=fs.readFileSync(path.join(__dirname,'advance-shared-baseline.js'),'utf8').replace("const {snapshot}=require('./prepare-shared-update');",'').replace("require('./sync-state').hash([])",'hash([])').replace('module.exports=advanceSharedBaseline;','');
 const receipt=fs.readFileSync(path.join(__dirname,'shared-write-receipt.js'),'utf8').replace("const {hash}=require('./sync-state');",'').replace("const {prepareSharedUpdate}=require('./prepare-shared-update');",'').replace("const advanceSharedBaseline=require('./advance-shared-baseline');",'').replace('module.exports={cardDigest,createSharedWriteReceipt,reconcileSharedWrite};','');
 return common+'\n'+advance+'\n'+receipt;
}
module.exports=bundleWriteRecovery;
if(require.main===module)process.stdout.write(bundleWriteRecovery());
