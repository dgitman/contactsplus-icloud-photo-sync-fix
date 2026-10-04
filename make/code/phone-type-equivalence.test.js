const test=require('node:test'),assert=require('node:assert/strict'),patch=require('./shared-fields');
const card=tel=>'BEGIN:VCARD\r\nVERSION:3.0\r\nUID:test\r\n'+tel+'\r\nNOTE:Keep\r\nEND:VCARD\r\n';
const run=(type,tel,value='+1-202-555-0123')=>patch({uid:'test',existingVcard:card(tel),contactData:{phoneNumbers:[{type,value}]}});
test('ordinary Home Work Mobile labels preserve Apple voice representation exactly',()=>{
 for(const [label,type] of [['Home','HOME'],['Work','WORK'],['Mobile','CELL']])for(const head of [`TYPE=${type},VOICE,pref`,`type=${type};TYPE=voice`,`TYPE=VOICE,${type}`]){
  const tel=`TEL;${head}:+1-202-555-0123`,r=run(label,tel);assert.equal(r.changed,false);assert.equal(r.vcard,card(tel));
 }
});
test('fax pager messaging unknown and multiple location types are not conflated',()=>{
 for(const types of ['WORK,VOICE,FAX','WORK,VOICE,PAGER','WORK,VOICE,MSG','WORK,VOICE,X-CUSTOM','WORK,HOME,VOICE','CELL,VOICE,FAX'])assert.equal(run('Work',`TEL;TYPE=${types}:+1-202-555-0123`).changed,true);
});
test('different number or label remains a change',()=>{
 assert.equal(run('Work','TEL;TYPE=HOME,VOICE:+1-202-555-0123').changed,true);
 assert.equal(run('Work','TEL;TYPE=WORK,VOICE:+1-202-555-9999').changed,true);
});
test('custom Apple label is not discarded by voice equivalence',()=>{
 assert.equal(run('Work','item1.TEL;TYPE=WORK,VOICE:+1-202-555-0123\r\nitem1.X-ABLabel:Sales').changed,true);
});
