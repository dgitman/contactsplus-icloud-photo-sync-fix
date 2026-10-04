// Read-only cloud transport test; configure the custom CardDAV connection on import.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..','code');
const state=fs.readFileSync(path.join(root,'sync-state.js'),'utf8').split('function planFields')[0];
const query=fs.readFileSync(path.join(root,'new-contact-query.js'),'utf8').replace("const {hash}=require('./sync-state');",'').replace(/^module.exports=.*$/m,'');
const bundle=state+'\n'+query;
const fixture="const source={contactId:'synthetic-query-only',etag:'test',contactData:{name:{givenName:'Codex',familyName:'NoSuchContactQuery7b839cae'},emails:[{value:'codex-query-7b839cae@example.invalid'}]}};const event={eventId:'query-pilot',triggerId:'contact.updated',data:{contactId:source.contactId}};";
const code=(id,body,input=[])=>({id,module:'code:ExecuteCode',version:1,mapper:{language:'javascript',inputFormat:'editor',input,codeEditorJavascript:body}});
const bp={name:'Read-only duplicate-query pilot',metadata:{version:1},flow:[code(1,bundle+fixture+'return duplicateContactQuery({source,event});'),{id:2,module:'app#icloud-carddav-sync-ctnuju:queryAddressBook',version:1,parameters:{},mapper:{method:'REPORT',body:'{{1.result.query}}'}},code(3,bundle+fixture+"const result=reviewDuplicateContactQuery({plan:input.plan,response:{statusCode:input.statusCode,body:input.body},source,event});return {result,statusCode:input.statusCode,bodyKeys:Object.keys(input.body||{})};",[{name:'plan',value:'{{1.result}}'},{name:'statusCode',value:'{{2.statusCode}}'},{name:'body',value:'{{2.body}}'}])]};
if(require.main===module)process.stdout.write(JSON.stringify(bp,null,2)+'\n');
module.exports=bp;
