const fs=require('node:fs'),path=require('node:path');
function bundleSharedVerification(){
  const common=require('./bundle-shared-update')().split('// Bundled after shared-fields.js')[0];
  const advance=fs.readFileSync(path.join(__dirname,'advance-shared-baseline.js'),'utf8').replace("const {snapshot}=require('./prepare-shared-update');",'').replace('module.exports=advanceSharedBaseline;','');
  return common+'\n'+advance+`\nreturn advanceSharedBaseline({...input,
    source:readSourceResponse(input.source),
    baseline:typeof input.baseline==='string'?JSON.parse(input.baseline):input.baseline,
    updatedFields:typeof input.updatedFields==='string'?JSON.parse(input.updatedFields):input.updatedFields});`;
}
module.exports=bundleSharedVerification;
if(require.main===module)process.stdout.write(bundleSharedVerification());
