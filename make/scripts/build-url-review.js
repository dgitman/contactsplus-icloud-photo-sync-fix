// Read-only fresh source/target URL evidence using an existing connected audit template.
const {execFileSync}=require('node:child_process'),path=require('node:path');
const args=process.argv.slice(2);if(args.length!==2)throw Error('Private mappings and connected template required');
const b=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'build-historical-audit.js'),...args],{maxBuffer:10*1024*1024}));
const m=b.flow.find(x=>x.id===5),needle='return auditSharedPair({mapping:m,source:ss[0],existingVcard:card});';
if(!m.mapper.codeEditorJavascript.includes(needle))throw Error('Audit builder changed');
m.mapper.codeEditorJavascript=m.mapper.codeEditorJavascript.replace(needle,"return {...auditSharedPair({mapping:m,source:ss[0],existingVcard:card}),sourceUrls:ss[0].contactData.urls,targetUrls:card.replace(/\\r\\n[ \\t]/g,'').split('\\r\\n').filter(l=>/^(?:[^:;.]+\\.)?(URL|X-SOCIALPROFILE|X-ABLabel)[;:]/i.test(l))};");
b.name='Contacts sync — URL difference review';process.stdout.write(JSON.stringify(b,null,2)+'\n');
