const test=require('node:test'),assert=require('node:assert/strict');
const {splitCode}=require('../scripts/combine-create-preparation'),{walk}=require('../scripts/optimize-credit-steps');
const ms=new Map(walk(require('../unified.blueprint.json').flow).map(m=>[m.id,m]));
const code=ms.get(223).mapper.codeEditorJavascript,[phase,prepare]=splitCode(code);
const run=(code,input)=>new Function('input','require','Date',code)(input,require,{now:()=>1000});
test('combined creation matches separate decisions for no-photo, photo, duplicates and failures',()=>{
 const {newContactQuery}=require('./new-contact-query');
 const event={eventId:'e',triggerId:'contact.added',data:{contactId:'s'}};
 for(const photos of [[],undefined,[{value:'https://example.com/photo.jpg',isPrimary:true}]]){
 const contactData={name:{givenName:'Test',familyName:'Example'},emails:[{value:'test@example.com'}]};if(photos!==undefined)contactData.photos=photos;
 const source={contactId:'s',etag:'v1',contactData},plan=newContactQuery({source,event});
 for(const response of [{statusCode:207,body:{multistatus:{response:[]}}},{statusCode:403},{statusCode:207,body:{multistatus:{response:[{href:['/book/existing.vcf']}]}}}]){
 const input={source,event,plan,response,sourceAccountId:'test',bookUrl:'https://example.test/book/'};
 const expected=run(phase,input);if(expected.status==='no_photo')expected.prepared=run(prepare,input);assert.deepEqual(run(code,input),expected);
 }}
});
test('creation reservation gate and conditional writes remain',()=>{
 assert.ok(!ms.has(204));for(const group of ms.get(206).filter.conditions){assert.ok(group.some(c=>c.a==='{{223.result.status}}'&&c.b==='no_photo'));assert.ok(group.some(c=>c.a==='{{223.result.prepared.status}}'&&c.b==='reservation_prepared'));}
 for(const id of [215,315])assert.ok(ms.get(id).mapper.headers.some(h=>h.name==='If-None-Match'&&h.value==='*'));
});
