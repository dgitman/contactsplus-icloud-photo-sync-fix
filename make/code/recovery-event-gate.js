// Gate before authenticated reads. Only internal prepared receipts qualify.
function recoveryEventGate({event,inbox,mapping,bookUrl}){
 const held=reason=>({eligible:false,reason});
 if(!event||!['contact.added','contact.updated'].includes(event.triggerId)||!event.eventId||!event.data?.contactId)return held('event');
 if(!inbox||!['prepared_shared_fields','photo_write_pending','held_recovery'].includes(inbox.state)||inbox.sourceAccountId!=='contactsplus-primary'||inbox.eventId!==event.eventId||inbox.sourceContactId!==event.data.contactId||inbox.triggerId!==event.triggerId)return held('inbox');
 if(!mapping||mapping.state!=='verified'||mapping.sourceAccountId!=='contactsplus-primary'||mapping.sourceContactId!==event.data.contactId||!/^[A-Za-z0-9_-]{1,128}$/.test(mapping.targetUid||''))return held('mapping');
 if(typeof bookUrl!=='string'||!/^https:\/\/[^\s?#]+\/$/.test(bookUrl)||![mapping.targetUid,Buffer.from(mapping.targetUid).toString('base64')].some(leaf=>mapping.targetHref===bookUrl+leaf+'.vcf'))return held('target_path');
 let receipt;try{receipt=JSON.parse(inbox.writeReceiptJson);}catch{return held('receipt');}
 if(receipt.version!==1||!['shared_update','photo_fill'].includes(receipt.operation)||receipt.eventId!==event.eventId||receipt.sourceContactId!==mapping.sourceContactId||receipt.uid!==mapping.targetUid)return held('receipt_identity');
 if(inbox.state==='prepared_shared_fields'&&receipt.operation!=='shared_update'||inbox.state==='photo_write_pending'&&receipt.operation!=='photo_fill')return held('receipt_operation');
 return {eligible:true};
}
module.exports=recoveryEventGate;
