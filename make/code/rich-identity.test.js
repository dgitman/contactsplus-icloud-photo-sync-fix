const test=require('node:test'),assert=require('node:assert/strict'),rich=require('./rich-identity');
const name={givenName:'Alex',familyName:'Example'};
const card=more=>'BEGIN:VCARD\r\nVERSION:3.0\r\nUID:t\r\nN:Example;Alex;;;\r\nFN:Alex Example\r\n'+more+'END:VCARD\r\n';
const run=(d,more='')=>rich({uid:'t',contactData:{name,...d},existingVcard:card(more)});
test('name alone and company alone never qualify',()=>{assert.equal(run({}),null);assert.equal(run({organizations:[{name:'Company'}]},'ORG:Company\r\n'),null);});
test('exact company and title corroborate unique name',()=>{assert.equal(run({organizations:[{name:'Company',title:'Engineer'}]},'ORG:Company\r\nTITLE:Engineer\r\n'),'unique_name_and_company_title');assert.equal(run({organizations:[{name:'Company',title:'Manager'}]},'ORG:Company\r\nTITLE:Engineer\r\n'),null);});
test('exact long notes qualify but different names and notes do not',()=>{const notes='A sufficiently detailed unique note about this particular contact.';assert.equal(run({notes},'NOTE:'+notes+'\r\n'),'unique_name_and_exact_notes');assert.equal(run({notes:'different'},'NOTE:'+notes+'\r\n'),null);assert.equal(run({notes,name:{givenName:'Other',familyName:'Example'}},'NOTE:'+notes+'\r\n'),null);});
test('skipped malformed profiles never become matching evidence',()=>assert.equal(run({urls:[{type:'linkedin',value:'https://example.test/invalid space'}]}),null));
test('resource UID still has to match',()=>assert.throws(()=>rich({uid:'other',contactData:{name},existingVcard:card('')}),/identity/));

test('exact national phone group corroborates a globally unique name',()=>{assert.equal(run({phoneNumbers:[{value:'2125550123',type:'mobile'}]},'TEL;TYPE=CELL:2125550123\r\n'),'unique_name_and_exact_phone_group');});
test('short, differing, extension and mixed phone groups do not qualify',()=>{for(const value of ['5550123','2125550124','2125550123 ext 1'])assert.equal(run({phoneNumbers:[{value,type:'mobile'}]},'TEL;TYPE=CELL:2125550123\r\n'),null);assert.equal(run({phoneNumbers:[{value:'2125550123',type:'mobile'},{value:'2125550999',type:'work'}]},'TEL;TYPE=CELL:2125550123\r\n'),null);});
