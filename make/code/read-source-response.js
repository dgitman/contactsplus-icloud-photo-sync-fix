// Keep Contacts+ birthday objects intact; the native Get Contact module tries
// to coerce yearless birthdays into dates and can fail before returning a card.
function readSourceResponse(value) {
  const response=typeof value==='string'?JSON.parse(value):value;
  if(!response||typeof response!=='object'||Array.isArray(response))throw Error('Missing source response');
  if(!Object.hasOwn(response,'statusCode'))return response; // Direct test/legacy input.
  const body=typeof response.body==='string'?JSON.parse(response.body):response.body;
  if(response.statusCode!==200||!Array.isArray(body?.contacts)||body.contacts.length!==1)
    throw Error('Expected exactly one successful source contact');
  const source=body.contacts[0];
  if(!source?.contactId||typeof source.etag!=='string'||!source.etag||!source.contactData)
    throw Error('Incomplete source identity/version');
  return source;
}
module.exports=readSourceResponse;
