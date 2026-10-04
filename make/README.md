# Make cloud sync (in development)

The intended architecture is one Contacts+ webhook feeding one Make scenario,
with separate routes for `contact.added`, `contact.updated`, and `contact.deleted`.
Contacts+ accepted a webhook registration for all three event types.

`unified.blueprint.json` is the verified event-routing scaffold exported from Make.
Its account-specific webhook and data store IDs have been removed. Configure both
when importing; use the mapping schema documented below.
A disposable contact lifecycle test on October 3, 2026 confirmed that real Contacts+
create, update, and delete events each ran only their matching branch successfully.
Create/delete endpoints still set verification variables. The update route now
reads the exact mapped source and target and prepares a name/notes change.
No route writes contacts.
The scenario was switched off after verification.

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
handling, conditional CardDAV writes with ETags, backups, preservation of unrelated
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
local tests and a synthetic Make cloud test. It is now wired to the update route in preparation-only mode;
the event-to-iCloud pilot still requires access to a disposable source contact.
Live duplicate searches are intentionally omitted at the user's request.

## Prepared update route

Modules 11–13 fetch the current Contacts+ record, GET the exact mapped iCloud
resource, and prepare a name/notes-only patch. This read preserves existing fields;
it is not a duplicate search. The route checks source identity, limits the target
to the configured address book and UID, disables redirects, and retains the
before-vCard and ETag in its result. There is no PUT module.

On import, configure the Contacts+ connection on module 11 and iCloud Basic Auth
on module 12. Replace both example.invalid book prefixes in module 12 (URL and
equality filter) with the same discovered book URL. Configure the webhook and
both data stores as described above.

Module 13 combines code/vcard.js without its CommonJS export, followed by
code/prepare-update.js. Source uses the whole-bundle reference for module 11.
Three adapter tests cover before-image retention, absent vs empty notes, and
identity/ETag rejection. The live route was saved and read back but has not been
executed end-to-end; the main scenario is inactive. Module 15 saves original and prepared cards to a separate backup store before
module 14 records the scoped preparation outcome in the
inbox; configure it to use the same store as modules 9 and 10. Neither outcome
means a contact update was applied. See [event-inbox.md](event-inbox.md).

## Prepared-card backups

Configure module 15 with a separate data store using required text fields:
`eventId`, `sourceContactId`, `targetUid`, `targetEtag`, `beforeVcard`,
`preparedVcard`, and `createdAt`. Its key is the fixed account namespace plus event
ID. Overwrite is disabled. Both changed and unchanged preparations are retained.
A duplicate backup stops processing rather than replacing previous evidence.

A synthetic Make test verified exact CRLF vCard readback and duplicate-key
rejection. The temporary scenario and record were deleted. No contact was changed.
These are application-protected records, not tamper-proof archival storage.

The pilot store is 1 MB; the attempted 5 MB allocation exceeded Make's available
4 MB limit. Embedded photos may consume this quickly. Capacity planning, retention,
and interrupted-run reconciliation are required before production. Never purge
unresolved backups merely to make space. No write route is enabled yet.

## Prepared-update pilot

`prepared-update-pilot.blueprint.json` is an on-demand, disposable-target test,
not the production scenario. Configure the HTTP Basic Auth connection, discovered
book URL, and backup store before running. Use a fresh unique UID consistently in
all URLs, the initial vCard, converter input, and backup key. Do not run against a
real contact or blindly rerun after an interruption.

The Make run on October 3, 2026 (October 4 UTC) passed: conditional create, GET,
repository converter preparation, durable backup, conditional PUT with the GET
ETag, GET comparison, conditional deletion, and confirmed 404. The comparison
ignores property ordering, folding, REV and PRODID; every other property must
match the prepared card. The temporary scenario and synthetic backup were removed.

This pilot used synthetic source data and a notes-only change. It does not verify
Contacts+ webhook-to-write behavior, photo preservation through a real update,
or display on Apple devices. Production remains inactive with no contact writes.
