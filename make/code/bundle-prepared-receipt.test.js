const test=require('node:test'),assert=require('node:assert/strict');
const run=new Function('input','require',require('./bundle-prepared-receipt')());
const {snapshot}=require('./prepare-shared-update');
const card='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:test\r\nNOTE:old\r\nEND:VCARD\r\n';
const baseline=snapshot({sourceContactId:'s',uid:'test',existingVcard:card,contactData:{notes:'old'}});
const input={source:{contactId:'s',etag:'v2',contactData:{notes:'new'}},sourceContactId:'s',uid:'test',eventId:'event',targetEtag:'"before"',existingVcard:card,baseline:JSON.stringify(baseline)};
test('production preparation returns a receipt for the exact prepared write',()=>{const r=run(input,require);assert.equal(r.status,'prepared-only');const receipt=JSON.parse(r.writeReceiptJson);assert.equal(receipt.eventId,'event');assert.equal(receipt.sourceEtag,'v2');assert.equal(receipt.uid,'test');});
test('missing source version or event ID holds before any write',()=>{for(const x of [{...input,eventId:''},{...input,source:{...input.source,etag:''}}]){const r=run(x,require);assert.equal(r.status,'held');assert.equal(r.changed,false);assert.equal(r.vcard,undefined);}});
