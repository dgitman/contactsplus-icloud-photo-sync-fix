const test=require('node:test'),assert=require('node:assert/strict'),evidence=require('./bootstrap-evidence');
const card='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:test\r\nN:Person;Test;;;\r\nFN:Test Person\r\nTEL;TYPE=CELL:+1 (202) 555-0123\r\nEND:VCARD\r\n';
const contactData={name:{givenName:'Test',familyName:'Person'},phoneNumbers:[{value:'+12025550123'}]};
test('international phone and exact structured name corroborate without email',()=>assert.equal(evidence({contactData,existingVcard:card}),'exact_international_phone_and_structured_name'));
test('national numbers, extensions, different numbers and names do not qualify',()=>{
  for(const value of ['2025550123','0012025550123','+12025550123x4','+12025550124'])assert.equal(evidence({contactData:{...contactData,phoneNumbers:[{value}]},existingVcard:card}),null);
  assert.equal(evidence({contactData:{...contactData,name:{givenName:'Different',familyName:'Person'}},existingVcard:card}),null);
  assert.equal(evidence({contactData:{phoneNumbers:contactData.phoneNumbers},existingVcard:card}),null);
});
test('email must exist on both sides, not merely in the source',()=>{
  const contactData={emails:[{value:'test@example.invalid'}]};
  assert.equal(evidence({contactData,existingVcard:card}),null);
  assert.equal(evidence({contactData,existingVcard:card.replace('END:VCARD','EMAIL:test@example.invalid\r\nEND:VCARD')}),'exact_email');
});
test('name differences require extra current corroboration',()=>{
 const target=card.replace('END:VCARD','EMAIL:test@example.invalid\r\nEND:VCARD');
 assert.equal(evidence({contactData:{...contactData,emails:[{value:'test@example.invalid'}],name:{givenName:'Test',familyName:'Changed'}},existingVcard:target}),'exact_email_and_phone');
 assert.equal(evidence({contactData:{emails:[{value:'test@example.invalid'}],name:{givenName:'Test Middle',familyName:'Person'}},existingVcard:target}),'exact_email_and_compatible_name');
 assert.equal(evidence({contactData:{emails:[{value:'test@example.invalid'}],name:{givenName:'Someone',familyName:'Else'}},existingVcard:target}),'exact_email');
});
