const fs=require('node:fs'),path=require('node:path');
function bundleMatchReview(){
 return ['shared-fields','sync-state','prepare-shared-update','bootstrap-evidence','rich-identity','review-match-batch'].map(n=>fs.readFileSync(path.join(__dirname,n+'.js'),'utf8').replace(/^const .*require\('\.\/[^']+'\);$/gm,'').replace(/^module\.exports=.*;$/gm,'')).join('\n');
}
module.exports=bundleMatchReview;
if(require.main===module)process.stdout.write(bundleMatchReview());
