const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const prepare = new Function('input',fs.readFileSync(__dirname+'/vcard.js','utf8').replace('module.exports = convert;', '') + fs.readFileSync(__dirname+'/prepare-update.js','utf8'));
const card='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:test-uid\r\nN:Person;Old;;;\r\nFN:Old Person\r\nNOTE:Keep this\r\nPHOTO;VALUE=URI:https://example.invalid/photo\r\nEND:VCARD\r\n';
const sample={source:{contactId:'source-test',etag:'source-version',contactData:{name:{givenName:'New'},emails:[{value:'ignored@example.invalid'}]}},sourceContactId:'source-test',uid:'test-uid',existingVcard:card,targetEtag:'"target-version"',eventId:'event-test'};
test('prepare only with before image and original ETag',()=>{const r=prepare(sample);assert.equal(r.writesApplied,false);assert.equal(r.beforeVcard,card);assert.equal(r.targetEtag,sample.targetEtag);assert.ok(r.vcard.includes('FN:New\r\n'));assert.ok(r.vcard.includes('NOTE:Keep this\r\n'));assert.ok(r.vcard.includes('PHOTO;VALUE=URI:'));});
test('explicit empty notes clears notes; absent notes preserves them',()=>{const r=prepare({...sample,source:{...sample.source,contactData:{notes:''}}});assert.ok(r.vcard.includes('NOTE:\r\n'));});
test('mismatched source and missing or weak ETags stop preparation',()=>{for(const patch of [{sourceContactId:'wrong'},{targetEtag:''},{targetEtag:'W/"version"'}])assert.throws(()=>prepare({...sample,...patch}));});
