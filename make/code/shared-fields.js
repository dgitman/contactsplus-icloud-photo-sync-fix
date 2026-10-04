// Pure, conservative Contacts+ -> vCard patching. No network or credentials.
function patchSharedFields({uid,existingVcard,contactData}) {
  const text=v=>{if(v==null)return '';if(typeof v!=='string'||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v))throw Error('Invalid text');return v;};
  const esc=v=>text(v).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  const fold=l=>{let s='',n=0;for(const c of l){const z=Buffer.byteLength(c);if(n+z>75){s+='\r\n ';n=1;}s+=c;n+=z;}return s;};
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid)||typeof existingVcard!=='string')throw Error('Invalid target');
  if(/\r(?!\n)|(?<!\r)\n/.test(existingVcard)||!existingVcard.endsWith('\r\n'))throw Error('Expected CRLF card');
  const records=[];
  for(const l of existingVcard.slice(0,-2).split('\r\n')){
    if(/^[ \t]/.test(l)){if(!records.length)throw Error('Invalid fold');records.at(-1).raw+='\r\n'+l;records.at(-1).line+=l.slice(1);}
    else records.push({raw:l,line:l});
  }
  const key=l=>l.split(':')[0].split(';')[0].split('.').at(-1).toUpperCase();
  const group=l=>l.split(':')[0].split(';')[0].includes('.')?l.split('.')[0]:null;
  const lines=records.map(r=>r.line);
  if(lines[0]!=='BEGIN:VCARD'||lines.at(-1)!=='END:VCARD'||lines.filter(l=>l==='BEGIN:VCARD').length!==1||lines.filter(l=>l==='END:VCARD').length!==1||lines.filter(l=>key(l)==='UID').length!==1||!lines.includes('UID:'+uid)||!lines.includes('VERSION:3.0'))throw Error('Target identity/format mismatch');
  const d=contactData;if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Missing source');
  let index=0;const occupied=new Set(records.map(r=>group(r.line)).filter(Boolean));
  const next=()=>{let g;do{g='item'+(++index);}while(occupied.has(g));occupied.add(g);return g;};
  const wanted=new Map(), managed=new Map();
  const set=(field,keys,values)=>{managed.set(field,new Set(keys));wanted.set(field,values);};
  const own=k=>Object.hasOwn(d,k)&&d[k]!=null;
  const array=k=>{if(!Array.isArray(d[k]))throw Error('Expected array '+k);return d[k];};
  const check=(x,keys)=>{if(!x||typeof x!=='object'||Object.keys(x).some(k=>!keys.includes(k)&&x[k]!=null&&x[k]!==''))throw Error('Unsupported source component');};
  function labeled(property,value,label,standard){
    if(!text(value)||/[\r\n]/.test(value))throw Error('Empty or multiline value');
    const t=text(label),upper=t.toUpperCase();
    if(!t)return [property+':'+esc(value)];
    if(standard.includes(upper))return [property+';TYPE='+upper+':'+esc(value)];
    const g=next();return [g+'.'+property+':'+esc(value),g+'.X-ABLabel:'+esc(t)];
  }
  if(own('name')){
    const n=d.name;check(n,['familyName','givenName','middleName','prefix','suffix','nickname']);
    const fn=['prefix','givenName','middleName','familyName','suffix'].map(k=>text(n[k])).filter(Boolean).join(' ');if(!fn.trim())throw Error('Empty name');
    set('name',['N','FN'],['N:'+['familyName','givenName','middleName','prefix','suffix'].map(k=>esc(n[k])).join(';'),'FN:'+esc(fn)]);
    if(Object.hasOwn(n,'nickname'))set('nickname',['NICKNAME'],n.nickname?['NICKNAME:'+esc(n.nickname)]:[]);
  }
  if(own('notes'))set('notes',['NOTE'],d.notes?['NOTE:'+esc(d.notes)]:[]);
  for(const [field,prop,labels] of [['emails','EMAIL',['HOME','WORK','INTERNET']],['phoneNumbers','TEL',['HOME','WORK','CELL','MOBILE','VOICE','FAX','PAGER','MAIN','OTHER']]])if(own(field)){
    const values=array(field).flatMap(x=>{check(x,['value','type']);return labeled(prop,x.value,x.type,labels);});set(field,[prop],values);
  }
  if(own('addresses'))set('addresses',['ADR'],array('addresses').flatMap(x=>{
    check(x,['street','extendedAddress','city','region','postalCode','country','type']);
    const value=['','',[x.street,x.extendedAddress].filter(Boolean).join('\n'),x.city,x.region,x.postalCode,x.country].map(esc).join(';');
    const t=text(x.type);if(!t||['HOME','WORK'].includes(t.toUpperCase()))return ['ADR'+(t?';TYPE='+t.toUpperCase():'')+':'+value];
    const g=next();return [g+'.ADR:'+value,g+'.X-ABLabel:'+esc(t)];
  }));
  if(own('urls')){
    const social=new Set(['linkedin','twitter','facebook','github','keybase','pinterest','youtube','instagram','flickr','myspace','skype','tiktok']);
    set('urls',['URL','X-SOCIALPROFILE'],array('urls').flatMap(x=>{
      check(x,['value','type','username','userId']);const type=text(x.type).toLowerCase();
      if(social.has(type)){
        if(!/^https?:\/\/[^\s]+$/i.test(text(x.value)))throw Error('Invalid social URL');
        const param=(key,value)=>{
          if(value==null||value==='')return '';
          // Delimiters/quoted parameters require a separate verified encoder.
          // Never allow a handle to inject another parameter or vCard line.
          if(!/^[A-Za-z0-9._~@+\-]+$/.test(text(value)))throw Error('Unsupported social parameter value');
          return ';'+key+'='+value;
        };
        return ['X-SOCIALPROFILE;TYPE='+type+param('X-USER',x.username)+param('X-USERID',x.userId)+':'+esc(x.value)];
      }
      if(x.username||x.userId)throw Error('Social profile metadata needs verified mapping');
      return labeled('URL',x.value,x.type,['HOME','WORK','HOMEPAGE','OTHER']);
    }));
  }
  if(own('organizations')){
    const orgs=array('organizations');const x=orgs[0]||{};check(x,['name','title','department','type']);
    set('organizations',['ORG','TITLE'],[...(x.name||x.department?['ORG:'+esc(x.name)+';'+esc(x.department)]:[]),...(x.title?['TITLE:'+esc(x.title)]:[])]);
  }
  if(own('ims'))set('ims',['IMPP'],array('ims').map(x=>{
    check(x,['value','type']);
    // This is the representation observed in the saved iCloud inventory.
    // Other services stay held until their URI encoding is verified.
    if(text(x.type).toLowerCase()!=='messenger')throw Error('Unsupported IM service');
    const value=text(x.value);if(!value||/[\s:]/.test(value))throw Error('Invalid IM handle');
    return 'IMPP;X-SERVICE-TYPE=Messenger:x-apple:'+esc(value);
  }));
  if(own('relatedPeople'))set('relatedPeople',['X-ABRELATEDNAMES'],array('relatedPeople').flatMap(x=>{
    check(x,['value','type']);return labeled('X-ABRELATEDNAMES',x.value,x.type,[]);
  }));
  if(own('birthday')){
    const b=d.birthday;check(b,['year','month','day']);
    const y=b.year==null?1604:b.year;
    const leap=y%4===0&&(y%100!==0||y%400===0);
    const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
    if(!Number.isInteger(y)||y<1||y>9999||!Number.isInteger(b.month)||b.month<1||b.month>12||!Number.isInteger(b.day)||b.day<1||b.day>days[b.month-1])throw Error('Invalid birthday');
    set('birthday',['BDAY'],['BDAY'+(b.year==null?';X-APPLE-OMIT-YEAR=1604':'')+':'+String(y).padStart(4,'0')+'-'+String(b.month).padStart(2,'0')+'-'+String(b.day).padStart(2,'0')]);
  }
  // Metadata and alternate photos are intentionally not rendered as text fields.
  // Unknown data never disappears silently: callers must hold those records.
  const supported=new Set(['name','notes','emails','phoneNumbers','addresses','urls','organizations','birthday','photos','ims','relatedPeople']);
  for(const k of Object.keys(d))if(!supported.has(k)&&d[k]!=null&&d[k]!==''&&!(Array.isArray(d[k])&&!d[k].length))throw Error('Unsupported populated source field: '+k);
  let kept=[...records], additions=[],changedFields=[];
  for(const [field,keys] of managed){
    const selected=records.filter(r=>keys.has(key(r.line)));const groups=new Set(selected.map(r=>group(r.line)).filter(Boolean));
    const ancillary=records.filter(r=>groups.has(group(r.line))&&!keys.has(key(r.line)));
    if(ancillary.some(r=>key(r.line)!=='X-ABLABEL'))throw Error('Managed field shares group with unmanaged data');
    // Compare semantics, not group ids, folding, type-case, or preferred flags.
    const semantic=rs=>rs.filter(r=>key(r.line)!=='X-ABLABEL').map(r=>{
      const pos=r.line.indexOf(':'),head=r.line.slice(0,pos);let types=[...head.matchAll(/;type=([^;:]+)/gi)].flatMap(m=>m[1].toLowerCase().split(',')).filter(t=>!['pref','internet'].includes(t)).sort();
      const label=rs.find(x=>group(x.line)===group(r.line)&&group(r.line)&&key(x.line)==='X-ABLABEL');if(label)types=['label:'+label.line.slice(label.line.indexOf(':')+1).toLowerCase()];
      if(key(r.line)==='TEL'&&!label){
        types=[...new Set(types.map(t=>t==='mobile'?'cell':t))];
        // Apple emits CELL,VOICE for the same Mobile label. Do not remove
        // voice from other label combinations or conflate fax/pager numbers.
        if(types.includes('cell'))types=types.filter(t=>t!=='voice');
        types.sort();
      }
      const params=head.split(';').slice(1).filter(p=>!/^type=/i.test(p)&&!/^value=(date|text)$/i.test(p)).map(p=>{
        const i=p.indexOf('='),k=p.slice(0,i).toLowerCase(),v=p.slice(i+1);
        // Social IDs are opaque and case-sensitive; retain their exact value.
        return ['x-user','x-userid'].includes(k)?k+'='+v:p.toLowerCase();
      }).sort();
      let value=r.line.slice(pos+1);
      // ORG is structured: an omitted empty trailing department is equivalent
      // to an explicit empty component. Escaped literal semicolons are data.
      if(key(r.line)==='ORG')while(value.endsWith(';')){
        let slashes=0;for(let i=value.length-2;i>=0&&value[i]==='\\';i--)slashes++;
        if(slashes%2)break;
        value=value.slice(0,-1);
      }
      return key(r.line)+';'+types.join(',')+';'+params.join(';')+':'+value;
    }).sort();
    const proposed=wanted.get(field).map(line=>({line,raw:fold(line)}));
    // iCloud may return an empty FN while preserving the complete structured N.
    // Accept that representation only for one exact, unparameterized N/FN pair.
    // A real name edit must still replace both fields; never infer identity here.
    if(field==='name'&&selected.length===2&&!ancillary.length&&
       selected.some(r=>r.line==='FN:')&&
       selected.some(r=>r.line===proposed.find(p=>p.line.startsWith('N:'))?.line))continue;
    if(JSON.stringify(semantic([...selected,...ancillary]))===JSON.stringify(semantic(proposed)))continue;
    const allowed=new Set(['TYPE','VALUE',...(field==='urls'?['X-USER','X-USERID']:[]),...(field==='ims'?['X-SERVICE-TYPE']:[]),...(field==='birthday'?['X-APPLE-OMIT-YEAR']:[])]);
    if(selected.some(r=>r.line.slice(0,r.line.indexOf(':')).split(';').slice(1).some(p=>!allowed.has(p.split('=')[0].toUpperCase()))))throw Error('Unsupported target parameter');
    changedFields.push(field);kept=kept.filter(r=>!keys.has(key(r.line))&&!ancillary.includes(r));additions.push(...proposed);
  }
  if(!changedFields.length)return {vcard:existingVcard,changed:false,changedFields};
  kept.splice(kept.length-1,0,...additions);return {vcard:kept.map(r=>r.raw).join('\r\n')+'\r\n',changed:true,changedFields};
}
module.exports=patchSharedFields;
