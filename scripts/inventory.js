ObjC.import('Foundation');
function run(argv) {
  if(argv.length!==1)throw Error('Required: inventory output path');
  const app=Application('Contacts');
  const ids=app.people.id(),first=app.people.firstName(),last=app.people.lastName(),cards=app.people.vcard();
  if(![first,last,cards].every(a=>a.length===ids.length))throw Error('Inventory length mismatch');
  const records=ids.map((id,i)=>({id,first:first[i]||'',last:last[i]||'',vcard:cards[i]}));
  const ok=$(JSON.stringify(records)).writeToFileAtomicallyEncodingError(argv[0],true,$.NSUTF8StringEncoding,null);
  if(!ok)throw Error('Could not save inventory');
  return JSON.stringify({contacts:records.length});
}
