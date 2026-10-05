# Make cloud sync — live

The architecture is one Contacts+ webhook feeding one Make scenario.
Known `contact.added` and `contact.updated` events share guarded updates;
`contact.deleted` events remove an unchanged verified target only after a fresh
source read confirms that the exact source ID is gone.
Contacts+ accepted a webhook registration for all three event types.

`unified.blueprint.json` contains the deployed production workflow.
Its account-specific webhook and data store IDs have been removed. Configure both
when importing; use the mapping schema documented below.
A disposable contact lifecycle test on October 3, 2026 confirmed that real Contacts+
create, update, and delete events each ran only their matching branch successfully.
The current scenario is active for explicitly verified mappings with per-field
baselines. It supports guarded shared-field updates and additions to empty fields,
with conditional writes and exact readback. Eligible new contacts can be created
with or without a primary photo after bounded duplicate checks. Missing photos
can be filled; existing photos can be replaced only with a verified photo baseline,
a changed source photo and an unchanged target photo. Unknown identities, mixed
photo/text changes and independent target changes are held. Unsupported top-level
fields are omitted. Unsupported components or target parameters leave their whole
field group untouched while supported groups continue syncing; skipped groups are
not logged per contact. Malformed social URLs also preserve their entire URL group. Identity errors and
other malformed supported values remain held. Merged-away IDs use the same confirmed-deletion path, while survivor updates
use their own exact mapping. Interrupted create/delete operations have read-only
receipt recovery; an uncertain write is never blindly repeated. See [launch status](launch-blockers.md)
for coverage, cloud evidence and remaining limitations.

## Credit budget for launch work

Before each bulk run, check the organization's remaining credits and pause state.
Included credits and purchased extra credits are separate; extra credits do not
establish a recurring allowance upgrade. Reserve credits for other active scenarios.

The verified bootstrap review uses approximately five credits per batch of up to
100 candidates, plus one startup credit. Mapping registration and explicit readback
using `scripts/build-enrollment.js` use about two credits per record plus batch
overhead (6,952 credits for 3,390 records on October 4). The builder uses
non-overwriting inserts and compares every saved field with a fresh store read. Budget
for every candidate passing before starting a review, then recalculate from actual
accepted counts before registration. Allow margin for other scenario usage and
errors. These are measured estimates, not platform guarantees.

Do not repeatedly scan already-reviewed candidates or replay held events merely
to spend an available budget. Keep initial matching separate from event processing.
Future optimization should measure credits per event and remove redundant work
without dropping identity checks, conditional writes, or verification.

A separate temporary Make test successfully read an iCloud vCard using Basic Auth.
That test scenario was deleted afterward.

A second Make-only disposable-contact test verified:
- Create with `If-None-Match: *`: HTTP 201, followed by HTTP 200 readback.
- Update with the current `If-Match` ETag: HTTP 204.
- Reusing the stale ETag: rejected with Precondition Failed.
- Readback: the new title persisted; all other vCard content was unchanged.
- Delete with the current ETag: HTTP 204, followed by HTTP 404 readback.

The disposable contact and temporary scenario were deleted afterward. A subsequent disposable-contact test uploaded an embedded PNG through Make.
iCloud returned a PHOTO URI; Make fetched that URI successfully, and the downloaded
78-byte PNG matched the uploaded bytes exactly (16 x 16 pixels). The response MIME
type said JPEG despite PNG bytes, so photo validation must inspect actual data.
The test contact was deleted and HTTP 404 confirmed removal; the temporary scenario
was also deleted. This verifies CardDAV storage, not display on an Apple device.
Durable contact mapping, production photo handling, and end-to-end event-driven
sync are still required.

The abandoned AWS helper and three separate trigger scenarios have been removed.
This design must run entirely in Make, with no local worker or AWS helper.

Before enabling writes, implement durable contact-ID mapping, duplicate-event
handling, conditional CardDAV writes with ETags, preservation of unrelated
vCard fields and working photos, and verified readback. Deletion must use a known
mapping, never a name or email guess. An event echo must not create a sync loop.

Do not commit credentials, live webhook URLs, contact records, or execution payloads.

## Mapping storage

See [persistent contact mapping](contact-mapping.md) for the provisioned store schema,
completed tests, and remaining guards. The store lookup now gates all three routes.
Only exact verified mappings proceed; unmapped events currently stop without writes.
Valid unmapped events are retained in the [event inbox](event-inbox.md).
Production creation and pending-event processing are still unfinished.

## Contact conversion

[Make Code conversion](code/README.md) now covers basic new cards and targeted
name/notes edits that preserve existing photos and unrelated properties. It passed
local tests and a synthetic Make cloud test. It is wired to the experimental update route, which passed a real disposable
Contacts+ webhook test.
Live duplicate searches are intentionally omitted at the user's request.

## Prepared update route

Modules 11–13 fetch the current Contacts+ record, GET the exact mapped iCloud
resource, and prepare a name/notes-only patch. This read preserves existing fields;
it is not a duplicate search. The route checks source identity, limits the target
to the configured address book and UID, disables redirects, and retains the
before-vCard and ETag in its result. Modules 16–19 now conditionally PUT changed cards, GET them back, compare all
properties except server REV/PRODID metadata, and mark the scoped event verified.

On import, configure the Contacts+ connection on module 11 and iCloud Basic Auth
on module 12. Replace both example.invalid book prefixes in module 12 (URL and
equality filter) with the same discovered book URL. Configure the webhook and
both data stores as described above.

Module 13 combines code/vcard.js without its CommonJS export, followed by
code/prepare-update.js. Source uses the whole-bundle reference for module 11.
Three adapter tests cover before-image retention, absent vs empty notes, and
identity/ETag rejection. A real disposable Contacts+ update event executed the route successfully; the
main scenario is inactive. Module 14 records the scoped preparation outcome in the
inbox; configure it to use the same store as modules 9 and 10. Neither outcome
means a contact update was applied. See [event-inbox.md](event-inbox.md).

## Storage policy

Full per-contact backups are disabled at the account owner's request. Only the
contact mappings and event inbox are retained in Make Data Stores. Modules 15 and
22 were removed, and the empty pilot backup store was deleted. Provider restore
points are the chosen recovery mechanism for contact content; a targeted automatic
undo is not available.

The current vCard and prepared result still pass through the execution to preserve
unrelated fields and verify readback. They are not copied into a backup store.
Conditional writes, exact identity checks, and readback verification remain intact.
Interrupted writes must still be reconciled before retrying; removing backups does
not make blind retries safe. Pending-operation recovery remains unfinished.

## Prepared-update pilot

`prepared-update-pilot.blueprint.json` is an on-demand, disposable-target test,
not the production scenario. Configure the HTTP Basic Auth connection, discovered
book URL before running. Use a fresh unique UID consistently in
all URLs, the initial vCard, and converter input. Do not run against a
real contact or blindly rerun after an interruption.

The Make run on October 3, 2026 (October 4 UTC) passed: conditional create, GET,
repository converter preparation, durable backup (since removed), conditional PUT with the GET
ETag, GET comparison, conditional deletion, and confirmed 404. The comparison
ignores property ordering, folding, REV and PRODID; every other property must
match the prepared card. The temporary scenario and synthetic backup were removed.

This pilot used synthetic source data and a notes-only change. It does not verify
Contacts+ webhook-to-write behavior, photo preservation through a real update,
or display on Apple devices. Production remains inactive with no contact writes.

## Historical event-driven write pilots and launch blockers

This section records an earlier stage; the live status above supersedes it.

On October 3, 2026 (October 4 UTC), a real Contacts+ update webhook traversed the
main scenario and reached `verified_name_notes`. The target-only email survived.
A subsequent real deletion webhook saved the before-card, conditionally deleted
the target, confirmed 404, marked the mapping `deleted`, and recorded
`verified_deleted`. The source and target test contacts and temporary scenarios
were removed. This is server readback, not Apple-device visual verification.

Modules 20–27 implement the experimental deletion path. Configure their HTTP
connection and book URLs, module 26's mapping store,
and module 27's inbox store. A deleted mapping stops subsequent routing.

**Do not enable production yet.** Existing contacts have not been mapped. Automatic
creation, full field/photo updates, merge handling, and interrupted-write recovery
are unfinished. Current failures need manual reconciliation; replaying an event is
not a recovery procedure.
Contacts+ iCloud pull-in was visibly active at this check, so automatic creation
also needs a loop-prevention decision before implementation/activation.

### Enrolling matched contacts with existing differences

The read-only batch reviewer supports `acceptInitialDifferences: true` for pairs
whose one-to-one identity was already established. This records separate source
and target field hashes without reconciling historical differences. Structured
name differences, missing resources and invalid identities remain held. Unsupported
field groups are excluded from enrollment baselines and preserved on the target. With the resulting baseline, unchanged source fields cause no write;
a later source edit can update its corresponding field only if the target field
still matches its accepted hash. Independent edits on both sides hold the contact.
This option does not authorize a historical overwrite or photo replacement.

Before registering a batch, calculate serialized mapping size against the live
store quota. Make can reject a size increase when the team's allocation is full;
purchased extra credits do not necessarily increase the recurring storage quota.

### Bounded historical website-label repairs

`code/prepare-url-label-repair.js` handles reviewed URL groups whose exact link
values match and whose only diagnosed difference is a label. It requires current
source and target fields to match the accepted baseline. Changes to link values,
usernames or profile IDs are not allowed through this preparation path.

`node make/scripts/build-url-label-repair.js PRIVATE_SELECTION_JSON PRIVATE_CONNECTED_PILOT_JSON`
builds a temporary on-demand batch from the verified connected pilot blueprint.
Selections contain reviewed `sourceId` and `urlDiagnosis` rows; the builder rejects
more than 50 or duplicate IDs. Keep generated blueprints and selections private.
A fresh preparation hold skips only that contact. Errors after a write stop the
batch for read-only investigation; do not replay the batch after an uncertain write.
The flow verifies the whole returned card, advances only the URL baseline, and
reads the mapping back. Delete the temporary scenario after retaining its results.

An optional third argument, `missing_profile_ids`, builds reviewed ID-only fills.
This requires identical URLs and no existing target profile IDs; other metadata
conflicts remain held. Use the original connected pilot template, which includes
separate modules 18/20/21; the builder combines those checks to reduce code credits.
Measured cost is 14 credits per successful repair plus startup, excluding separate
follow-up checks. Do not assume this pilot proves support for every social service.

`label_and_missing_profile_ids` handles reviewed groups needing both a label
correction and an absent profile ID. It requires exactly those two differences,
identical link values, unchanged baselines and no existing target profile IDs.
Username changes remain outside this mode.

`social_representation` is restricted to reviewed equivalent URL metadata or
label/ID/username differences where each differing target username is exactly the
source Flickr/Myspace userId and the source has no distinct username. It cannot
remove a different handle or overwrite an existing target ID during relocation.
This mode also canonicalizes equivalent grouped social labels with exact readback.
