# vCard conversion for Make Code

This is pure conversion code for the native Make Code JavaScript module. It has
no external dependencies, credentials, network calls, or local runtime service.
It is not connected to the production routes yet.

Paste `vcard.js` into `code:ExecuteCode` (JavaScript, editor input), replacing the
last `module.exports = convert;` line with `return convert(input);`. Pass input
variables `mode`, `uid`, `contactData`, and, for patches, `existingVcard`.
`contactData` accepts an object or JSON string. The result contains `vcard`,
`uid`, and `mode`. Send the vCard with the separately configured HTTP module;
never put credentials in this code.

## Supported scope

- `create`: explicit target UID; structured name, multiple emails, phone numbers,
  standard labels, and notes. Populated unsupported source fields cause an error,
  including photos and addresses. Do not use it to overwrite an existing card.
- `patch-name-notes`: requires an existing vCard 3.0 with the exact target UID.
  Pass only fields intentionally being changed: name and/or notes. All other raw
  properties, including folded PHOTO, labels, and custom properties, are retained.
  Qualified name/note properties are rejected to avoid losing language/group data.
- Text escaping, CRLF output, and UTF-8-aware 75-octet line folding are handled.
- No live duplicate searches are performed. Supplying an existing vCard to patch
  is distinct from searching the address book for duplicate contacts.

Neither mode writes contacts or chooses identities. Updates still need a stored
mapping, a before-image and conditional ETag write. Missing-source fields must not
be interpreted as intentional deletion. Production photo conversion, broader
field mapping, interrupted-write recovery, and full event-to-iCloud tests remain.

## Validation

Run `node --test make/code/vcard.test.js`. Eight cases cover basic creation,
injection/escaping, Unicode folding, unsupported fields/labels, exact identity,
multiple-card rejection, and preservation during targeted edits.

The same converter passed synthetic create and patch assertions in a temporary
Make Code cloud scenario. That scenario was deleted afterward. This verifies the
runtime, not an iCloud save or device display. The main scenario remains inactive.

References: [Make Code](https://apps.make.com/code) and
[vCard 3.0, RFC 2426](https://www.rfc-editor.org/rfc/rfc2426).
