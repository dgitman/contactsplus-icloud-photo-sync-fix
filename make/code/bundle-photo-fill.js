const fs=require('node:fs'),path=require('node:path');
function bundlePhotoFill(){
  const names=['shared-fields','select-primary-photo','embed-photo','prepare-photo-fill','read-source-response'];
  return names.map((name,index)=>fs.readFileSync(path.join(__dirname,name+'.js'),'utf8')
    .replace(/^module\.exports=.*;$/gm,'')
    .replace(/^const .*require\('\.\/[^']+'\);$/gm,'')
    .replace(index===3?/^const crypto=require\('node:crypto'\);$/gm:/(?!)/g,'')).join('\n');
}
module.exports=bundlePhotoFill;
if(require.main===module)process.stdout.write(bundlePhotoFill());
