const test=require('node:test'),assert=require('node:assert/strict');
const read=require('./read-source-response');
const contact={contactId:'source',etag:'version',contactData:{birthday:{month:8,day:22}}};
test('raw API preserves yearless birthday without native date conversion',()=>{
  assert.deepEqual(read({statusCode:200,body:{contacts:[contact]}}),contact);
  assert.deepEqual(read(JSON.stringify({statusCode:200,body:JSON.stringify({contacts:[contact]})})),contact);
});
test('empty, multiple, unsuccessful and incomplete responses are rejected',()=>{
  for(const response of [null,[],{statusCode:403,body:{contacts:[contact]}},
    {statusCode:200,body:{contacts:[]}},{statusCode:200,body:{contacts:[contact,contact]}},
    {statusCode:200,body:{contacts:[{...contact,etag:null}]}}])assert.throws(()=>read(response));
});
