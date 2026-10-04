// Read-only corroboration for prior globally unique bootstrap candidates.
// This does not establish uniqueness or authorize an event-time create/delete.
const patchSharedFields=require('./shared-fields');
function bootstrapEvidence({contactData,existingVcard}){
  const lines=existingVcard.replace(/\r\n[ \t]/g,'').split('\r\n');
  const key=l=>l.split(':')[0].split(';')[0].split('.').at(-1).toUpperCase();
  const value=l=>l.slice(l.indexOf(':')+1);
  const emails=new Set(lines.filter(l=>key(l)==='EMAIL').map(l=>value(l).trim().toLowerCase()));
  const email=(contactData.emails||[]).some(e=>typeof e.value==='string'&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.value)&&emails.has(e.value.trim().toLowerCase()));
  if(email)return 'exact_email';
  const phone=v=>{if(typeof v!=='string'||!/^[+0-9 ().-]+$/.test(v))return null;const n=v.replace(/[ ().-]/g,'');return /^\+[1-9]\d{7,14}$/.test(n)?n:null;};
  const targetPhones=new Set(lines.filter(l=>key(l)==='TEL').map(l=>phone(value(l))).filter(Boolean));
  const matched=(contactData.phoneNumbers||[]).some(p=>phone(p.value)&&targetPhones.has(phone(p.value)));
  if(!matched||!contactData.name)return null;
  const proposed=patchSharedFields({uid:value(lines.find(l=>key(l)==='UID')||''),existingVcard,contactData:{name:contactData.name}}).vcard.replace(/\r\n[ \t]/g,'').split('\r\n');
  const names=lines.filter(l=>key(l)==='N'),expected=proposed.filter(l=>key(l)==='N');
  return names.length===1&&expected.length===1&&names[0]===expected[0]?'exact_international_phone_and_structured_name':null;
}
module.exports=bootstrapEvidence;
