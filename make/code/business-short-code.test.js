const test=require('node:test'),assert=require('node:assert/strict'),evidence=require('./bootstrap-evidence');
const data={organizations:[{name:'Example Service'}],phoneNumbers:[{value:'12345',type:'other'}]};
const card=(company='Example Service',phone='12345')=>'BEGIN:VCARD\r\nVERSION:3.0\r\nUID:t\r\nORG:'+company+'\r\nTEL;TYPE=OTHER:'+phone+'\r\nEND:VCARD\r\n';
test('exact company and complete short-code group provide business evidence',()=>assert.equal(evidence({contactData:data,existingVcard:card()}),'exact_business_and_short_code_group'));
test('short code alone, differing company and differing number are rejected',()=>{for(const [d,c]of [[{phoneNumbers:data.phoneNumbers},card()],[data,card('Other Service')],[data,card('Example Service','54321')]])assert.equal(evidence({contactData:d,existingVcard:c}),null);});
test('a partial business phone group is insufficient',()=>assert.equal(evidence({contactData:{...data,phoneNumbers:[...data.phoneNumbers,{value:'67890',type:'other'}]},existingVcard:card()}),null));
test('short codes do not corroborate personal-name records',()=>assert.equal(evidence({contactData:{...data,name:{givenName:'Alex'}},existingVcard:card()}),null));
