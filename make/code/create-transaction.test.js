const test=require('node:test'),assert=require('node:assert/strict');
const {creationUid,prepareCreateTransaction:prepare,prepareFirstCreateAttempt:attempt,reconcileCreateTransaction:reconcile}=require('./create-transaction'),{newContactQuery}=require('./new-contact-query');
const source={contactId:'s',etag:'v1',contactData:{name:{givenName:'Test',familyName:'Example'},emails:[{value:'test@example.com'}],notes:'Keep',photos:[]}},event={eventId:'e',triggerId:'contact.added',data:{contactId:'s'}};
const args={source,event,plan:newContactQuery({source,event}),response:{statusCode:207,body:{multistatus:{response:[]}}},sourceAccountId:'test-account',bookUrl:'https://example.test/book/',lookupPolicyEnabled:true,checkedAt:1000,now:1100};
const prepared=prepare(args),reservation=prepared.reservation,first=attempt({prepared,reservation,source,event,now:1200});
test('stable UID depends on scoped contact identity, not event or name',()=>{assert.equal(prepare({...args,event:{...event,eventId:'other'},plan:newContactQuery({source,event:{...event,eventId:'other'}})}).reservation.uid,reservation.uid);assert.notEqual(creationUid('other','s'),reservation.uid);assert.notEqual(creationUid('test-account','other'),reservation.uid);});
test('creation reserves lightweight evidence before preparing a conditional PUT',()=>{assert.equal(prepared.status,'reservation_prepared');assert.equal(first.status,'attempt_marker_prepared');assert.equal(first.request.headers['If-None-Match'],'*');assert.equal(first.attemptedReservation.state,'create_attempted');assert.equal(first.writesAllowed,false);assert.ok(!JSON.stringify(reservation).includes('test@example.com'));assert.ok(!JSON.stringify(reservation).includes('BEGIN:VCARD'));});
test('disabled policy, stale query, existing mapping and deletion tombstone hold',()=>{for(const patch of [{lookupPolicyEnabled:false},{now:61001+1000},{now:0},{existingMapping:{state:'verified'}},{existingMapping:{state:'deleted'}},{existingMapping:{state:'create_attempted'}},{bookUrl:'http://example.test/book/'}])assert.equal(prepare({...args,...patch}).status,'held');});
test('an attempted create can never prepare a second request',()=>{assert.equal(attempt({prepared,reservation:first.attemptedReservation,source,event,now:1300}).status,'held');assert.equal(attempt({prepared,reservation,source:{...source,etag:'v2'},event,now:1300}).status,'held');assert.equal(attempt({prepared:{...prepared,vcard:prepared.vcard.replace('NOTE:Keep','NOTE:Changed')},reservation,source,event,now:1300}).status,'held');});
test('exact readback with revision changes verifies while absence never retries',()=>{const input={reservation:first.attemptedReservation,source,statusCode:200,actual:prepared.vcard.replace('END:VCARD','REV:20261004T000000Z\r\nEND:VCARD'),targetEtag:'"new"'};assert.equal(reconcile(input).status,'verified_create');for(const patch of [{statusCode:404},{statusCode:503},{actual:prepared.vcard.replace('NOTE:Keep','NOTE:Changed')},{actual:prepared.vcard.replace(reservation.uid,'other')},{targetEtag:'W/"new"'},{source:{...source,etag:'v2'}}]){const r=reconcile({...input,...patch});assert.equal(r.status,'held');assert.equal(r.writesAllowed,false);}});
test('undecoded primary image cannot silently disappear',()=>{for(const contactData of [{...source.contactData,photos:[{value:'https://img.contactsplus.com/current'}]}]){const s={...source,contactData};assert.equal(prepare({...args,source:s,plan:newContactQuery({source:s,event})}).status,'held');}});
const {planCreatePhotoRecovery:planPhoto,finishCreatePhotoRecovery:finishPhoto}=require('./create-transaction');
const crypto=require('node:crypto');
const imageBase64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aU1kAAAAASUVORK5CYII=';
const byteHash=crypto.createHash('sha256').update(Buffer.from(imageBase64,'base64')).digest('hex');
const photoSource={...source,contactData:{...source.contactData,photos:[{value:'https://img.contactsplus.com/current'}]}};
const photoPrepared=prepare({...args,source:photoSource,plan:newContactQuery({source:photoSource,event}),photoDownload:{requestedUrl:'https://img.contactsplus.com/current',statusCode:200,imageBase64,decodedImage:{decoded:true,mime:'image/png',width:1,height:1,byteHash}}});
const photoAttempt=attempt({prepared:photoPrepared,reservation:photoPrepared.reservation,source:photoSource,event,now:1200});
const savedUrl='https://gateway.icloud.com/contacts/123/ck/card/test/photo';
const photoActual=photoPrepared.vcard.replace(/\r\n[ \t]/g,'').split('\r\n').map(l=>l.startsWith('PHOTO;')?'PHOTO;VALUE=uri:'+savedUrl:l).join('\r\n');
const recovery={reservation:photoAttempt.attemptedReservation,source:photoSource,statusCode:200,actual:photoActual,targetEtag:'"saved"',photoPathPrefix:'/contacts/123/ck/card/'};
const download={requestedUrl:savedUrl,statusCode:200,decoded:true,width:1,height:1,imageBase64};
test('creation URI photo readback requires original decoded bytes before mapping',()=>{
 assert.equal(photoPrepared.status,'reservation_prepared');
 assert.equal(planPhoto(recovery).status,'uri_photo_download');
 assert.equal(planPhoto(recovery).mapping,undefined);
 const result=finishPhoto({...recovery,download});assert.equal(result.status,'verified_create');assert.equal(result.writesAllowed,false);
 assert.equal(JSON.parse(result.mapping.baselineJson).photoBaseline.sourceContentHash,byteHash);
 assert.equal(reconcile({...recovery,reservation:result.mapping}).status,'verified_create');
});
test('creation photo recovery rejects wrong accounts, grouped photos, changed fields and source',()=>{
 for(const patch of [{actual:photoActual.replace('/123/','/456/')},{actual:photoActual.replace('gateway.icloud.com','example.test')},{actual:photoActual.replace('PHOTO;','item1.PHOTO;')},{actual:photoActual.replace('NOTE:Keep','NOTE:Changed')},{source:{...photoSource,etag:'changed'}},{statusCode:404},{targetEtag:'W/"saved"'},{reservation:{...recovery.reservation,state:'create_reserved'}},{reservation:{...recovery.reservation,photoEvidence:undefined}}])assert.equal(planPhoto({...recovery,...patch}).status,'held');
});
test('creation photo recovery holds failed, redirected, undecoded and altered downloads',()=>{
 for(const patch of [{statusCode:403},{statusCode:302},{requestedUrl:savedUrl+'other'},{decoded:false},{width:2},{imageBase64:'AAAA'},{imageBase64:'!'}])assert.equal(finishPhoto({...recovery,download:{...download,...patch}}).status,'held');
});
test('only a complete source response can establish an omitted primary photo',()=>{const {photos,...contactData}=source.contactData,s={...source,contactData},a={...args,source:s,plan:newContactQuery({source:s,event})};assert.equal(prepare(a).reason,'photos_not_observed');assert.equal(prepare({...a,completeSource:true}).status,'reservation_prepared');});
