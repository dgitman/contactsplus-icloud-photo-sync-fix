const {snapshot}=require('./prepare-shared-update');
function advanceSharedBaseline({source,uid,baseline,updatedFields,actual,expected,targetEtag}){
  const canonical=card=>{if(typeof card!=='string')throw Error('Missing readback');return card.replace(/\r\n[ \t]/g,'').split(/\r?\n/).filter(l=>l&&!/^(REV|PRODID):/.test(l)).sort();};
  if(JSON.stringify(canonical(actual))!==JSON.stringify(canonical(expected)))throw Error('Readback drift; do not retry');
  if(!/^"[^"\r\n]+"$/.test(targetEtag||''))throw Error('Strong readback ETag required');
  if(!baseline||baseline.uid!==uid||baseline.sourceContactId!==source.contactId||baseline.version!==1)throw Error('Baseline identity mismatch');
  const current=snapshot({sourceContactId:source.contactId,uid,existingVcard:actual,contactData:source.contactData});
  const next=JSON.parse(JSON.stringify(baseline));
  if(!Array.isArray(updatedFields)||!updatedFields.length||new Set(updatedFields).size!==updatedFields.length)throw Error('Updated field list required');
  for(const key of updatedFields){
    if(key==='photos'||!current.fields[key]||!baseline.fields[key])throw Error('Unverified field baseline');
    next.fields[key]=current.fields[key];
  }
  // Keep the prior baseline for independent target edits; accepting them here
  // could allow the next source edit to overwrite an unresolved local change.
  return {verified:true,targetEtag,baselineJson:JSON.stringify(next)};
}
module.exports=advanceSharedBaseline;
