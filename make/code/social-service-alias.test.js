const test=require('node:test'),assert=require('node:assert/strict'),patch=require('./shared-fields');
const card=line=>'BEGIN:VCARD\r\nVERSION:3.0\r\nUID:test\r\n'+line+'\r\nNOTE:Keep\r\nEND:VCARD\r\n';
const run=(type,line,extra={})=>patch({uid:'test',existingVcard:card(line),contactData:{urls:[{type,value:`https://${type}.com/example`,username:'example',...extra}]}});
test('observed GitHub and Instagram service aliases preserve the complete card',()=>{
 for(const type of ['github','instagram']){const line=`X-SOCIALPROFILE;TYPE=${type}.com;X-USER=example:https://${type}.com/example`;const r=run(type,line);assert.equal(r.changed,false);assert.equal(r.vcard,card(line));}
});
test('service alias does not hide different URL username or opaque user ID',()=>{
 for(const line of ['X-SOCIALPROFILE;TYPE=github.com;X-USER=other:https://github.com/example','X-SOCIALPROFILE;TYPE=github.com;X-USER=example:https://github.com/other','X-SOCIALPROFILE;TYPE=github.com;X-USER=example;X-USERID=123:https://github.com/example'])assert.equal(run('github',line).changed,true);
});
test('unknown domain aliases and different services remain different',()=>{
 for(const type of ['github.example','www.github.com','github.com.evil','instagram.com'])assert.equal(run('github',`X-SOCIALPROFILE;TYPE=${type};X-USER=example:https://github.com/example`).changed,true);
});
test('service alias never discards a custom label',()=>assert.equal(run('github','item1.X-SOCIALPROFILE;TYPE=github.com;X-USER=example:https://github.com/example\r\nitem1.X-ABLabel:Portfolio').changed,true));
