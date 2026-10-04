const fs=require('node:fs'),path=require('node:path');
function receiptCode(){return fs.readFileSync(path.join(__dirname,'photo-write-receipt.js'),'utf8').replace(/^const .*require\('\.\/[^']+'\);$/gm,'').replace(/^module\.exports=.*;$/gm,'');}
function bundlePhotoReceipt(){
 const shared=fs.readFileSync(path.join(__dirname,'shared-write-receipt.js'),'utf8');
 const digest=shared.slice(shared.indexOf('function cardDigest'),shared.indexOf('function createSharedWriteReceipt'));
 return require('./bundle-photo-fill')()+'\n'+digest+'\n'+receiptCode();
}
module.exports={bundlePhotoReceipt,receiptCode};
