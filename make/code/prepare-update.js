
// Map inputs as data, never interpolate contact fields into this code.
const source = typeof input.source === "string" ? JSON.parse(input.source) : input.source;
if (!source || source.contactId !== input.sourceContactId) throw new Error("Source identity mismatch");
if (typeof input.targetEtag !== "string" || !/^"[^"\r\n]+"$/.test(input.targetEtag)) throw new Error("Strong target ETag required");
const data = source.contactData;
if (!data || typeof data !== "object") throw new Error("Source data required");
const patch = {};
for (const key of ["name", "notes"]) {
  if (Object.prototype.hasOwnProperty.call(data, key) && data[key] != null) patch[key] = data[key];
}
if (!Object.keys(patch).length) throw new Error("No supported source fields");
const prepared = convert({mode:"patch-name-notes",uid:input.uid,existingVcard:input.existingVcard,contactData:patch});
return {...prepared, beforeVcard:input.existingVcard, targetEtag:input.targetEtag,
  sourceEtag:source.etag, eventId:input.eventId, status:"prepared-only", writesApplied:false};
