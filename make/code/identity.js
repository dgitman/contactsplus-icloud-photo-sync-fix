// Bootstrap only. Never use a name alone, or this matcher to authorize deletion.
function matchIdentities(sources, targets) {
  const norm = s => String(s ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  const nameTokens = value => {
    const tokens=norm(value).normalize('NFD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(Boolean);
    while(tokens.length>2 && ['mr','mrs','ms','miss','dr','prof'].includes(tokens[0]))tokens.shift();
    return tokens;
  };
  const equivalentName = (a,b) => {
    const x=nameTokens(a),y=nameTokens(b);if(!x.length||!y.length)return false;
    if(x.join(' ')===y.join(' '))return true;
    if(x.length<2||y.length<2||x[0]!==y[0]||x.at(-1)!==y.at(-1))return false;
    const xm=x.slice(1,-1),ym=y.slice(1,-1);
    if(!xm.length||!ym.length)return true;
    return xm.length===ym.length&&xm.every((v,i)=>v===ym[i]||((v.length===1||ym[i].length===1)&&v[0]===ym[i][0]));
  };
  const phone = s => { const v=String(s??'').replace(/[ ().-]/g,''); return /^\+[1-9]\d{7,14}$/.test(v)?v:null; };
  const keys = c => [...new Set([...(c.emails??[]).map(e=>norm(e.value??e)).filter(e=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)).map(e=>'e:'+e),
    ...(c.phones??[]).map(e=>phone(e.value??e)).filter(Boolean).map(e=>'p:'+e)])];
  const index = items => {const m=new Map();for(const c of items)for(const k of keys(c)){if(!m.has(k))m.set(k,[]);m.get(k).push(c);}return m;};
  const ensureIds = rows => {const ids=new Set();for(const r of rows){if(!r.id||ids.has(r.id))throw Error('Missing or duplicate identity');ids.add(r.id);}};
  ensureIds(sources);ensureIds(targets);
  const si=index(sources),ti=index(targets), used=new Map();
  const results=sources.map(s=>{
    const all=new Set(), unique=new Set(), evidence=new Map();
    for(const k of keys(s)) {
      for(const t of ti.get(k)??[])all.add(t.id);
      if(si.get(k)?.length===1 && ti.get(k)?.length===1){const id=ti.get(k)[0].id;unique.add(id);if(!evidence.has(id))evidence.set(id,[]);evidence.get(id).push(k);}
    }
    if(!all.size)return {sourceId:s.id,status:'unmatched'};
    if(unique.size!==1)return {sourceId:s.id,status:'ambiguous'};
    const t=targets.find(t=>t.id===[...unique][0]);
    const sameName=equivalentName(s.name,t.name);
    const corroborated=evidence.get(t.id).some(k=>k.startsWith('e:'))&&evidence.get(t.id).some(k=>k.startsWith('p:'));
    if(!sameName&&!corroborated)return {sourceId:s.id,status:'name_conflict'};
    const r={sourceId:s.id,targetId:t.id,status:'matched',evidence:sameName?'unique_identifier_and_name':'unique_email_and_phone'};
    if(!used.has(t.id))used.set(t.id,[]);used.get(t.id).push(r);return r;
  });
  for(const rs of used.values())if(rs.length>1)for(const r of rs){r.status='ambiguous';delete r.targetId;}
  return results;
}
module.exports={matchIdentities};
