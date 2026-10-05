const test=require('node:test'),assert=require('node:assert/strict'),evidence=require('./bootstrap-evidence');
const url='https://www.linkedin.com/in/alex-example',name={givenName:'Alex',familyName:'Example'};
const card=u=>'BEGIN:VCARD\r\nVERSION:3.0\r\nUID:t\r\nN:Example;Alex;;;\r\nFN:Alex Example\r\nitem1.X-SOCIALPROFILE:'+u+'\r\nEND:VCARD\r\n';
const run=(u=url,n=name,target=u)=>evidence({contactData:{name:n,urls:[{type:'linkedin',value:u}]},existingVcard:card(target)});
test('exact personal profile and name survive differing social metadata',()=>assert.equal(run(),'exact_profile_url_and_name'));
test('homepage, company page, spoof host and URL credentials do not corroborate',()=>{for(const u of ['https://www.linkedin.com/','https://www.linkedin.com/company/example','https://www.linkedin.com.evil.test/in/alex-example','https://user:pass@www.linkedin.com/in/alex-example'])assert.equal(run(u),null);});
test('different profile or name cannot qualify',()=>{assert.equal(run(url,name,url+'2'),null);assert.equal(run(url,{givenName:'Other',familyName:'Example'}),null);});
