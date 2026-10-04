const test = require('node:test');
const assert = require('node:assert/strict');
const convert = require('./vcard.js');
const base = {mode:'create',uid:'test-uid',contactData:{name:{givenName:'Test',familyName:'Person'}}};
const unfold = s => s.replace(/\r\n[ \t]/g,'');
test('create required identity and multiple contact values',()=> {
 const c=convert({...base,contactData:{...base.contactData,emails:[{type:'work',value:'a@example.invalid'},{type:'home',value:'b@example.invalid'}],phoneNumbers:[{type:'cell',value:'+1 555 0100'}]}}).vcard;
 assert.match(c,/UID:test-uid\r\nN:Person;Test;;;\r\nFN:Test Person/);
 assert.equal((c.match(/EMAIL/g)||[]).length,2);assert.match(c,/TEL;TYPE=CELL:/);
});
test('escape text prevents property injection',()=> {
 const c=unfold(convert({...base,contactData:{...base.contactData,notes:'a,b;c\\d\r\nEND:VCARD\nBEGIN:VCARD'}}).vcard);
 assert.ok(c.includes('NOTE:a\\,b\\;c\\\\d\\nEND:VCARD\\nBEGIN:VCARD'));
 assert.equal(c.split('\r\n').filter(x=>x==='END:VCARD').length,1);
});
test('UTF-8 folding respects 75 octets without corrupting emoji',()=> {
 const notes='🦞漢é'.repeat(100);const c=convert({...base,contactData:{...base.contactData,notes}}).vcard;
 assert.ok(c.split('\r\n').every(l=>Buffer.byteLength(l)<=75));assert.ok(unfold(c).includes('NOTE:'+notes));
});
test('reject unsafe UID, implicit mode, and unsupported source fields',()=> {
 for(const changes of [{uid:'bad\nUID:x'},{mode:undefined},{contactData:{...base.contactData,photos:[{value:'https://example.invalid/image'}]}},{contactData:{...base.contactData,birthday:'2000-01-01'}}])assert.throws(()=>convert({...base,...changes}));
});
test('reject parameter injection and unknown labels',()=> {
 for(const type of ['WORK\r\nNOTE:bad','school'])assert.throws(()=>convert({...base,contactData:{...base.contactData,emails:[{type,value:'a@example.invalid'}]}}));
});
const prior='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:test-uid\r\nN:Person;Test;;;\r\nFN:Test Person\r\nNOTE:old\r\nPHOTO;ENCODING=b;TYPE=PNG:abc\r\n def\r\nitem1.EMAIL:a@example.invalid\r\nitem1.X-ABLabel:custom\r\nX-UNKNOWN:keep\r\nEND:VCARD\r\n';
test('notes patch preserves all other raw properties including folded photo',()=> {
 const c=convert({mode:'patch-name-notes',uid:'test-uid',existingVcard:prior,contactData:{notes:'new'}}).vcard;
 assert.equal(c.replace('NOTE:new\r\n',''),prior.replace('NOTE:old\r\n',''));
});
test('name patch keeps notes and identity',()=> {
 const c=convert({mode:'patch-name-notes',uid:'test-uid',existingVcard:prior,contactData:{name:{givenName:'New'}}}).vcard;
 assert.ok(c.includes('FN:New\r\n'));assert.ok(c.includes('NOTE:old\r\n'));assert.ok(c.includes('UID:test-uid\r\n'));
});
test('wrong UID, multi-card, and qualified managed properties refused',()=> {
 for(const existingVcard of [prior.replace('UID:test-uid','UID:other'),prior+prior,prior.replace('NOTE:old','NOTE;LANGUAGE=en:old')])assert.throws(()=>convert({mode:'patch-name-notes',uid:'test-uid',existingVcard,contactData:{notes:'new'}}));
});
