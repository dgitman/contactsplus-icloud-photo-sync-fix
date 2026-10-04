// Bootstrap only. Never use a name alone, or this matcher to authorize deletion.
function matchIdentities(sources, targets) {
  const norm = s => String(s ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  const phone = s => { const v=String(s??'').replace(/[ ().-]/g,''); return /^\+[1-9]\d{7,14}$/.test(v)?v:null; };
  const keys = c => [...new Set([...(c.emails??[]).map(e=>norm(e.value??e)).filter(Boolean).map(e=>'e:'+e),
    ...(c.phones??[]).map(e=>phone(e.value??e)).filter(Boolean).map(e=>'p:'+e)])];
  const index = items => {const m=new Map();for(const c of items)for(const k of keys(c)){if(!m.has(k))m.set(k,[]);m.get(k).push(c);}return m;};
  const ensureIds = rows => {const ids=new Set();for(const r of rows){if(!r.id||ids.has(r.id))throw Error('Missing or duplicate identity');ids.add(r.id);}};
  ensureIds(sources);ensureIds(targets);
  const si=index(sources),ti=index(targets), used=new Map();
  const results=sources.map(s=>{
    const all=new Set(), unique=new Set();
    for(const k of keys(s)) {
      for(const t of ti.get(k)??[])all.add(t.id);
      if(si.get(k)?.length===1 && ti.get(k)?.length===1)unique.add(ti.get(k)[0].id);
    }
    if(!all.size)return {sourceId:s.id,status:'unmatched'};
    if(all.size!==1||unique.size!==1)return {sourceId:s.id,status:'ambiguous'};
    const t=targets.find(t=>t.id===[...unique][0]);
    if(!norm(s.name)||norm(s.name)!==norm(t.name))return {sourceId:s.id,status:'name_conflict'};
    const r={sourceId:s.id,targetId:t.id,status:'matched'};
    if(!used.has(t.id))used.set(t.id,[]);used.get(t.id).push(r);return r;
  });
  for(const rs of used.values())if(rs.length>1)for(const r of rs){r.status='ambiguous';delete r.targetId;}
  return results;
}
module.exports={matchIdentities};
