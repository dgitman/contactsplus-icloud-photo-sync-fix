const test=require('node:test'),assert=require('node:assert/strict');
const bundle=require('./bundle-photo-fill');
test('cloud photo bundle compiles and selects without local imports',()=>{
 const code=bundle();assert.doesNotMatch(code,/require\('\.\//);
 const select=new Function('require',code+';return selectPrimaryPhoto;')(require);
 assert.equal(select({sourceContactId:'s',source:{contactId:'s',etag:'v1',contactData:{photos:[]}}}).status,'preserve');
});
