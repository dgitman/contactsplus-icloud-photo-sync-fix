const test=require('node:test'),assert=require('node:assert/strict'),patch=require('./shared-fields');
const card='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:test\r\nN:Example;Alex;Middle;;\r\nFN:\r\nNOTE:Keep\r\nEND:VCARD\r\n';
const args={uid:'test',existingVcard:card,contactData:{name:{givenName:'Alex',familyName:'Example',middleName:'Middle'}}};
test('blank iCloud display name with exact structured name stays byte-for-byte unchanged',()=>{const r=patch(args);assert.equal(r.changed,false);assert.equal(r.vcard,card);});
test('real given middle and family name edits are not hidden',()=>{for(const field of ['givenName','middleName','familyName']){const r=patch({...args,contactData:{name:{...args.contactData.name,[field]:'Different'}}});assert.equal(r.changed,true);assert.ok(r.vcard.includes('Different'));}});
test('nonempty different display name remains a difference',()=>assert.equal(patch({...args,existingVcard:card.replace('FN:\r\n','FN:Different\r\n')}).changed,true));
test('duplicate or parameterized name fields never take blank-FN shortcut',()=>{for(const existingVcard of [card.replace('FN:\r\n','FN:\r\nFN:\r\n'),card.replace('FN:\r\n','FN;LANGUAGE=en:\r\n')]){try{assert.equal(patch({...args,existingVcard}).changed,true);}catch(e){assert.match(e.message,/parameter/);}}});

test('Apple professional suffix list is equivalent only with otherwise exact structured name',()=>{
 const patch=require('./shared-fields');
 const card='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:test\r\nN:Example;Alex;;;MD\\,,PhD\r\nFN:\r\nEND:VCARD\r\n';
 const run=name=>patch({uid:'test',existingVcard:card,contactData:{name}});
 assert.equal(run({givenName:'Alex',familyName:'Example',suffix:'MD, PhD'}).changed,false);
 assert.equal(run({givenName:'Other',familyName:'Example',suffix:'MD, PhD'}).changed,true);
 assert.equal(run({givenName:'Alex',familyName:'Example',suffix:'MD, JD'}).changed,true);
});
