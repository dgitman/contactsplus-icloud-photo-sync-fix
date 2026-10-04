# vCard conversion for Make Code

This is pure conversion code for the native Make Code JavaScript module. It has
no external dependencies, credentials, network calls, or local runtime service.
It is connected to the update route for preparation only; writes remain disabled.

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

The adapter prepare-update.js follows the converter with its CommonJS export
removed. Run all tests with `node --test make/code/*.test.js`. The adapter uses
only non-null source name and notes; other target fields stay untouched.
This is not a full-field sync yet.

## No-change handling

The patch converter returns changed=false and the original card bytes when the
requested name/notes already match. It unfolds lines for comparison, treats an
absent note like an empty note, and changes only differing properties. Repeated
managed properties are rejected as ambiguous. Other differences in equivalent
escaping may conservatively count as a change.

The update adapter reports status=unchanged or prepared-only. These are result
values, not persisted event states yet. A future writer must require changed=true;
the current scenario has no writer. This avoids future unnecessary PUTs but does
not eliminate the existing source/target reads or their Make credit usage.
Sixteen tests now cover conversion and preparation, including no-change cases.

## Lightweight synchronization policy

`sync-state.js` is a tested decision library, not yet wired into the deployed
scenario. It stores only hashes of normalized field snapshots, and requires a
baseline before proposing field changes. A changed source field is applied only
if the target still matches its baseline; opposing edits hold the entire contact.
Target-only edits and converged values produce no outgoing patch.

Interrupted operations are resolved by identity and expected-content readback.
No uncertain create/update/delete is automatically repeated. A delete event alone
is insufficient evidence of a standalone deletion when merges can emit deletions;
merge disposition must be known before destructive propagation.

Input normalization and Make integration remain required. Hashes do not replace
identity mapping, field conversion, or image decoding, and object-array ordering
must be normalized by the caller according to each field's semantics.

## Bootstrap matching

`identity.js` is a pure, currently unwired bootstrap matcher. It requires a unique
email or exact international phone with compatible names, or independently unique
email and phone evidence when names differ. Compatible names allow punctuation,
accents, honorifics, omitted middle names and matching middle initials; nicknames
and conflicting complete middle names are not guessed. Shared identifiers alone,
conflicting unique evidence and many-to-one matches remain held. No name-only
matching or phone-suffix guessing is allowed. The caller must verify inventory
completeness. Matching never authorizes deletion.
