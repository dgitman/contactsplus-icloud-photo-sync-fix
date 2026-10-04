// Apply the same guarded-route change to a fresh live or portable blueprint.
const bundlePrepare=require('../code/bundle-prepared-receipt');
const bundleVerify=require('../code/bundle-shared-verification');
function guardSharedRoutes(blueprint){
  const b=JSON.parse(JSON.stringify(blueprint));
  const eventFlow=b.flow.find(x=>x.id===71)?.routes[0].flow||b.flow;
  const main=eventFlow.find(x=>x.id===60)?.routes[0].flow||eventFlow;
  const mapped=main.find(m=>m.id===200)?.routes[0].flow||main;
  const router=mapped.find(m=>m.id===3);
  if(!router?.routes)throw Error('Expected event router');
  const update=router.routes.find(r=>r.flow.some(m=>m.id===5)).flow;
  const writes=update.find(m=>m.id===30)?.routes.find(r=>r.flow.some(m=>m.id===16)).flow||update;
  const at=id=>{const m=[...update,...writes].find(x=>x.id===id);if(!m)throw Error('Missing update module '+id);return m;};
  // An added event for a known identity is an upsert of that exact target,
  // never permission to create a second iCloud resource.
  router.routes=router.routes.filter(r=>!r.flow.some(m=>m.id===4));
  at(5).filter={name:'Known contact added or updated',conditions:[
    [{a:'{{2.triggerId}}',b:'contact.added',o:'text:equal'}],
    [{a:'{{2.triggerId}}',b:'contact.updated',o:'text:equal'}]
  ]};
  const lookup=main.find(m=>m.id===7),intake=main.find(m=>m.id===10);
  if(!lookup||!intake)throw Error('Expected mapping lookup and event intake');
  lookup.filter={name:'First delivery only',conditions:[[{a:'{{9.exist}}',b:false,o:'boolean:equal'}]]};
  main.splice(main.indexOf(lookup),1);
  main.splice(main.findIndex(m=>m.id===10),0,lookup);
  intake.mapper.data.state='{{if(7.exist; "pending"; "held_needs_identity")}}';
  at(11).module='contactsplus:makeAPICall';
  at(11).mapper={url:'/v1/contacts.get',body:'{"contactIds":["{{8.sourceContactId}}"]}'};
  // Exact source identity is validated by module 13 before any PUT. The GET
  // remains limited to the mapping's configured target address book and UID.
  at(12).filter.conditions[0]=at(12).filter.conditions[0].filter(c=>c.a!=='{{11.contactId}}'&&c.a!=='{{11.statusCode}}');
  at(12).filter.conditions[0].unshift({a:'{{11.statusCode}}',b:200,o:'number:equal'});
  const p=at(13);p.mapper.codeEditorJavascript=bundlePrepare();
  p.mapper.input=p.mapper.input.filter(x=>x.name!=='baseline');p.mapper.input.push({name:'baseline',value:'{{8.baselineJson}}'});
  at(14).mapper.data.state='{{13.result.eventState}}';
  at(14).mapper.data.writeReceiptJson='{{13.result.writeReceiptJson}}';
  at(16).filter={name:'Baseline-approved prepared change only',conditions:[[{a:'{{13.result.changed}}',b:true,o:'boolean:equal'},{a:'{{13.result.status}}',b:'prepared-only',o:'text:equal'}]]};
  at(18).mapper.codeEditorJavascript=bundleVerify();
  at(18).mapper.input=[
    {name:'before',value:'{{12.data}}'},
    {name:'actual',value:'{{17.data}}'},{name:'expected',value:'{{13.result.vcard}}'},
    {name:'targetEtag',value:'{{17.headers.etag}}'},{name:'uid',value:'{{8.targetUid}}'},
    {name:'source',value:'{{`11`}}'},{name:'baseline',value:'{{8.baselineJson}}'},
    {name:'updatedFields',value:'{{13.result.updatedFields}}'}];
  const mapping=JSON.parse(JSON.stringify(at(19)));mapping.id=28;
  mapping.parameters=JSON.parse(JSON.stringify(mapped.find(m=>m.id===8).parameters));
  mapping.mapper={key:'contactsplus-primary:{{2.data.contactId}}',upsert:false,overwriteArrays:false,data:{baselineJson:'{{18.result.baselineJson}}',targetEtag:'{{18.result.targetEtag}}',sourceEtag:'{{13.result.sourceEtag}}',lastEventId:'{{2.eventId}}',lastVerifiedAt:'{{now}}'}};
  if(!writes.some(x=>x.id===28))writes.splice(writes.findIndex(x=>x.id===19),0,mapping);
  else writes[writes.findIndex(x=>x.id===28)]=mapping;
  at(19).mapper.data.state='verified_shared_fields';
  const deletion=router.routes.find(r=>r.flow.some(m=>m.id===6));
  const entry=deletion.flow.find(m=>m.id===6),hold=deletion.flow.find(m=>m.id===27);
  if(!entry)throw Error('Expected deletion route');
  // Preserve the separately verified lifecycle route when refreshing field guards.
  if(hold){hold.mapper.data.state='held_merge_or_delete';deletion.flow=[entry,hold];}
  else if(!deletion.flow.some(m=>m.id===401))throw Error('Unknown deletion route');
  return b;
}
module.exports=guardSharedRoutes;
if(require.main===module){const fs=require('node:fs');const p=process.argv[2];process.stdout.write(JSON.stringify(guardSharedRoutes(JSON.parse(fs.readFileSync(p,'utf8'))),null,2)+'\n');}
