const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const verify=new Function('input',fs.readFileSync(__dirname+'/verify-update.js','utf8'));
const card='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:pilot\r\nFN:Test\r\nNOTE:Updated\r\nEMAIL:keep@example.invalid\r\nEND:VCARD\r\n';
test('readback permits server revision metadata and folding',()=>{
 const actual=card.replace('NOTE:Updated','REV:20261004T000000Z\r\nNOTE:Upda\r\n ted');
 assert.equal(verify({actual,expected:card,etag:'"new"'}).verified,true);
});
test('readback refuses changed unrelated fields and missing data',()=>{
 assert.throws(()=>verify({actual:card.replace('keep@','lost@'),expected:card,etag:'"new"'}),/differs/);
 assert.throws(()=>verify({actual:null,expected:card,etag:'"new"'}),/Missing/);
});
test('readback requires a strong current version',()=>{
 for(const etag of ['', 'W/"weak"','"bad\r\n"'])assert.throws(()=>verify({actual:card,expected:card,etag}),/ETag/);
});
