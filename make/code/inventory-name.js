// Decode only vCard TEXT escapes, once, before comparing inventory display names.
// This discovers candidates; fresh identity corroboration is still required.
function inventoryName(value,{vcardText=false}={}){
 let s=String(value||'');
 if(vcardText)s=s.replace(/\\([nN,;\\])/g,(_,c)=>/[nN]/.test(c)?'\n':c);
 return s.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
}
module.exports=inventoryName;
