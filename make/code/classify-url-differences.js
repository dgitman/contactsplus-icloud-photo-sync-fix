// Read-only diagnosis; never authorizes a write or changes sync baselines.
function classifyUrlDifferences({sourceUrls,targetUrls}) {
 const unescape=s=>s.replace(/\\([\\,;nN])/g,(_,c)=>/[nN]/.test(c)?'\n':c);
 const labels=new Map(),targets=[];
 for(const line of targetUrls||[]){
  const i=line.indexOf(':');if(i<0)throw Error('Invalid property');
  const head=line.slice(0,i),value=unescape(line.slice(i+1)),parts=head.split(';'),property=parts.shift(),key=property.split('.').at(-1).toUpperCase(),group=property.includes('.')?property.split('.')[0]:null;
  if(key==='X-ABLABEL'){labels.set(group,value);continue;}
  if(!['URL','X-SOCIALPROFILE'].includes(key))continue;
  const params={};for(const p of parts){const j=p.indexOf('=');if(j<0||p.includes('"'))throw Error('Unsupported parameter');params[p.slice(0,j).toUpperCase()]=p.slice(j+1);}
  targets.push({value,group,type:params.TYPE||'',username:params['X-USER']||'',userId:params['X-USERID']||''});
 }
 const sources=sourceUrls||[],sorted=x=>JSON.stringify(x.map(y=>y.value).sort());
 if(sorted(sources)!==sorted(targets))return {category:'different_url_values',writesAllowed:false};
 if(new Set(sources.map(x=>x.value)).size!==sources.length)return {category:'duplicate_values_need_review',writesAllowed:false};
 const differences=new Set();
 for(const s of sources){const t=targets.find(x=>x.value===s.value),type=labels.get(t.group)||t.type;
  if((s.type||'').toLowerCase()!==type.toLowerCase())differences.add('label');
  for(const k of ['username','userId'])if((s[k]||'')!==t[k])differences.add(k);
 }
 return {category:differences.size?'same_urls_metadata_differs':'same_urls_and_metadata',differences:[...differences].sort(),writesAllowed:false};
}
module.exports=classifyUrlDifferences;
