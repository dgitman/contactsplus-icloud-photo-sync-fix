// Require globally unique names, or exact supported fields plus a caller-verified
// exclusive source/target candidate graph. Never accept competing claims.
// Never use this to discover candidates, authorize deletion, or match by name alone.
const patchSharedFields=require('./shared-fields');
function richIdentity({contactData:d,existingVcard,uid}){
 if(!d?.name)return null;
 const names=patchSharedFields({uid,existingVcard,contactData:{name:d.name}});
 if(names.changed)return null;
 const projected=patchSharedFields({uid,existingVcard,contactData:d,projectionOnly:true});
 const exact=field=>Object.hasOwn(projected,field)&&!patchSharedFields({uid,existingVcard,contactData:{[field]:projected[field]}}).changed;
 if(d.phoneNumbers?.some(x=>typeof x.value==='string'&&/^[+0-9 ().-]+$/.test(x.value)&&/^\d{10,15}$/.test(x.value.replace(/\D/g,'')))&&exact('phoneNumbers'))return 'unique_name_and_exact_phone_group';
 if(d.addresses?.some(x=>x.street?.trim()&&(x.postalCode?.trim()||x.city?.trim()))&&exact('addresses'))return 'unique_name_and_complete_address';
 if(Number.isInteger(d.birthday?.year)&&exact('birthday'))return 'unique_name_and_full_birthday';
 const social=new Set(['linkedin','twitter','github','keybase','facebook','instagram']);
 if(d.urls?.some(x=>social.has(String(x.type).toLowerCase())&&/^https?:\/\/[^/\s]+\/[^\s]+$/i.test(x.value||''))&&exact('urls'))return 'unique_name_and_profile_url';
 if(d.organizations?.[0]?.name?.trim()&&d.organizations[0].title?.trim()&&exact('organizations'))return 'unique_name_and_company_title';
 if(typeof d.notes==='string'&&d.notes.trim().length>=40&&exact('notes'))return 'unique_name_and_exact_notes';
 return null;
}
module.exports=richIdentity;
