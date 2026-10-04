// Read-only review of previously unique candidates. Never discovers uniqueness,
// changes contacts, or accepts missing/multiple resource responses.
const patchSharedFields=require('./shared-fields');
const {snapshot}=require('./prepare-shared-update');
const bootstrapEvidence=require('./bootstrap-evidence');
function reviewMatchBatch({candidates,sourceResponse,targetResponse,bookPath}){
 const parse=x=>typeof x==='string'?JSON.parse(x):x,arr=x=>x==null?[]:Array.isArray(x)?x:[x];
 const scalar=x=>{x=arr(x)[0];return x&&typeof x==='object'?x._value:x;};
 const s=parse(sourceResponse),t=parse(targetResponse);candidates=parse(candidates);
 if(!Array.isArray(candidates)||!candidates.length||candidates.length>100)throw Error('Bounded candidate batch required');
 if(!/^\/[A-Za-z0-9/_-]+\/$/.test(bookPath))throw Error('Fixed book path required');
 const sourceIds=candidates.map(x=>x.sourceId),targetIds=candidates.map(x=>x.targetId);
 if(sourceIds.some(x=>!x)||targetIds.some(x=>!/^[A-Za-z0-9_-]{1,128}$/.test(x))||new Set(sourceIds).size!==candidates.length||new Set(targetIds).size!==candidates.length)throw Error('Candidates must be one-to-one');
 if(s.statusCode!==200||t.statusCode!==207)throw Error('Both batch reads must succeed');
 const sourceBody=parse(s.body),targetBody=parse(t.body);
 if(!Array.isArray(sourceBody?.contacts)||!targetBody?.multistatus)throw Error('Incomplete batch envelope');
 const sources=new Map(),targets=new Map();
 for(const row of sourceBody.contacts){if(!sourceIds.includes(row.contactId)||sources.has(row.contactId))throw Error('Unexpected or duplicate source');sources.set(row.contactId,row);}
 for(const row of arr(targetBody.multistatus.response)){
  const href=scalar(row.href),targetId=targetIds.find(uid=>href===bookPath+uid+'.vcf');
  if(!targetId||targets.has(targetId))throw Error('Unexpected or duplicate target resource');
  const ps=arr(row.propstat).find(p=>/^HTTP\/1\.[01] 200(?: |$)/.test(scalar(p.status)||''));
  const prop=arr(ps?.prop)[0];targets.set(targetId,{card:scalar(prop?.['address-data']),etag:scalar(prop?.getetag)});
 }
 return candidates.map(({sourceId,targetId:uid})=>{
  const hold=reason=>({status:'held',sourceId,uid,reason});
  const source=sources.get(sourceId),target=targets.get(uid);
  if(!source||!target?.card)return hold('missing_resource');
  try{
   if(typeof source.etag!=='string'||!source.etag||!/^"[^"\r\n]+"$/.test(target.etag||''))throw Error('Missing version evidence');
   if(!bootstrapEvidence({contactData:source.contactData,existingVcard:target.card}))return hold('no_strong_identifier');
   const diff=patchSharedFields({uid,existingVcard:target.card,contactData:source.contactData});
   if(diff.changed)return {...hold('shared_field_differences'),fields:diff.changedFields};
   return {status:'eligible',sourceId,uid,sourceEtag:source.etag,targetEtag:target.etag,baselineJson:JSON.stringify(snapshot({sourceContactId:sourceId,uid,existingVcard:target.card,contactData:source.contactData}))};
  }catch(e){return hold(String(e.message));}
 });
}
module.exports=reviewMatchBatch;
