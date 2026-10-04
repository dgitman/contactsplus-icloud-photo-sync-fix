const test=require('node:test'),assert=require('node:assert/strict'),patch=require('./shared-fields');
const card=(more='')=>'BEGIN:VCARD\r\nVERSION:3.0\r\nUID:test\r\nN:Person;Test;;;\r\nFN:Test Person\r\n'+more+'PHOTO;VALUE=uri:https://example.test/image\r\nX-PRIVATE:keep\r\nEND:VCARD\r\n';
const run=(contactData,more='')=>patch({uid:'test',existingVcard:card(more),contactData});
test('portfolio label corrected while photo and private fields preserved',()=>{const r=run({urls:[{value:'https://example.test/portfolio',type:'Work'}]},'URL;TYPE=HOME:https://example.test/portfolio\r\n');assert.match(r.vcard,/URL;TYPE=WORK:/);assert.match(r.vcard,/PHOTO;VALUE=uri:https:\/\/example.test\/image/);assert.match(r.vcard,/X-PRIVATE:keep/);});
test('does not rewrite equivalent preferred email',()=>assert.equal(run({emails:[{type:'Work',value:'a@example.test'}]},'EMAIL;type=INTERNET;type=WORK;type=pref:a@example.test\r\n').changed,false));
test('only primary job renders; existing photo stays',()=>{const r=run({organizations:[{name:'Primary',title:'Lead'},{name:'Historical',title:'Intern'}],photos:[{value:'https://new.test/photo'}]});assert.match(r.vcard,/ORG:Primary;/);assert.doesNotMatch(r.vcard,/Historical|new.test/);});
test('all URL values and social profiles render',()=>{const r=run({urls:[{type:'linkedin',value:'https://linkedin.com/in/test'},{type:'Work',value:'https://example.test'}]});assert.match(r.vcard,/X-SOCIALPROFILE;TYPE=linkedin:/);assert.match(r.vcard,/URL;TYPE=WORK:/);});
test('custom labels preserve semantics and have no orphan label',()=>{const r=run({emails:[{type:'Custom',value:'a@example.test'}]},'item1.EMAIL:a@example.test\r\nitem1.X-ABLabel:Old\r\n');assert.doesNotMatch(r.vcard,/Label:Old/);assert.match(r.vcard,/X-ABLabel:Custom/);assert.equal(patch({uid:'test',existingVcard:r.vcard,contactData:{emails:[{type:'Custom',value:'a@example.test'}]}}).changed,false);});
test('unmanaged grouped property prevents destructive patch',()=>assert.match(run({emails:[],notes:'new'},'item1.EMAIL:a@example.test\r\nitem1.X-OTHER:keep\r\n').vcard,/item1.X-OTHER:keep/));
test('missing field is not deletion; explicit empty array removes field',()=>{assert.match(run({notes:'new'},'TEL:123\r\n').vcard,/TEL:123/);assert.doesNotMatch(run({phoneNumbers:[]},'TEL:123\r\n').vcard,/TEL:123/);});
test('reject identity mismatch but omit unknown populated fields',()=>{assert.throws(()=>patch({uid:'other',existingVcard:card(),contactData:{notes:'x'}}),/identity/);assert.equal(run({customField:'a'}).changed,false);});
test('address keeps apartment and Unicode escapes',()=>{const r=run({addresses:[{street:'1 Main St',extendedAddress:'Apt 2',city:'Montréal',type:'Home'}]});assert.match(r.vcard,/1 Main St\\nApt 2;Montréal/);});
test('escaped notes cannot inject properties',()=>assert.match(run({notes:'Hello\nEMAIL:evil@example.test'}).vcard,/NOTE:Hello\\nEMAIL:evil/));
test('invalid birthday holds contact',()=>assert.throws(()=>run({birthday:{month:2,day:31}}),/Invalid birthday/));

test('messenger service and URI preserved on no-op',()=>assert.equal(run({ims:[{type:'Messenger',value:'handle'}]},'IMPP;X-SERVICE-TYPE=Messenger;type=pref:x-apple:handle\r\n').changed,false));
test('messenger edit preserves photo and unrelated fields',()=>{const r=run({ims:[{type:'Messenger',value:'new'}]},'IMPP;X-SERVICE-TYPE=Messenger:x-apple:old\r\n');assert.match(r.vcard,/x-apple:new/);assert.doesNotMatch(r.vcard,/x-apple:old/);assert.match(r.vcard,/X-PRIVATE:keep/);});
test('unverified IM services are omitted',()=>assert.equal(run({ims:[{type:'Unknown',value:'handle'}]}).changed,false));
test('related person labels survive a repeated patch',()=>{const d={relatedPeople:[{type:'Spouse',value:'Example Person'}]};const r=run(d);assert.match(r.vcard,/X-ABRELATEDNAMES:Example Person/);assert.match(r.vcard,/X-ABLabel:Spouse/);assert.equal(patch({uid:'test',existingVcard:r.vcard,contactData:d}).changed,false);});
test('yearless birthday keeps Apple omission marker',()=>{const d={birthday:{month:2,day:29}};assert.equal(run(d,'BDAY;X-APPLE-OMIT-YEAR=1604:1604-02-29\r\n').changed,false);assert.match(run(d).vcard,/BDAY;X-APPLE-OMIT-YEAR=1604:1604-02-29/);});
test('actual non-leap years rejected',()=>assert.throws(()=>run({birthday:{year:1900,month:2,day:29}}),/Invalid birthday/));
test('literal 1604 birthday differs from yearless birthday',()=>assert.equal(run({birthday:{year:1604,month:1,day:1}},'BDAY;X-APPLE-OMIT-YEAR=1604:1604-01-01\r\n').changed,true));
test('social username and provider ID map without loss',()=>{
  const data={urls:[{type:'linkedin',value:'https://example.test/profile',username:'Test.User',userId:'AbC123'}]};
  const r=run(data);assert.match(r.vcard,/X-USER=Test.User;X-USERID=AbC123/);
  assert.equal(patch({uid:'test',existingVcard:r.vcard,contactData:data}).changed,false);
  assert.match(r.vcard,/PHOTO;VALUE=uri:/);assert.match(r.vcard,/X-PRIVATE:keep/);
});
test('social parameter order is immaterial but opaque ID case is not',()=>{
  const more='X-SOCIALPROFILE;X-USERID=AbC;X-USER=Test;TYPE=linkedin:https://example.test\r\n';
  const url={type:'linkedin',value:'https://example.test',username:'Test',userId:'AbC'};
  assert.equal(run({urls:[url]},more).changed,false);
  assert.equal(run({urls:[{...url,userId:'abc'}]},more).changed,true);
});
test('unsupported social metadata preserves the whole target group while notes sync',()=>{
 const prior='X-SOCIALPROFILE;TYPE=linkedin:https://example.test/keep\r\n';
 for(const url of [{type:'Unverified',value:'https://example.test',username:'user'},{type:'linkedin',value:'https://example.test',username:'a,b'}]) {
  const r=run({urls:[url],notes:'changed'},prior);
  assert.match(r.vcard,/NOTE:changed/);assert.match(r.vcard,/https:\/\/example.test\/keep/);assert.deepEqual(r.changedFields,['notes']);
 }
});
test('unknown target parameters remain while other fields sync',()=>{
 const r=run({emails:[{value:'new@example.test'}],notes:'changed'},'EMAIL;X-CUSTOM=keep:old@example.test\r\n');
 assert.match(r.vcard,/EMAIL;X-CUSTOM=keep:old@example.test/);assert.deepEqual(r.changedFields,['notes']);
});
test('omitted empty department does not rewrite an equivalent company',()=>{
  for(const org of ['ORG:Example','ORG:Example;','ORG:Example;;;'])
    assert.equal(run({organizations:[{name:'Example'}]},org+'\r\n').changed,false);
});
test('real department and title changes are not formatting equivalence',()=>{
  assert.equal(run({organizations:[{name:'Example'}]},'ORG:Example;Sales\r\n').changed,true);
  assert.equal(run({organizations:[{name:'Example',title:'Lead'}]},'ORG:Example\r\nTITLE:Manager\r\n').changed,true);
});
test('escaped trailing company semicolon remains meaningful',()=>{
  assert.equal(run({organizations:[{name:'Example;'}]},'ORG:Example\\;\r\n').changed,false);
  assert.equal(run({organizations:[{name:'Example'}]},'ORG:Example\\;\r\n').changed,true);
});
test('Mobile and Apple CELL VOICE are equivalent without rewriting the card',()=>{
  const r=run({phoneNumbers:[{type:'Mobile',value:'+1 (202) 555-0123'}]},'TEL;type=CELL;type=VOICE;type=pref:+1 (202) 555-0123\r\n');
  assert.equal(r.changed,false);assert.match(r.vcard,/type=CELL;type=VOICE;type=pref/);
});
test('mobile equivalence never hides number, fax or custom label differences',()=>{
  const data={phoneNumbers:[{type:'Mobile',value:'+12025550123'}]};
  for(const tel of ['TEL;TYPE=CELL,VOICE:+12025550124','TEL;TYPE=CELL,FAX:+12025550123','item1.TEL:+12025550123\r\nitem1.X-ABLabel:Cell'])
    assert.equal(run(data,tel+'\r\n').changed,true);
});
test('malformed social URL leaves working target URLs untouched while notes sync',()=>{
 const r=run({notes:'changed',urls:[{type:'linkedin',value:'https://example.test/invalid space'}]},'URL:https://example.test/working\r\n');
 assert.match(r.vcard,/URL:https:\/\/example.test\/working/);assert.match(r.vcard,/NOTE:changed/);assert.doesNotMatch(r.vcard,/invalid space/);
});
