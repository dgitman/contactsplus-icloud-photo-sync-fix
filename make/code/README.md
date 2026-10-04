# vCard conversion for Make Code

This is pure conversion code for the native Make Code JavaScript module. It has
no external dependencies, credentials, network calls, or local runtime service.
The older name/notes converter is used by the mapped update route. The new shared-field and photo-policy modules are not deployed. See ../launch-blockers.md for deployment status.

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
runtime, not an iCloud save or device display. Listener activation does not establish production synchronization.

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
the deployed route must be assessed separately from these pure modules. This avoids future unnecessary PUTs but does
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


## Photo decision policy (not deployed)

`photo-state.js` accepts fresh observations from the current primary source photo,
a successful image decoder, and target readback. It does not download, decode,
serialize, or write an image. Callers must not supply `decoded` or `readable`
based on a URL, HTTP success, or Apple's image-availability flag alone.

Image content hashes compare decoded/validated image content using the same
hashing convention on both sides. Target property hashes cover PHOTO records
and their grouped metadata. The baseline is bound to both contact IDs.

- A missing primary or failed download, including 403/404, preserves the target.
- Equal image content produces no change, even when its URL rotates.
- A confirmed missing photo can be filled; an independent removal since the
  accepted baseline is held.
- Replacement requires a changed source and unchanged target since baseline.
- Unknown target state, unvalidated images, mismatched identities, and uncertain
  primary selection cannot authorize a write.

A `fill` or `replace` result is only a plan. The cloud adapter still needs fresh
primary selection, decoding, byte embedding, conditional ETag write, delayed
readback, and baseline advancement after successful verification. No local
service is introduced. Run the complete suite with `node --test make/code/*.test.js`.

## Embedded-photo serialization

`embed-photo.js` binds converter output bytes to decoder evidence and embeds PNG
or JPEG bytes in a folded vCard PHOTO property. It preserves other raw fields,
requires exact UID and a strong ETag, and refuses a fill over an existing PHOTO.
Grouped photos and legacy image metadata are held for explicit reconciliation.

The signature check supplements a successful decoder; it is not itself a decoder.
The Make synthetic blueprint uses built-in image conversion and metadata modules,
then passes their output directly to the serializer. Successful conversion and
HTML rejection were verified in Make; see ../launch-blockers.md. The temporary
cloud test was removed. Production image downloads and writes are not wired yet.

## Raw Contacts+ source reader

Production uses `contactsplus:makeAPICall` with `/v1/contacts.get`. The native
Get Contact module can fail while converting a birthday that has no year.
`read-source-response.js` preserves the API object, requires one successful,
versioned contact, and passes it to the existing exact-identity guards. Both
bundles use this reader; direct object inputs remain supported for local tests.

## Social-profile metadata

Supported social URLs include `username` and `userId` as `X-USER` and `X-USERID`.
The serializer preserves case and accepts only tested, delimiter-free parameter
values. Unknown services, unsupported quoting, and unknown target parameters stay
held. A disposable CardDAV create/update/readback/cleanup test verified the
representation before deployment; see the launch verification record.

## Equivalent representations

Comparison treats omitted empty trailing ORG components as equivalent to explicit
empty departments, and standard Mobile as equivalent to Apple's CELL/VOICE type.
Equivalent cards are returned unchanged. Custom labels remain distinct from
standard types; literal escaped semicolons, populated departments, titles, phone
numbers and fax types remain meaningful. This comparison does not infer country
codes, strip phone extensions, or accept actual field differences as a baseline.

## Additions to empty fields

An absent baseline field can receive a supported source value only when the fresh
target field is empty. Existing target data and new photos stay held. Verification
requires the pre-write card as well as exact post-write readback before adding a
field to the baseline. Missing source fields remain held; explicit supported
empty values continue through the existing conflict checks.

## Bootstrap identity evidence

`bootstrap-evidence.js` corroborates previously unique inventory matches using a
shared email or an exact international phone plus exact structured name. It does
not discover uniqueness by itself and must not authorize creation or deletion.
National numbers, inferred country codes, extensions and name-only matches do
not qualify. Full fresh shared-field comparison and target UID/version checks
are still required before installing a mapping. This is bootstrap work, not a
per-event duplicate lookup.
