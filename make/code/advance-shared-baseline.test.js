const test=require('node:test'),assert=require('node:assert/strict');
const {snapshot,prepareSharedUpdate}=require('./prepare-shared-update'),advance=require('./advance-shared-baseline');
const card='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:test\r\nFN:Test\r\nNOTE:Old\r\nTEL:123\r\nEND:VCARD\r\n';
const old={notes:'Old',phoneNumbers:[{value:'123'}]},source={contactId:'source',contactData:{...old,notes:'New'}};
const baseline=snapshot({sourceContactId:'source',uid:'test',existingVcard:card,contactData:old});
const prepared=prepareSharedUpdate({source,sourceContactId:'source',uid:'test',existingVcard:card.replace('TEL:123','TEL:456'),targetEtag:'"old"',baseline});
const input={source,uid:'test',baseline,updatedFields:prepared.updatedFields,expected:prepared.vcard,actual:prepared.vcard,targetEtag:'"new"'};
test('verified write advances changed field only',()=>{const next=JSON.parse(advance(input).baselineJson);assert.notDeepEqual(next.fields.notes,baseline.fields.notes);assert.deepEqual(next.fields.phoneNumbers,baseline.fields.phoneNumbers);});
test('drift or invalid verification cannot advance baseline',()=>{assert.throws(()=>advance({...input,actual:prepared.vcard.replace('TEL:456','TEL:789')}),/drift/);assert.throws(()=>advance({...input,targetEtag:''}));assert.throws(()=>advance({...input,updatedFields:['photos']}));});
