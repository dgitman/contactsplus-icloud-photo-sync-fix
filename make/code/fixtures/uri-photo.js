const {snapshot}=require('../prepare-shared-update'),{createPhotoWriteReceipt}=require('../photo-write-receipt');
const b64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aU1kAAAAASUVORK5CYII=';
function fixture(id='synthetic-uri-recovery'){
 const before=`BEGIN:VCARD\r\nVERSION:3.0\r\nUID:${id}\r\nFN:Test\r\nNOTE:Keep\r\nEND:VCARD\r\n`,source={contactId:id,etag:'v1',contactData:{photos:[{value:'https://img.contactsplus.com/current'}]}};
 const baseline=snapshot({sourceContactId:id,uid:id,existingVcard:before,contactData:source.contactData});
 const prepared={status:'prepared-only',sourceContactId:id,sourceEtag:'v1',uid:id,targetEtag:'"old"',width:1,height:1,byteHash:require('crypto').createHash('sha256').update(Buffer.from(b64,'base64')).digest('hex'),vcard:before.replace('END:VCARD','PHOTO;ENCODING=b;TYPE=PNG:'+b64+'\r\nEND:VCARD')};
 const receipt=createPhotoWriteReceipt({prepared,source,baseline,eventId:id,before});
 const url='https://gateway.icloud.com/contacts/123/ck/card/photo.png';
 const actual=before.replace('END:VCARD','PHOTO;VALUE=uri:'+url+'\r\nEND:VCARD');
 return {receipt,eventId:id,sourceContactId:id,uid:id,source,baseline,statusCode:200,actual,targetEtag:'"new"',photoPathPrefix:'/contacts/123/ck/card/',download:{requestedUrl:url,statusCode:200,decoded:true,width:1,height:1,imageBase64:b64},before};
}
module.exports=fixture;
