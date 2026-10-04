// Read-only corroboration for prior globally unique bootstrap candidates.
// This does not establish uniqueness or authorize an event-time create/delete.
const patchSharedFields=require('./shared-fields');
function bootstrapEvidence({contactData,existingVcard}){
  const lines=existingVcard.replace(/\r\n[ \t]/g,'').split('\r\n');
  const key=l=>l.split(':')[0].split(';')[0].split('.').at(-1).toUpperCase();
  const value=l=>l.slice(l.indexOf(':')+1);
  const emails=new Set(lines.filter(l=>key(l)==='EMAIL').map(l=>value(l).trim().toLowerCase()));
  const email=(contactData.emails||[]).some(e=>typeof e.value==='string'&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.value)&&emails.has(e.value.trim().toLowerCase()));
  const phone=v=>{if(typeof v!=='string'||!/^[+0-9 ().-]+$/.test(v))return null;const n=v.replace(/[ ().-]/g,'');return /^\+[1-9]\d{7,14}$/.test(n)?n:null;};
  const targetPhones=new Set(lines.filter(l=>key(l)==='TEL').map(l=>phone(value(l))).filter(Boolean));
  const matched=(contactData.phoneNumbers||[]).some(p=>phone(p.value)&&targetPhones.has(phone(p.value)));
  // Business SMS short codes are not personal phone identity. Require the
  // complete supported company and phone groups, then caller resolves uniqueness.
  if(!contactData.name&&contactData.organizations?.[0]?.name?.trim()&&
     lines.filter(l=>key(l)==='N').every(l=>value(l).replace(/;/g,'')==='')&&
     contactData.phoneNumbers?.some(p=>typeof p.value==='string'&&/^\d{5,6}$/.test(p.value.replace(/-/g,'')))){
    const uid=value(lines.find(l=>key(l)==='UID')||'');
    const data={organizations:contactData.organizations,phoneNumbers:contactData.phoneNumbers};
    const projected=patchSharedFields({uid,existingVcard,contactData:data,projectionOnly:true});
    if(projected.organizations&&projected.phoneNumbers&&!patchSharedFields({uid,existingVcard,contactData:data}).changed)return 'exact_business_and_short_code_group';
  }
  if(!matched) {
    // National numbers are compared literally after punctuation removal; no
    // country inference. Candidate uniqueness is established by the caller.
    const national=v=>typeof v==='string'&&/^[0-9 ().-]+$/.test(v)&&/^\d{10,15}$/.test(v.replace(/[ ().-]/g,''))?v.replace(/[ ().-]/g,''):null;
    const ns=new Set(lines.filter(l=>key(l)==='TEL').map(l=>national(value(l))).filter(Boolean));
    const shared=(contactData.phoneNumbers||[]).some(p=>national(p.value)&&ns.has(national(p.value)));
    if(shared){
      const uid=value(lines.find(l=>key(l)==='UID')||'');
      if(contactData.name&&!patchSharedFields({uid,existingVcard,contactData:{name:contactData.name}}).changed)return 'exact_national_phone_and_name';
      if(!contactData.name&&lines.filter(l=>key(l)==='N').every(l=>value(l).replace(/;/g,'')==='')&&contactData.organizations?.[0]?.name?.trim()){
        const projected=patchSharedFields({uid,existingVcard,contactData:{organizations:contactData.organizations},projectionOnly:true});
        if(projected.organizations&&!patchSharedFields({uid,existingVcard,contactData:projected}).changed)return 'exact_national_phone_and_company';
      }
    }
  }
  if(matched&&!contactData.name&&lines.filter(l=>key(l)==='N').every(l=>value(l).replace(/;/g,'')==='')) {
    const company=contactData.organizations?.[0]?.name;
    const escaped=typeof company==='string'?company.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').trim().toLowerCase():'';
    const orgs=lines.filter(l=>key(l)==='ORG').map(l=>value(l).split(/(?<!\\);/)[0].trim().toLowerCase());
    if(escaped&&orgs.includes(escaped))return 'exact_international_phone_and_company';
  }
  if(email&&contactData.name) {
    const uid=value(lines.find(l=>key(l)==='UID')||'');
    const prepared=patchSharedFields({uid,existingVcard,contactData:{name:contactData.name}}).vcard.replace(/\r\n[ \t]/g,'').split('\r\n');
    const actual=lines.filter(l=>key(l)==='N'),expected=prepared.filter(l=>key(l)==='N');
    if(actual.length===1&&expected.length===1&&actual[0]===expected[0])return 'exact_email_and_structured_name';
  }
  if(email&&matched)return 'exact_email_and_phone';
  if(email) {
    const n=lines.filter(l=>/^N:/.test(l));
    const components=n.length===1?n[0].slice(2).split(';'):[];
    const norm=s=>String(s||'').normalize('NFKC').trim().toLowerCase();
    const source=contactData.name;
    // Prior globally unique email plus exact family and first given-name token.
    // Additional given/middle names do not require overwriting either name.
    if(components.length===5&&source&&norm(source.familyName)&&norm(source.familyName)===norm(components[0])&&norm(source.givenName).split(/\s+/)[0]&&norm(source.givenName).split(/\s+/)[0]===norm(components[1]).split(/\s+/)[0])return 'exact_email_and_compatible_name';
    return 'exact_email';
  }
  if(!matched||!contactData.name)return null;
  const proposed=patchSharedFields({uid:value(lines.find(l=>key(l)==='UID')||''),existingVcard,contactData:{name:contactData.name}}).vcard.replace(/\r\n[ \t]/g,'').split('\r\n');
  const names=lines.filter(l=>key(l)==='N'),expected=proposed.filter(l=>key(l)==='N');
  return names.length===1&&expected.length===1&&names[0]===expected[0]?'exact_international_phone_and_structured_name':null;
}
module.exports=bootstrapEvidence;
