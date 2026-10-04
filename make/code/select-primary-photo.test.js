const test=require('node:test'),assert=require('node:assert/strict');
const select=require('./select-primary-photo');
const run=photos=>select({sourceContactId:'test',source:{contactId:'test',etag:'v1',contactData:{photos}}});
test('uses current first photo only',()=>assert.equal(run([{value:'https://img.contactsplus.com/current'},{value:'https://img.fullcontact.com/older'}]).primaryUrl,'https://img.contactsplus.com/current'));
test('absence marker never resurrects secondary photo',()=>{for(const photos of [[],[{type:'absentPhoto'},{value:'https://img.contactsplus.com/old'}]])assert.equal(run(photos).status,'preserve');});
test('missing photo observation is held',()=>assert.equal(run(undefined).status,'hold'));
test('bad primary never falls back',()=>{for(const value of ['bad','http://img.contactsplus.com/x','https://user:pass@img.contactsplus.com/x','https://localhost/x','https://img.contactsplus.com.evil.test/x','https://img.contactsplus.com:8443/x','https://img.contactsplus.com/x#fragment'])assert.equal(run([{value},{value:'https://img.contactsplus.com/old'}]).status,'hold');});
test('exact source and version required',()=>{for(const source of [{contactId:'other',etag:'v1',contactData:{}},{contactId:'test',contactData:{}}])assert.throws(()=>select({sourceContactId:'test',source}));});
