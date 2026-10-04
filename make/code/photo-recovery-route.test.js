const test=require('node:test'),assert=require('node:assert/strict'),enable=require('../scripts/enable-photo-recovery');
const orig=require('../unified.blueprint.json'),walk=f=>f.flatMap(m=>[m,...(m.routes||[]).flatMap(r=>walk(r.flow))]);
const b=walk(orig.flow).find(x=>x.id===37).mapper.input.some(x=>x.name==='eventId')?orig:enable(orig),at=id=>walk(b.flow).find(x=>x.id===id);
test('photo receipt persisted before conditional photo PUT',()=>{assert.equal(at(38).mapper.data.writeReceiptJson,'{{37.result.writeReceiptJson}}');assert.match(at(37).mapper.codeEditorJavascript,/createPhotoWriteReceipt/);new Function('require','input',at(37).mapper.codeEditorJavascript);});
test('both recovery paths allow photo receipts but remain read only',()=>{for(const n of [0,100]){assert.ok(at(62+n).filter.conditions.some(a=>a.some(c=>c.b==='photo_write_pending')));assert.equal(at(65+n).mapper.method,'get');new Function('require','input',at(66+n).mapper.codeEditorJavascript);assert.match(at(69+n).mapper.data.state,/verified_photo_fill_recovered/);}});
test('sweep selects prepared photo receipts but excludes photo holds',()=>{assert.equal(at(72).parameters.limit,25);assert.deepEqual(at(72).mapper.filter.map(a=>a.find(c=>c.a==='state').b),['prepared_shared_fields','photo_write_pending']);});
test('production photo preparer returns the receipt for its exact outgoing card',()=>{
 const source={contactId:'s',etag:'v1',contactData:{photos:[{value:'https://img.contactsplus.com/current'}]}};
 const card='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:t\r\nFN:Test\r\nEND:VCARD\r\n';
 const baseline=require('./prepare-shared-update').snapshot({sourceContactId:'s',uid:'t',existingVcard:card,contactData:source.contactData});
 const result=new Function('require','input',at(37).mapper.codeEditorJavascript)(require,{source:{statusCode:200,body:{contacts:[source]}},selection:{sourceContactId:'s',sourceEtag:'v1',primaryUrl:source.contactData.photos[0].value},sourceContactId:'s',uid:'t',baseline:JSON.stringify(baseline),card,etag:'"old"',b64:'/9j/2Q==',width:1,height:1,eventId:'e'});
 assert.equal(result.status,'prepared-only');const receipt=JSON.parse(result.writeReceiptJson);assert.equal(receipt.operation,'photo_fill');assert.equal(receipt.expectedHash,require('./shared-write-receipt').cardDigest(result.vcard,'t'));
});
