// Pure serializer. decodedImage must come from a successful image conversion,
// with byteHash computed over that converter's exact output, never source flags.
const crypto=require('node:crypto');
const patchSharedFields=require('./shared-fields');
function embedPhoto({uid,existingVcard,targetEtag,action,imageBase64,decodedImage}) {
  patchSharedFields({uid,existingVcard,contactData:{}});
  if(!/^"[^"\r\n]+"$/.test(targetEtag||''))throw Error('Strong target ETag required');
  if(!['fill','replace'].includes(action))throw Error('Photo write not authorized by policy');
  if(typeof imageBase64!=='string'||imageBase64.length>8*1024*1024||!imageBase64.length||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(imageBase64))throw Error('Invalid image encoding');
  const bytes=Buffer.from(imageBase64,'base64');
  const byteHash=crypto.createHash('sha256').update(bytes).digest('hex');
  const d=decodedImage;
  if(!d||d.decoded!==true||d.byteHash!==byteHash||!Number.isInteger(d.width)||!Number.isInteger(d.height)||d.width<1||d.height<1||d.width*d.height>40000000)throw Error('Verified decode evidence required');
  const png=bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
  const jpeg=bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217;
  if(!((d.mime==='image/png'&&png)||(d.mime==='image/jpeg'&&jpeg)))throw Error('Image format mismatch');
  const records=[];
  for(const line of existingVcard.slice(0,-2).split('\r\n')){
    if(/^[ \t]/.test(line))records.at(-1).raw+='\r\n'+line;
    else records.push({head:line.split(':')[0],raw:line});
  }
  const key=r=>r.head.split(';')[0].split('.').at(-1).toUpperCase();
  const photos=records.filter(r=>key(r)==='PHOTO');
  if(photos.length>1||photos.some(r=>r.head.split(';')[0].includes('.')))throw Error('Ambiguous/grouped target photo');
  if(action==='fill'&&photos.length)throw Error('Fill cannot replace a PHOTO property');
  if(records.some(r=>['X-IMAGEHASH','X-IMAGETYPE'].includes(key(r))))throw Error('Photo metadata needs explicit reconciliation');
  const unfolded='PHOTO;ENCODING=b;TYPE='+(png?'PNG':'JPEG')+':'+imageBase64;
  let folded=unfolded.slice(0,75);for(let n=75;n<unfolded.length;n+=74)folded+='\r\n '+unfolded.slice(n,n+74);
  const kept=records.filter(r=>key(r)!=='PHOTO');kept.splice(kept.length-1,0,{raw:folded});
  return {vcard:kept.map(r=>r.raw).join('\r\n')+'\r\n',targetEtag,byteHash,status:'prepared-only',writesApplied:false};
}
module.exports=embedPhoto;
