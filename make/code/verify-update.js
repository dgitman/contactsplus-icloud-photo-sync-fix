function canonical(card) { if(typeof card!=="string") throw Error("Missing readback");return card.replace(/\r\n[ \t]/g,"").split(/\r?\n/).filter(x=>x&&!/^(REV|PRODID):/.test(x)).sort(); }
if(JSON.stringify(canonical(input.actual))!==JSON.stringify(canonical(input.expected)))throw Error("Target readback differs from prepared card; do not retry write");
if(!/^"[^"\r\n]+"$/.test(input.etag))throw Error("Missing strong readback ETag");
return {verified:true,targetEtag:input.etag};
