const test=require('node:test'),assert=require('node:assert/strict'),review=require('./review-match-batch');
const card='BEGIN:VCARD\r\nVERSION:3.0\r\nUID:t\r\nFN:Alex Test\r\nN:Test;Alex;;;\r\nEMAIL:alex@example.test\r\nEND:VCARD\r\n';
const source={contactId:'s',etag:'v1',contactData:{name:{givenName:'Alex',familyName:'Test'},emails:[{value:'alex@example.test'}]}};
const target={href:['/book/t.vcf'],propstat:[{status:['HTTP/1.1 200 OK'],prop:[{'address-data':[card],getetag:['"v1"']}]}]};
const args={bookPath:'/book/',candidates:[{sourceId:'s',targetId:'t'}],sourceResponse:{statusCode:200,body:{contacts:[source]}},targetResponse:{statusCode:207,body:{multistatus:{response:[target]}}}};
test('eligible exact pair receives only lightweight baseline',()=>assert.equal(review(args)[0].status,'eligible'));
test('missing source or target stays held',()=>{assert.equal(review({...args,sourceResponse:{statusCode:200,body:{contacts:[]}}})[0].reason,'missing_resource');assert.equal(review({...args,targetResponse:{statusCode:207,body:{multistatus:{response:[]}}}})[0].reason,'missing_resource');});
test('duplicate and foreign responses fail whole batch',()=>{for(const response of [[target,target],[{...target,href:['/foreign/t.vcf']}]] )assert.throws(()=>review({...args,targetResponse:{statusCode:207,body:{multistatus:{response}}}}));});
test('HTTP failure cannot become an empty successful review',()=>assert.throws(()=>review({...args,sourceResponse:{statusCode:403}})));
test('UID mismatch and actual field changes are held',()=>{for(const text of [card.replace('UID:t','UID:other'),card.replace('N:Test;Alex','N:Other;Alex')])assert.equal(review({...args,targetResponse:{statusCode:207,body:{multistatus:{response:[{...target,propstat:[{status:['HTTP/1.1 200 OK'],prop:[{'address-data':[text],getetag:['"v2"']}]}]}]}}}})[0].status,'held');});
test('portable batch bundle compiles and produces same decision',()=>{const code=require('./bundle-match-review')();const bundled=new Function('require',code+';return reviewMatchBatch;')(require);assert.deepEqual(bundled(args),review(args));});
test('explicit enrollment preserves initial differences and guards later independent edits',()=>{
 const modified=structuredClone(args);modified.acceptInitialDifferences=true;
 modified.sourceResponse.body.contacts[0].contactData.notes='source note';
 const r=review(modified)[0];assert.equal(r.status,'eligible');
 const baseline=JSON.parse(r.baselineJson),prepare=require('./prepare-shared-update').prepareSharedUpdate;
 const input={source:modified.sourceResponse.body.contacts[0],sourceContactId:'s',uid:'t',existingVcard:card,targetEtag:'"v1"',baseline};
 assert.equal(prepare(input).status,'unchanged');
 const edited=structuredClone(input);edited.source.contactData.notes='new source note';
 assert.equal(prepare(edited).status,'prepared-only');
 edited.existingVcard=card.replace('END:VCARD','NOTE:independent target note\r\nEND:VCARD');
 assert.equal(prepare(edited).status,'conflict');
});
test('accepting initial differences does not weaken name identity when skipping unsupported fields',()=>{
 const x=structuredClone(args);x.acceptInitialDifferences=true;
 x.sourceResponse.body.contacts[0].contactData.name.givenName='Other';
 assert.equal(review(x)[0].status,'held');
 x.sourceResponse.body.contacts[0].contactData.name.givenName='Alex';
 x.sourceResponse.body.contacts[0].contactData.gender='other';
 assert.equal(review(x)[0].status,'eligible');
});

test('encoded resource basename is distinct from UID and verified against the card',()=>{
 const x=structuredClone(args);x.targetResponse.body.multistatus.response[0].href=['/book/'+Buffer.from('t').toString('base64')+'.vcf'];
 const r=review(x)[0];assert.equal(r.status,'eligible');assert.equal(r.resourceName,'dA==.vcf');
 x.targetResponse.body.multistatus.response[0].propstat[0].prop[0]['address-data']=[card.replace('UID:t','UID:other')];assert.equal(review(x)[0].status,'held');
 x.targetResponse.body.multistatus.response[0].href=['/other/dA==.vcf'];assert.throws(()=>review(x));
});
test('explicit name enrollment requires corroboration and retains both baselines',()=>{
 const x=structuredClone(args);x.acceptInitialDifferences=true;x.acceptCorroboratedNames=true;
 x.sourceResponse.body.contacts[0].contactData.name.givenName='Alex Middle';
 const r=review(x)[0];assert.equal(r.status,'eligible');
 const prepare=require('./prepare-shared-update').prepareSharedUpdate;
 assert.equal(prepare({source:x.sourceResponse.body.contacts[0],sourceContactId:'s',uid:'t',existingVcard:card,targetEtag:'"v1"',baseline:JSON.parse(r.baselineJson)}).status,'unchanged');
 x.sourceResponse.body.contacts[0].contactData.name={givenName:'Someone',familyName:'Else'};assert.equal(review(x)[0].status,'held');
});
