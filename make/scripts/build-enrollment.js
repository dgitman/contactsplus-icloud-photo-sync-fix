// Enroll already-reviewed one-to-one pairs; never writes contact content.
const fs=require('node:fs');
function buildEnrollment({records,storeId}){
 if(!Array.isArray(records)||!records.length||records.length>500)throw Error('Expected 1–500 reviewed mappings');
 if(!Number.isInteger(storeId)||storeId<1)throw Error('Mapping store required');
 const keys=new Set(),uids=new Set();
 for(const {key,data:d} of records){
  if(!d||d.sourceAccountId!=='contactsplus-primary'||key!==d.sourceAccountId+':'+d.sourceContactId||d.state!=='verified')throw Error('Invalid mapping identity');
  if(keys.has(key)||uids.has(d.targetUid))throw Error('Pairs must be one-to-one');keys.add(key);uids.add(d.targetUid);
  const b=JSON.parse(d.baselineJson);
  if(b.version!==1||b.sourceContactId!==d.sourceContactId||b.uid!==d.targetUid||!b.fields)throw Error('Invalid accepted baseline');
  if(![d.targetUid,Buffer.from(d.targetUid).toString('base64')].some(leaf=>d.targetHref.endsWith('/'+leaf+'.vcf'))||!/^"[^"\r\n]+"$/.test(d.targetEtag))throw Error('Missing target evidence');
 }
 const fields=Object.keys(records[0].data);
 if(records.some(r=>JSON.stringify(Object.keys(r.data))!==JSON.stringify(fields)))throw Error('Mixed mapping schemas');
 const batches=[];for(let i=0;i<records.length;i+=100)batches.push({records:records.slice(i,i+100)});
 const code=`const expected=input.expected,actual=input.actual;
 if(!Array.isArray(actual)||actual.length!==expected.length)throw Error('Incomplete mapping readback');
 const seen=new Set();
 for(const r of actual){const e=expected.find(x=>x.key===r.key);if(!e||seen.has(r.key))throw Error('Unexpected readback identity');seen.add(r.key);for(const [k,v] of Object.entries(e.data))if(r.data[k]!==v)throw Error('Mapping readback changed: '+k);}
 return {verified:actual.length,contactWrites:0};`;
 return {name:'Contacts sync — reviewed mapping enrollment',metadata:{version:1,scenario:{sequential:true}},flow:[
 {id:1,module:'builtin:BasicFeeder',version:1,mapper:{array:batches}},
 {id:2,module:'builtin:BasicFeeder',version:1,mapper:{array:'{{1.records}}'}},
 {id:3,module:'datastore:AddRecord',version:1,parameters:{datastore:storeId},mapper:{key:'{{2.key}}',overwrite:false,data:Object.fromEntries(fields.map(k=>[k,'{{2.data.'+k+'}}']))}},
 {id:4,module:'datastore:GetRecord',version:1,parameters:{datastore:storeId},mapper:{key:'{{3.key}}',returnWrapped:false}},
 {id:5,module:'builtin:BasicAggregator',version:1,parameters:{feeder:2},mapper:{key:'{{3.key}}',data:Object.fromEntries(fields.map(k=>[k,'{{4.'+k+'}}']))}},
 {id:6,module:'code:ExecuteCode',version:1,mapper:{language:'javascript',inputFormat:'editor',codeEditorJavascript:code,input:[{name:'expected',value:'{{1.records}}'},{name:'actual',value:'{{5.array}}'}]}},
 {id:7,module:'builtin:BasicAggregator',version:1,parameters:{feeder:1},mapper:{verified:'{{6.result.verified}}'}},
 {id:8,module:'code:ExecuteCode',version:1,mapper:{language:'javascript',inputFormat:'editor',codeEditorJavascript:'return {verified:input.rows.reduce((n,r)=>n+Number(r.verified),0)};',input:[{name:'rows',value:'{{7.array}}'}]}}
 ]};
}
module.exports=buildEnrollment;
if(require.main===module){const [file,start='0',count='500',store]=process.argv.slice(2);const data=JSON.parse(fs.readFileSync(file));process.stdout.write(JSON.stringify(buildEnrollment({records:data.records.slice(Number(start),Number(start)+Number(count)),storeId:Number(store)})));}
