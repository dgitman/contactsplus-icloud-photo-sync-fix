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
or explicit handling. The 72 local tests do not establish cloud deployment or
end-to-end synchronization.
