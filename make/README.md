# Make cloud sync (in development)

The intended architecture is one Contacts+ webhook feeding one Make scenario,
with separate routes for `contact.added`, `contact.updated`, and `contact.deleted`.
Contacts+ accepted a webhook registration for all three event types.

`unified.blueprint.json` is the inactive trigger-only scaffold exported from Make.
Its account-specific webhook ID has been removed. It is not a working sync yet:
real event capture, route implementation, CardDAV authentication, and end-to-end
verification are still required. Create a new webhook when importing it.

The abandoned AWS helper and three separate trigger scenarios have been removed.
This design must run entirely in Make, with no local worker or AWS helper.

Before enabling writes, implement durable contact-ID mapping, duplicate-event
handling, conditional CardDAV writes with ETags, backups, preservation of unrelated
vCard fields and working photos, and verified readback. Deletion must use a known
mapping, never a name or email guess. An event echo must not create a sync loop.

Do not commit credentials, live webhook URLs, contact records, or execution payloads.
