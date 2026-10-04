# Launch verification status

Full synchronization is not active. The main scenario captures events but has no
production identity mappings. Listener activation is not sync deployment.

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

## Remaining launch work

- Run the approved inventory and verify existing source-to-target mappings.
- Wire the tested bootstrap matcher; name-only, ambiguous, conflicting, and
  many-to-one matches must remain held. It is not a per-event duplicate search.
- Implement creation/import loop prevention while iCloud pull-in remains enabled.
- Extend updates beyond names/notes, including verified photo reconciliation.
- Integrate field baselines, pending-operation readback, and merge-aware deletion.
- Add pending-event processing and event-store retention/capacity monitoring.
- Run disposable lifecycle and echo/merge tests before enabling production writes.

Full per-contact backups remain omitted under the user's storage policy.

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
