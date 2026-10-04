// Contacts+ documents photos[0] as primary. Never fall back to a secondary.
// https://www.contactsplus.com/developers/contacts-api/
function selectPrimaryPhoto({source,sourceContactId}) {
  if(!sourceContactId||source?.contactId!==sourceContactId||typeof source.etag!=='string'||!source.etag.trim()||!source.contactData)throw Error('Fresh exact source identity/version required');
  const photos=source.contactData.photos;
  if(!Array.isArray(photos))return {status:'hold',reason:'photos_not_observed'};
  if(!photos.length||photos[0]?.type==='absentPhoto')return {status:'preserve',reason:'no_primary_photo',primaryUrl:null};
  const photo=photos[0];
  if(!photo||typeof photo.value!=='string'||photo.value.trim()!==photo.value)return {status:'hold',reason:'invalid_primary_photo'};
  let url;try{url=new URL(photo.value);}catch{return {status:'hold',reason:'invalid_primary_photo'};}
  // Downloads are unauthenticated. Only the observed Contacts+ image hosts are
  // admitted; do not route arbitrary contact URLs or Apple credentials here.
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||!['img.contactsplus.com','img.fullcontact.com'].includes(url.hostname))return {status:'hold',reason:'unverified_photo_host'};
  return {status:'download',primaryUrl:photo.value,sourceContactId,sourceEtag:source.etag};
}
module.exports=selectPrimaryPhoto;
