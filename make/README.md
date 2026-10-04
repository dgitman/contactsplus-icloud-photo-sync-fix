# Make cloud sync (in development)

The intended architecture is one Contacts+ webhook feeding one Make scenario,
with separate routes for `contact.added`, `contact.updated`, and `contact.deleted`.
Contacts+ accepted a webhook registration for all three event types.

`unified.blueprint.json` is the verified event-routing scaffold exported from Make.
Its account-specific webhook and data store IDs have been removed. Configure both
when importing; use the mapping schema documented below.
A disposable contact lifecycle test on October 3, 2026 confirmed that real Contacts+
create, update, and delete events each ran only their matching branch successfully.
The route endpoints currently set a verification variable; they do not write contacts.
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
