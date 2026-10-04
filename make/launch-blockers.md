# Launch verification status

The Make-only production lifecycle is active as of October 4, 2026: eligible
creation (including photos), verified mapped shared-field updates, guarded photo
fills/replacements, confirmed deletion, and read-only interrupted-write recovery.
The newest verification evidence is at the end; older sections describe historical
implementation stages, not the current enabled state.

This is event-driven synchronization, not a claim that every historical record is
identical. There are 5,380 accepted existing mappings. Ambiguous/unmapped identities,
unsupported fields, mixed photo/text changes and independent target edits remain
held rather than guessed or overwritten. New-contact creation requires a structured
name and email and a successful bounded duplicate query.

## Verified transport

The standard HTTP module rejected REPORT before network dispatch. The private
Make custom connector subsequently authenticated and returned HTTP 207 with a
valid DAV multistatus for an exact-name disposable-contact query. This establishes
a Make-only CardDAV query route. No local worker or AWS helper is required.

Detailed execution logging is enabled at the user's request; authorization headers
remain sanitized. The user specifically authorized both source and target inventories in Make logs.
The iCloud inventory completed with 7,433 unique contact resources using bounded
multiget reads. Contacts+ pagination completed with 7,139 unique records. Refined matching produced
6,009 candidates, 311 name conflicts, 47 ambiguous cases, and 772 unmatched records.
Of the unmatched records, 645 have neither email nor phone. Candidates remain private
and are not yet activated as production mappings.

## Operational boundaries and follow-up improvements

- All three event types are active. Retired IDs after a merge use the deletion
  route only when the exact source is absent and the mapped target version and
  per-field baselines are unchanged. The workflow does not guess a merge survivor
  or merge existing ambiguous records itself.
- Create/delete receipt recovery is read-only on redelivery and in the bounded
  on-demand pending sweep. Uncertain writes remain held; no blind automatic retry.
- Expand accepted identity mappings and field coverage separately. Held cases do
  not prevent verified contacts from syncing.
- Event-store automated retention/capacity alerts are a future operational
  improvement. At launch the inbox was under 1% of its 1 MB capacity, with no
  queued webhook deliveries. Completed test records were removed.
- Full per-contact backups remain omitted under the user's storage policy.

## Shared-field preparation (local, not deployed)

`code/shared-fields.js` prepares text-field updates for names/nicknames, notes,
email/phone labels, addresses, ordinary/social URLs without extra profile metadata,
primary organization/title, birthdays, Messenger handles, and related people.
Yearless birthdays retain Apple's omit-year marker. Alternate jobs are intentionally
excluded. Existing photos and unrelated vCard properties are preserved.

`code/prepare-shared-update.js` binds per-field source/target hashes to both contact
IDs. An explicitly accepted baseline is required. Source-only edits can prepare an
update; independent target edits are preserved; competing edits, newly present or
missing fields, and photo changes hold the contact. Baselines are never advanced
by preparation: conditional write and verified readback must precede that step.

These modules are not connected to the live Make scenario. Anniversary/custom
dates, other messaging services, social username/user-ID metadata, custom fields,
list/tag synchronization, and primary-photo replacement still need implementation
or explicit handling. The local tests do not establish cloud deployment or
end-to-end synchronization.


The pure photo policy now covers unavailable sources, content comparisons,
identity-bound replacement baselines, and target-side changes. All 87 local tests
pass. This is decision logic only: photo download/decoding, vCard embedding and
cloud end-to-end verification remain outstanding, and no production photo writes
have been enabled by this change.

## Cloud image conversion verified

On October 4, a temporary Make-only synthetic test converted a 2x2 PNG to JPEG
using `image:Convert`, confirmed dimensions with `image:ExtractMetadata`, and ran
`embed-photo.js` in Make Code. It embedded the exact 286 output bytes as folded
base64 PHOTO data and preserved the non-photo fields. Execution
`f3aabce3b58a4266b6b167aed141ddfb` succeeded. A separate HTML-error-page fixture
was rejected at conversion (`16240f1d9e9149a184b3746dbd88d96c`), before preparation.
The temporary scenario was deleted after verification.

The credential-free test blueprint is `photo-conversion-test.blueprint.json`.
It declares a text output named `result` when imported as an on-demand scenario.
It contains no contact writes. `embed-photo.js` requires decoder evidence bound to
the converted bytes, exact target identity and a strong ETag. Grouped/ambiguous
PHOTO and legacy image metadata remain held. All 93 local tests pass.

This verifies cloud conversion and serialization, not primary-photo selection,
HTTP download, pixel-equivalence normalization, iCloud save/readback or production
integration. Those remain launch requirements.

## Disposable iCloud photo lifecycle verified

On October 4, Make created a uniquely identified disposable contact with embedded
JPEG bytes using `If-None-Match: *` (HTTP 201). CardDAV readback returned an
Apple-hosted PHOTO URI rather than inline base64. An unauthenticated image fetch
returned Unauthorized; the existing Apple Basic Auth connection successfully
retrieved the saved image. Make decoded it and verified its SHA-256 matched the
exact uploaded 286-byte JPEG, with the expected 2x2 dimensions. Notes and UID
were preserved. A conditional DELETE using the fresh target ETag succeeded, and
subsequent GET returned 404. The temporary scenario was then deleted.

Create execution: `25071f0b60d543ad86b35a29652166e7`.
Verified image readback and cleanup: `6a051ab0a6ee4d6d972e87e44045975a`.
Account-specific blueprints and evidence remain private, outside the repository.

An Apple-hosted PHOTO URI is not itself a missing/broken image. Production photo
verification must retrieve and decode supported Apple photo references with the
appropriate connection; it must not classify every URL as a failed photo. Never
send Apple credentials to arbitrary source-photo hosts.

This verifies a Make-to-iCloud disposable create/photo/read/delete transport test.
It does not verify a Contacts+ event, primary-photo selection, existing-contact
replacement, merge handling, device display, or full production synchronization.

## Existing-contact photo replacement verified

Make execution `594c3752e03d4529bed6ccca0d337037` completed the disposable
replacement test on October 4. It created a contact with a 2x2 JPEG, read its
current vCard/ETag, then replaced the photo with a distinct 4x3 JPEG using
`If-Match`. Authenticated download of the new Apple-hosted image matched the
uploaded bytes exactly and decoded with the expected dimensions.

The comparison preserved every non-PHOTO vCard line, allowing only server REV
and PRODID differences. A deliberate write with the old ETag returned 412,
confirming stale-write protection. Conditional deletion succeeded and GET 404
confirmed cleanup. The temporary scenario was removed. Full account-specific
blueprint and execution evidence remain private outside Git.

This verifies replacement transport and serialization on a disposable contact.
Production source-photo selection, event routing, baseline integration, mapping
installation, and merge/echo behavior remain separate unverified launch work.

## Guarded event routes deployed October 4

The main event scenario now uses the bundled shared-field preparation code and
requires `baselineJson` on an otherwise verified identity mapping. Missing
baselines, conflicts and invalid/unsupported data record held event states.
Conditional PUT is gated on both `changed=true` and `status=prepared-only`.
Verified readback advances hashes for only the fields actually updated; unrelated
target edits retain their previous baseline and remain protected.

The prior direct deletion route has been removed. Mapped deletion events record
`held_merge_or_delete` without any target HTTP call. Standalone deletion and merge
reconciliation must be resolved before deletion propagation is implemented.

Make cloud guard test `08f6676ff3d746979969a4142c352aed` passed four preparation
cases. Test `d14b71ddf7704cfd8e7de3e820810e3a` verified baseline advancement and
rejected drift. Temporary test scenario removed. The deployed blueprint was read
back to confirm baseline input, conditional-write gate, baseline update order,
and absence of HTTP calls on the delete branch. The portable blueprint mirrors
these changes. All 101 local tests pass.

Mapping storage was confirmed empty before deployment. Full synchronization is
still not enabled: mapping/baseline bootstrap, event-to-contact pilot, primary
photo integration, create/echo handling, merge resolution and retained-event
processing remain. The stored mapping schema now includes optional baselineJson;
capacity must be addressed before loading thousands of records.

## Real Contacts+ event pilot verified

On October 4, a disposable source contact was created in Contacts+, paired with
an explicitly created iCloud test contact, and given a verified mapping/baseline.
A real Contacts+ notes edit triggered the main scenario automatically. Execution
`1aed0d1a1de143f5801e41f2629bb115` completed conditional iCloud update, exact
readback, stored baseline advancement, and `verified_shared_fields` inbox state.
A subsequent independent GET confirmed the updated notes on the mapped target.

Deleting the disposable Contacts+ source triggered execution
`7823cd3e7222434a929a091b4cead072`. It recorded `held_merge_or_delete` and made no
HTTP request to iCloud; the iCloud test contact remained present. Source deletion
was verified through an empty contacts.get result. Explicit conditional cleanup
of the iCloud test contact returned 404 on follow-up GET, in execution
`7a2cb714fb2e4ce5bed9e05fa49d43a8`.

Private evidence was retained before removing the disposable mapping, its three
inbox records, and temporary scenario. The production mapping store is empty
again. This is a real event-to-target update test, not merely a synthetic webhook.
It does not yet establish create propagation, photo-event integration, merge
reconciliation, broad mapping installation, or automatic held-event recovery.

## Limited production update rollout enabled

On October 4, fresh Contacts+ and exact iCloud reads reviewed ten strongly matched
candidates. Nine passed; one remained held for a phone-field difference. Five of
the passing candidates now have verified mappings and per-field baselines in the
production store. Each inserted record was read back and compared. The main
webhook scenario is active and not paused. Supported shared-field updates for
these five contacts are live; full address-book synchronization is not live.

The review accepted an empty iCloud FN only when its structured N line exactly
matched the generated source N line and there were no other shared-field
differences. It did not rewrite contact names. Baselines use the actual target
state, so this formatting difference alone does not cause an update. Fresh source
identity, email evidence, exact target UID and strong ETag were checked as well.

Review execution `871d891ab7664081992bf4916b4fba10` completed without contact
writes. Private candidate details and baseline evidence remain outside Git. The
temporary review scenario was deleted after verification.

New-contact creation, photo-event integration, merge/deletion propagation, wider
mapping bootstrap and pending-event recovery remain outstanding. Existing guards
continue to hold conflicting or unsupported changes. Increase and verify mapping
store capacity before a broad rollout; the current store is only 1 MB.

## Expanded rollout and yearless-birthday reader fix

The limited rollout now has 17 verified mappings. A fresh read-only batch of 50
additional candidates admitted 12: 18 differed in shared fields, 10 required
unsupported social-profile metadata, and 10 lacked the required email evidence.
Held candidates were not mapped or modified. All 12 inserted mappings and their
baselines were read back and compared. No contact content was written in this
bootstrap batch. Review execution: `11adc3eb67c74e6ea34d101cdaac7977`.

The initial review exposed a native Contacts+ Get Contact module failure on a
yearless birthday (`parseContactsOutputDates`). The production reader now calls
`/v1/contacts.get` through the existing Contacts+ connection instead, preserving
the raw birthday object. It requires HTTP 200 and exactly one versioned source
contact; preparation still checks the exact mapped source ID before any write.
Configured target URL/UID checks, conditional PUT, readback verification, and
deletion holds remain in place. Source ETag persistence uses the validated
preparation result. Both preparation and readback accept the raw API envelope.

The replacement reader completed all 50 real reads. Make test execution
`2a9f3b3551b0489d97f41b114909e05a` verified preparation, baseline advancement,
yearless-birthday preservation, and rejection of missing/wrong source identities
using synthetic cards without writes. All 106 local tests pass. The deployed
configuration was read back and compared; the main scenario remains active.
The temporary review/test scenario was removed. Full synchronization still has
the outstanding work listed above.

## Social-profile metadata deployed

Social URLs for supported services now retain Contacts+ username and userId in
iCloud X-USER and X-USERID parameters. Parameter values retain exact case;
unverified services and values requiring unsupported quoting remain held.
Unknown target metadata still prevents a destructive replacement.

A disposable iCloud contact verified initial metadata roundtrip, conditional
update, exact readback of the changed card with unrelated fields intact, and
conditional cleanup followed by 404. Execution:
`ba5481ff467f4cae97929decb6168866`. This is CardDAV verification, not an iCloud
web-interface visual check. All 108 local tests pass, including injection guards.

Fresh review of ten previously held contacts completed in
`44a6bb2206634d8cb85f9e88c7dc0a35`. One now matched and was enabled after mapping
readback, bringing the limited rollout to 18 contacts. Six still differed in
shared fields; two used unverified social-service mappings; one required
unsupported parameter encoding. Their content was not modified. The new converter
and portable blueprint are deployed, the main scenario remains active, and the
temporary scenario and disposable test contact have been removed.

## Added-event routing and identity holds deployed

Known, verified contact.added events now use the same guarded update path as
contact.updated. They never create another target resource. Unknown added,
updated and deleted events receive `held_needs_identity` after mapping lookup,
before any Contacts+ or iCloud request. Duplicate delivery stops before that
lookup. Automatic creation remains disabled: the inspected API contactMetadata
does not reliably distinguish an iCloud import from a genuinely new source card.

Live synthetic webhook execution `1ab02114db6f4e71b835f844e0377e73` exercised an
added event for an existing verified mapping plus three unknown-identity events.
The known card was freshly read and recorded unchanged; the three unknown events
were held. No PUT or DELETE ran. Duplicate execution
`b8a3258e635c43efab06179f4a8dcf24` performed only webhook intake/iteration and
event-existence checks. Test inbox records were read back and removed after
private evidence was saved. These are synthetic routing tests, not evidence of
a natural provider import cycle. All 110 local tests pass; 18 real mappings remain
enabled for the limited update rollout.

## Formatting equivalence expands coverage to 31 contacts

Fresh comparison identified two representation-only differences: an omitted empty
department in ORG, and standard Mobile versus Apple's CELL/VOICE phone types.
The converter now recognizes these without rewriting equivalent cards. Escaped
literal semicolons, populated departments, titles, phone values, fax types and
custom labels remain distinct. Field baselines still hash actual stored content;
this does not waive independent-edit conflict checks.

Read-only execution `a3e74081b1d24896ad1062e14b1e2f19` rechecked 18 previously
held candidates. Thirteen passed and their mapping/baseline records were inserted
and verified by readback, bringing limited coverage to 31. Five remained held
for address, name/phone, name/email or URL differences. No contact content was
changed during bootstrap. Both deployed code bundles were read back exactly,
the main scenario remains active, and the temporary review scenario was deleted.
All 115 local tests pass, including negative cases for real data differences.

## Empty-field additions enabled for mapped contacts

A supported source field absent from the accepted baseline can now be added
when a fresh target snapshot has no corresponding property or grouped metadata.
Existing target values remain conflicts. Photo additions are excluded and missing
source fields still do not imply deletion. Updates retain the current If-Match
guard. A new field baseline is accepted only after exact readback and verification
that the pre-write target field was empty; other field baselines are preserved.

Disposable iCloud execution `d616b1bc220a449d84208c24a397734b` added an email,
verified the resulting card and baseline advancement, checked rejection of a
pre-existing target email, and completed conditional deletion plus 404 readback.
This tested CardDAV directly, not a natural Contacts+ event or web UI display.
All 118 local tests pass. The two deployed code bundles and pre-write evidence
input were read back; the 31-contact rollout remains active. The disposable
contact and temporary scenario were removed. Full photo/create/delete support
and wider identity bootstrap remain outstanding.

## Larger verified batch: 80 contacts live

Read-only execution `9de8274308fc4d378dc79effaecd4ef9` completed fresh source and
target checks for 200 additional strong historical match candidates. Forty-nine
passed the current identity and shared-field comparison gates. All 49 mapping
and baseline records were inserted and verified by readback, bringing the limited
live rollout to 80 contacts. No contact content was written during this review.

The other 151 remained held: 104 shared-field differences, 36 without the required
email evidence, seven unverified social-service mappings, three unsupported
social parameter values, and one unsupported dates field. Private candidate IDs,
baselines and detailed outcomes remain outside Git. The temporary scenario was
removed; the main scenario was confirmed active and unpaused. Mapping storage is
106,913 bytes of its 1 MiB allocation, so this batch fits without changing storage.
This expands coverage of supported updates, not photo/create/delete functionality.

## Phone-based corroboration: 94 contacts live

The read-only bootstrap gate now supports a shared international phone plus exact
structured name when email is absent. All 46 candidates were first checked against
the prior globally unique match inventory. No inferred country codes, extensions,
national-number guesses or name-only matches were accepted. Existing full-field,
UID and version checks still apply. No per-event duplicate lookup was added.

Execution `973e8b98e3454ae5b1c0e872657ed841` freshly reviewed all 46 candidates.
Fourteen passed and their mappings/baselines were installed and read back exactly,
bringing coverage to 94. The other 32 had shared-field differences and stayed held.
No contact content was changed. Private evidence was preserved and the temporary
review scenario was removed. All 121 local tests pass. This improves identity
coverage without enabling the unfinished photo/create/delete operations.

## Primary-photo selection and cloud policy verification

Contacts+ documents the first photo as primary. `select-primary-photo.js` validates
fresh exact source identity/version and selects only that entry. Empty photos or
an `absentPhoto` primary preserve the target; missing observations, invalid URLs,
and unverified hosts hold. There is no fallback to an older secondary image.
Source downloads must be unauthenticated and restricted to the observed Contacts+
image hosts. See https://www.contactsplus.com/developers/contacts-api/.

Cloud execution `820123c69dfd416080a92502bc73d729` exercised selection and photo
policy with synthetic source observations and a disposable real iCloud contact.
An unavailable source, absent baseline, and changed target were blocked before
writing. A permitted replacement was read back with exact image bytes, decoded
4x3 dimensions, unchanged non-photo fields, and stale-write rejection. The test
contact was deleted and absence verified; the temporary scenario was removed.
All 126 local tests pass. Private execution evidence stays outside Git.

This does not yet enable production photo updates: fresh source downloading,
target-photo observation, durable photo baselines and event-route integration
still need to be connected. The existing 94-contact shared-field rollout remains
active. Automatic creation and deletion remain held.

## Full missing-photo pipeline verified in Make

Execution `afc046f69f7645f396b80ac38ea05b73` fetched a fresh Contacts+ primary
photo without Apple authentication, converted and decoded it, reread the source
version, and filled a disposable iCloud contact using a conditional PUT. It then
downloaded iCloud's authenticated photo resource and verified exact saved bytes,
decoded dimensions, and all non-photo fields. Verification produced a lightweight
photo baseline. The disposable target was deleted and GET returned 404; the
source contact was read only. The temporary scenario was removed.

`prepare-photo-fill.js` refuses existing photos (including URI photos), legacy
photo metadata, changed source versions, invalid decode evidence and drift on
readback. `bundle-photo-fill.js` supplies the tested Make code. The portable
`photo-fill-test.blueprint.json` requires a test source ID, iCloud endpoint/account,
and existing Make connections before use. It is a disposable integration test,
not an active production scenario; it creates and deletes one test target.

Production mapping persistence and event routing for these photo results remain
unconnected. The 94-contact shared-field rollout remains active; photos, automatic
creation and deletion are not fully live. Private source data and execution
blueprints remain outside Git. Local validation: 132 tests pass.

## Missing-photo event route enabled for accepted mappings

The live scenario now fills missing photos for the 94 accepted mappings. The route
requires an exact fresh source, unchanged non-photo source fields, an empty target
photo, and no independent target photo removal since baseline. Mixed edits,
existing photos and inaccessible source images remain held. It rechecks source
and target after download, uses If-Match, verifies saved bytes and non-photo fields,
and advances only the photo baseline in Make's mapping store.

The disposable route test exposed and fixed a nested expression that read bytes
from the wrong module. The saved image was reconciled without another photo PUT.
Verification execution `3e681ec92b57401aaf0f4ac3e0395e48` verified exact image
readback, persisted baseline readback, and target deletion (404). Temporary mapping,
inbox record and scenario were removed. A failed Make run rolled back its store
inserts but not its external iCloud write; this evidence reinforces the existing
rule against blind retries. The fill route's fresh existing-photo guard prevents
a repeated write after such an interruption. Automatic reconciliation is not yet
implemented.

The deployed scenario was read back active and unpaused with the photo route
present. Portable blueprint and route builder are in the repository; all 140
local tests pass. This is limited missing-photo support, not replacement of existing
images, full address-book coverage, or automatic creation/deletion.

## Expanded read-only review: 101 contacts live

Execution `1966e886a442484d986b268d301048c5` freshly checked another 200 prior
unique source/target pairs. Seven passed current identifier, full shared-field,
UID and version checks. Their accepted mappings were added without changing
contact contents. Execution `a7c0b4f383e1408299a5b580db786889` read back and
verified all seven records, bringing the active coverage from 94 to 101.

The other 193 remain held: 191 shared-field differences and two social metadata
mappings that are not supported. No matching safeguard was relaxed. The mapping
store uses 136,272 of 1,048,576 bytes. The main scenario was confirmed active and
unpaused, and the temporary review scenario was deleted. Detailed candidate and
readback evidence remains private, outside Git. No runtime code changed.

## Blank display-name equivalence: 241 contacts live

Fresh diagnosis found iCloud cards with an empty FN but an exact structured N.
The comparator now preserves this representation only for a single exact,
unparameterized N/FN pair with no ancillary grouped metadata. Different name
components, nonempty different display names, duplicate fields and unknown
parameters do not receive this exception. No identity rule was weakened.

Execution `d50ca1a7c8fe43b2962af194288cb2df` freshly rechecked all 144 name-held
records from the preceding batch. 140 passed all supported-field and identifier
checks. Four remain held for actual name, phone, URL or address differences.
Registration and final readback (`81aa0c45df2b4f7c86c9aa40c879891a`,
`362c2c4eb5d142d1abb011dc6a69ffb9`) confirmed all 140 mappings. Live coverage is
241, with 296,371 bytes used in the 1 MiB mapping store. Contact contents were not
changed. The comparator is deployed, the main scenario is active and unpaused,
and the temporary review scenario was deleted. All 144 tests pass. Private
candidate evidence is retained outside Git.

## Batched bootstrap: 592 contacts live

`review-match-batch.js` reviews at most 100 previously unique pairs using a
Contacts+ multi-ID fetch and iCloud addressbook-multiget. It validates complete
response envelopes, expected resource paths, unique source/target responses,
UIDs, versions, strong identity evidence and every supported shared field.
Missing resources and actual differences remain held. The portable
`batch-review.blueprint.json` requires existing connections, accepted candidates
and the configured account book path; it is read-only and is not a recurring job.

Executions `f23de9f42dc549679ccfc40f6ae38e67` and
`a9791dffd3664d0a818e595cb2d5dee1` freshly checked 500 candidates in five batches,
using 27 review credits total. 351 passed. Registration execution
`97adadd0d9ad4611a1bab835fb7b205b` inserted and read back those mappings; all 351
readbacks matched their expected fields exactly. This registration/readback used
1,054 additional credits. Active coverage is now 592. Contact contents were not
changed. The 149 held contacts comprise 139 shared-field differences, eight
unsupported social metadata cases, one unsafe social parameter and one unsupported
gender field.

The mapping store now uses 670,838 of 1,048,576 bytes; check capacity before the
next expansion. The main scenario remains active and unpaused. The temporary
review scenario was deleted, private evidence preserved outside Git, and all 150
local tests pass. Existing-photo replacement and automatic creation/deletion
remain held.

## Further batched bootstrap: 1,228 contacts live

Execution `d3b975d56cba4c28bf9b4d593645ed63` freshly reviewed another 1,000
previously unique pairs. 636 passed current identity, version and supported
shared-field checks. The other 364 remain held: 354 shared-field differences,
eight unsupported social metadata cases and two unsupported gender fields.

Registration execution `18bf7aef91864d4cb6b5b3ea3557bcee` inserted and read back
all 636 accepted mappings. All fields in every readback matched the expected
record exactly. Registration/readback used 1,909 credits. The live store now
contains 1,228 mappings and uses 1,416,439 bytes. Its allocation was increased
to 5 MiB within the existing account limit. No contact contents were changed.

An older pending deletion event was explicitly marked held for merge/deletion
review; it was not replayed. The main scenario was confirmed active and unpaused,
and the temporary review scenario was deleted. Private review evidence remains
outside Git. No runtime code changed in this expansion. Existing-photo
replacement and automatic creation/deletion remain held.

## Coverage expanded to 1,571; organization paused for credits

Execution `855870cbfeaf48e1a0a84226dc159f03` freshly reviewed another 2,000
previously unique candidate pairs (101 credits). 343 passed. The remaining
1,657 were held: 1,420 shared-field differences, 208 unsupported social metadata
cases, 19 unsupported social parameter values, nine unsupported gender fields,
and one missing resource.

Registration execution `24f751ea392248c8a6ef50abfe669bf6` added and read back
all 343 mappings (1,030 credits). Every readback field matched the expected
record. The store contains 1,571 mappings, using 1,855,879 of 5,242,880 bytes.
No contact contents were changed. The temporary scenario was deleted; detailed
evidence remains private outside Git. No runtime code changed.

The final live check found the main scenario active but paused at organization
level. The organization reports 10,393 credits consumed against a 10,000-credit
allowance, no extra credits and automatic purchasing disabled. Its next reset
is November 4, 2026 at 01:35 UTC. No failed runs or incomplete executions caused
this pause, and the webhook queue was empty. Additional credits or the reset
are required before syncing can resume. Check the credit balance before any
further expansion; do not describe the current deployment as running.

## Initial candidate pass complete: 1,750 contacts live

The credit pause above was subsequently cleared by purchasing 10,000 extra credits.
The API still reports 10,000 included credits; this is not a confirmed recurring
20,000-credit subscription. The organization and main scenario are now unpaused.

Execution `1922337492bd4f359104a45f77a70eb5` freshly reviewed the final 2,054
previously unique candidates for 106 credits. 179 passed. The other 1,875 remain
held: 1,524 shared-field differences, 326 unsupported social metadata cases,
17 unsupported social parameter values, seven unsupported gender fields and
one invalid social URL.

Execution `b11e5a6d426f4b4781b31847eb840910` registered and read back the 179
accepted mappings for 538 credits. Every returned field matched its expected
record. There are now 1,750 mappings using 2,086,989 of 5,242,880 bytes. The final
check confirmed the main scenario active and unpaused, with 8,963 organization
credits remaining. No contact contents were changed. The temporary scenario was
deleted and private evidence retained outside Git.

No previously unique candidate from the initial inventory remains unreviewed.
This does not resolve held matches or prove the whole address book is synchronized.
Creation, deletion/merge recovery and existing-photo replacement remain disabled.
The next coverage work is reconciliation of held differences, not another scan of
the same inventory. Credit budgeting is documented in the Make README. No runtime
code changed in this rollout.

## Ordinary phone-label equivalence: 1,981 contacts live

Saved evidence showed iCloud's ordinary Home/Work phone labels carrying an extra
VOICE type. The comparator now preserves exact numbers with a single Home, Work,
or Mobile/Cell label with or without VOICE. It continues to distinguish fax,
pager, messaging, unknown types, multiple locations, custom labels and changed
numbers. This is representation equivalence, not a new identity-matching rule.
The same comparator is deployed in all six bundled live code modules.

Execution `b0177028dc2f4c4e9f1a2706265a4c6c` freshly reviewed 515 phone-only
held pairs. 231 passed all checks; 284 remain held. Registration and readback
execution `94cb3233edee4f279c21161b0c549ebf` confirmed every field of all 231
new mappings. Coverage is 1,981; no contact contents were changed. Review and
registration used 725 credits total. The scenario remains active and unpaused.

All 154 local tests pass, including ordinary label preservation and negative
cases for service types, labels and phone values. Portable blueprints were
updated, the temporary scenario deleted, and private evidence retained outside
Git. Existing creation/deletion and photo-replacement restrictions remain.

## Observed social service aliases: 1,990 contacts live

Saved evidence distinguishes real URL/label/opaque-ID differences from Apple's
GitHub and Instagram service aliases. The comparator treats only github.com and
instagram.com as equivalent to github and instagram in X-SOCIALPROFILE TYPE.
It retains exact URL, username, user ID and custom-label comparisons. No generic
domain stripping or missing-ID equivalence was introduced.

Fresh review `2f13d583285e4f4da0402f393f5354cd` checked 1,232 URL-only holds
for 66 credits. Nine passed all checks; the other 1,223 remain held. Registration
and exact nine-record readback `aee9ecec45f34b19aec8ac31d127ad13` used 28 credits.
The six live code bundles and portable blueprints contain the fix. All 158 tests
pass, including negative URL, username, ID, custom-label and unknown-domain cases.

Live coverage is 1,990 mappings; the final check confirmed active and unpaused,
with 8,144 credits remaining. No contact contents changed. The temporary scenario
was deleted and detailed evidence kept private. Broader bootstrap differences
need explicit reconciliation; they are not all formatting issues. Creation,
deletion/merge handling and existing-photo replacement remain unfinished.

## Shared-write recovery evidence deployed

The production preparation module now generates a lightweight shared-write
receipt, and the existing inbox-update step saves it before PUT. The schema has
an optional writeReceiptJson text field. This adds no module actions per event.
Receipt data comprises IDs, versions, card hashes and a proposed hash baseline;
no full contact backup is stored. Missing source version/event ID holds preparation.

Cloud test `d8f036f2cb1c484d945b036c6b09c2ce` verified synthetic saved,
unsaved, drifted, wrong-identity, changed-source and unavailable outcomes. All
outcomes forbid another write. Deliberate failures
`f6bef16e92554ea089768b9296a027c1` and
`d4f50d0c666140d282b1aa087beb7b44` confirmed marker and full receipt persistence
after a later Code failure with autoCommit enabled. No contact requests occurred.
The temporary scenario and synthetic inbox records were removed.

Production receipt generation/storage was read back active and unpaused. All
168 local tests pass. Automatic receipt processing and baseline recovery still
need integration, as do photo/create/delete recovery. Existing mapping coverage
remains 1,990; this change does not enable creation, deletion or photo replacement.

## Shared-write recovery on redelivery deployed

The single production scenario now branches after duplicate detection. First
deliveries retain their existing flow. Repeated unfinished shared receipts pass
identity/path gates, fresh source and target reads, and exact receipt reconciliation.
The recovery branch has no contact-writing modules. Confirmed prior saves advance
the baseline and finish the event; unobserved or conflicting writes remain held.
An already-saved expected baseline is accepted for idempotent bookkeeping recovery.

Synthetic Make integration `6ac6ef96a7444c808a3cf32af98cccc6` exercised the
actual inbox/mapping modules with simulated source and target reads. Saved,
unchanged-before and drifted cases produced recovered, held and held respectively.
Readback `134980164d78490e881d6df6ac4e3f18` confirmed the saved baseline alone
advanced. No real contact requests were made by these tests. All synthetic records
and the temporary scenario were removed.

The production route was read back active and unpaused with GET-only recovery.
All 176 tests pass. Testing used 45 credits; 8,088 remain. Coverage remains 1,990.
Recovery requires redelivery; a scheduled pending sweep, photo recovery,
creation/import loop handling and merge-aware deletion remain launch work.


## Bounded pending sweep deployed

The existing production scenario now accepts an explicit pending-recovery command.
It checks at most 25 prepared shared-field receipts without contact writes.
Synthetic saved/unchanged/drift cases passed, including actual stored baseline
readback; a repeat skipped all three. The empty production sweep passed as well.
180 local tests passed. Synthetic records and the temporary test scenario were
removed. Coverage remains 1,990 mappings; this does not enable creation, deletion,
existing-photo replacement, or a scheduled sweep.


## Embedded photo-fill recovery deployed

Missing-photo fills now persist a receipt before PUT. Exact embedded-photo
readback can complete interrupted bookkeeping through redelivery or the existing
on-demand sweep, without repeating a contact write. Missing/changed/URI-only
results remain held. This does not replace existing photos or retry historical
photo operations without receipts.

189 local tests passed. Make synthetic integration recovered the saved image,
held the absent and drifted cases, and verified the stored photo baseline. The
production scenario was read back active and unpaused after deployment. No real
contacts changed; temporary test data and scenario were deleted. URI-photo
recovery, creation-loop prevention, merge/deletion handling and broader mapping
coverage remain launch work.


## iCloud URI photo-fill recovery deployed

Both recovery entry points now verify iCloud URI photos by an account-bound,
redirect-disabled GET followed by image decoding and original-byte hashing. A
matching source/version, unchanged non-photo fields, new target version, and
exact decoded image evidence are required before bookkeeping advances. No
contact writes are part of recovery.

197 local tests passed. The Make integration used synthetic records with real
public image downloads: exact image recovered, altered bytes held, unrelated
contact drift held before download. All three stored baselines were read back;
only the exact-image case advanced. Temporary records and test scenario were
removed, and production readback confirmed active/unpaused status. Older receipts
without dimensions remain held; creation-loop prevention, merge/deletion,
existing-photo replacement, and expanded field coverage still block full sync.


## New-contact loop-prevention decision prepared

`code/new-contact-query.js` is tested offline but **not deployed**. It prepares a
single bounded CardDAV addressbook query for an unmapped `contact.added` event,
using exact emails plus a broad structured-family-name candidate check. It holds
contacts without valid email/name evidence. Any returned resource, truncation,
failed query or unrecognized response is held; an empty result is only a candidate
assessment and never authorizes a write. The query requests ETags, not full cards.

This follows [RFC 6352 addressbook-query and result limits](https://www.rfc-editor.org/rfc/rfc6352.html#section-8.6).
A complete creation route still requires stable UID reservation, conditional PUT,
readback, interrupted-create recovery, and an end-to-end create/import-echo test.
The user previously declined live duplicate checks. A decision is pending on the
narrow exception for **unmapped new contacts only**; no lookup or creation route
has been activated. Existing mapped updates keep their current lookup behavior.

## Creation transaction safeguards prepared offline

`code/create-transaction.js` now prepares a deterministic, account-scoped UID,
lightweight reservation, conditional `If-None-Match: *` PUT intent, and exact
readback reconciliation. All 209 local tests pass. This code is **not deployed**
and has no network or storage side effects.

The future Make route must insert the reservation without overwriting an existing
mapping or tombstone, then durably mark the first attempt before sending its PUT.
It must never resend an attempted creation after a timeout or uncertain result.
A fresh bounded query, unchanged source, supported fields, and decoded primary
photo when present are required. A missing readback stays held instead of retrying.
The reservation stores hashes and IDs, not a full contact backup.

Exact embedded-photo readback is supported by these primitives. Creation-specific
iCloud URI-photo reconciliation, cloud storage ordering tests, and an end-to-end
create/import-echo test remain before activation. The pending permission choice
for new-contact-only duplicate checks is unchanged. No creation was enabled.

## Creation URI-photo recovery prepared offline

Creation reservations now retain the decoded image dimensions, byte hash and
non-photo digest needed to verify iCloud's URI representation. The read-only
planner accepts only the configured account's iCloud gateway photo path and
requires unchanged source identity/version and non-photo fields. The caller must
disable redirects, decode the returned image, and provide the original bytes.
Only exact bytes and dimensions allow the creation mapping to become verified.
Failed downloads, source changes and unrelated edits remain held without retries.

All 212 local tests pass, including URI readback, wrong-account URLs, grouped
photos, field drift, source changes and failed or altered downloads. These are
synthetic offline tests, not an iCloud server test. Nothing new was deployed.
Cloud storage ordering and end-to-end create/import-echo tests remain, as does
the pending policy choice for new-contact-only duplicate checks.

## Duplicate checks authorized for all contacts and cloud transport tested

The user explicitly authorized duplicate checks for **all contacts** on October 4.
This supersedes the earlier no-live-lookup preference and removes the pending
permission decision. Checks may be used for new and existing contacts; a candidate
match alone never authorizes an automatic merge or identity reassignment.

The bounded query now supports both added and updated events, while creation
preparation still accepts only added events. Make execution
`02d584e8f8c94db28c7512590903936d` tested the repository query and response review
against iCloud using synthetic identity values. HTTP 207 with an empty DAV
multistatus produced `no_candidates` and `writesAllowed: false`. It consumed five
credits, changed no contacts, and its temporary scenario was deleted.

The credential-free `duplicate-query-pilot.blueprint.json` and its builder are
committed for repeatable testing. 213 local tests pass. Production still needs
query routing, storage ordering and positive-match/create/import-echo integration
tests before automatic creation can be enabled. This is remaining implementation
work, not a permission blocker. Existing mapped production routes are unchanged.

## Eligible new-contact creation deployed

On October 4, creation was enabled for new, unmapped added events that have valid
email and structured-name evidence, no iCloud duplicate candidate, and supported
fields. A complete Contacts+ API response that omits photos is treated as having
no primary photo for creation only. Contacts with primary photos currently remain
held pending creation-photo download integration; missing or partial source
responses are held. Existing contacts are not rematched or bulk-created.

The Make-only route inserts a mapping reservation without overwrite, reads it,
re-fetches the source, saves and reads an attempted marker, then issues exactly
one conditional PUT. It re-fetches both sides and advances the mapping only after
exact readback. A pending creation cannot enter mapped update routing. Interrupted
creates remain held and are never blindly retried; automatic creation-receipt
recovery is not wired yet.

Verification:
- Disposable lifecycle `91d3f249e1df41868b3a25f1bd9dbbdb` passed reservation ordering,
  iCloud creation/readback, positive duplicate-query hold and conditional cleanup.
- Real Contacts+ webhook `e62b94de0ef542d4beb5073fe104fb8d` reached `verified_created`
  through the production route after exact source and target readback.
- A second identical Contacts+ creation was no longer returned by the source API
  when its webhook was processed. The route held it before an iCloud write. This
  is not proof of a completed provider import-echo cycle or automatic merge cause.
- Cleanup `e320076baee7472b9f2003999efa4427` confirmed iCloud 404, and
  `2e182ff598a941f6a92b2de95a386fd4` confirmed both test source IDs absent.
  Synthetic mappings/inbox records and temporary scenarios were removed after
  retaining private evidence. No non-test contact was changed by these tests.
- Production readback confirmed active, unpaused, and the pilot restriction
  removed at `2026-10-04T19:47:03.551Z`. All 216 local tests pass.

Full sync remains broader than this rollout: merge-aware deletion, creation with
photos, existing-photo replacement, held mappings/fields, and automatic creation
recovery remain unfinished. Duplicate checks for all contacts are authorized;
that permission is no longer a blocker. No source sync settings changed.

## Creation with primary photos deployed

Eligible added contacts with primary photos now use the production creation route.
The bounded duplicate query must complete before downloading. The source image is
fetched without credentials or redirects, decoded and converted to JPEG, followed
by a fresh source read. The original query/source binding and 60-second freshness
limit must still pass. Storage ordering and conditional creation remain unchanged.
After saving, exact embedded readback or account-bound iCloud URI image decoding
and original-byte comparison are required before advancing the mapping.

Cloud test `7c8b8fc4e4144696ac1c7a4e1dc02491` passed all photo-route stages using
synthetic source records and a public test image, with real Make storage and
real iCloud creation and photo readback. The image was 544 by 184 pixels.
This test did not upload a new primary image to Contacts+ or prove a full provider
import-echo cycle. The existing real Contacts+ event test covers source transport;
this test covers image processing, save and exact saved-image verification.

The test used 48 credits. Conditional cleanup and confirmed 404 used another nine
in `59110be524e449c7923c84fb766e0c75`. The test mapping, inbox record and temporary
scenario were removed. Mapping count returned to 1,990. All 217 local tests passed
without Make credits. Production was read back active and unpaused after the
photo-creation rollout at `2026-10-04T19:57:38.077Z`.

Full-sync limitations remain: automatic merge/deletion handling, replacement of
existing images, held field/identity conflicts, and automated interrupted-creation
recovery. Broken/unsupported source photos remain held; creation never silently
omits an observed primary photo. Existing mapped update and missing-photo routes
remain enabled. No provider sync settings changed.


## Guarded existing-photo replacement — October 4

Photo-only source changes can replace an existing image when a previously verified
photo baseline identifies the exact source and target, and the target PHOTO has
not changed independently. Fresh source and conditional target reads are required.
Identical decoded image bytes are held without a write. Unknown baselines, mixed
text/photo edits, ambiguous properties and independent target edits preserve the image.

Cloud execution `d37a5bbb2da9461cb130e7f5264c6836` passed the production photo
route using synthetic source versions and real iCloud replacement/readback. Exact
image bytes and unchanged non-photo fields were verified; it consumed 37 credits.
Cleanup `6787ee8b8bed4e03b55fa467f1c36fcb` conditionally deleted the disposable
contact and verified 404. Both synthetic store records and the test scenario were
removed. This test does not establish a real Contacts+ photo-change webhook or a
full provider echo cycle. Production readback confirmed active/unpaused at
`2026-10-04T20:08:52.501Z`. No provider sync settings changed.

Receipts retain the legacy `photo_fill` operation name with an explicit `action`
for compatibility; replacement recovery compares the stored non-photo digest.
Automatic merge/deletion handling and interrupted-creation recovery remain held.


## Production lifecycle enabled — October 4

The active single scenario is now named **Contacts+ → iCloud — Live sync**.
Creation and update paths remain active; the test-only deletion restriction was
removed after real provider-event verification. Deletion requires the exact stored
mapping, authenticated source read returning no record, matching target ETag and
unchanged per-field target hashes. A receipt is persisted and the mapping marked
pending before conditional DELETE. A 404 readback precedes the deleted tombstone.
If the source still exists, permissions fail, or the target changed, no deletion
is authorized. This applies to both standalone removals and retired merge IDs;
survivor updates are independent guarded operations.

Verified real Contacts+ events (not injected fixtures):

- Creation: `855ad4f2bf4f4dc184cf2c86fd0ef95e`, exact iCloud readback, 35 credits.
- Update: `d4ae814683d84ca9a392d7b2b18f2ae3`, exact notes readback, 18 credits.
- Deletion: `3a1becc87ebd4bd0af41071f8caef36c`, confirmed 404, 21 credits.
- Second creation: `46578c07c07b405c8715b76b1426fb6e`, 35 credits.
- Second deletion: `b4f4ac13a7354019b9c7248c93b89c85`, confirmed 404, 21 credits.

Recovery execution `fcc28eb55c06449da3f77f4d5780e724` passed the deployed creation
recovery branch against the second real saved contact, using its original receipt
and a simulated pending inbox state. It performed source/target reads and verified
bookkeeping, without another contact PUT. This was a recovery simulation, not an
actual service outage. A first harness run stopped safely at its identity gate;
correcting the test's expression mapping allowed the successful recovery check.

A short-lived extra source test record was held, not used to create another target.
The observed cause of that extra source record was not independently established.
All disposable target contacts, test mappings/inbox rows and the temporary scenario
were removed. Private audit evidence remains outside Git. No provider sync setting
was changed. Local regression tests consume no Make credits.

## October 4 enrollment completed

The recurring Core allowance was verified at 20,000 credits and 20 MB of data
store capacity. The mapping store was expanded to 12 MB. All 3,390 additional
reviewed pairs were registered with non-overwriting inserts and complete field
readback, bringing the store to 5,380 mappings. Enrollment used 6,952 credits
and made no contact-content writes. Initial source/target differences were
accepted as separate baselines; they were not reconciled or overwritten.

The 629 remaining pairs in this review cohort stay held (624 earlier unsupported
or missing-resource cases, plus five rejected by the fresh review). Other
unmatched and ambiguous inventory records are also not covered by this count.
Production was active and unpaused with zero queued deliveries and zero incomplete
runs at final verification. The temporary enrollment scenario was deleted.
These checks verify Make storage and server state, not Apple-device display.
