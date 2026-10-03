# Persistent contact mapping

A dedicated Make data store now exists for source-to-target identities. Synthetic
create, read, partial-update, and delete operations passed; the store is empty.
It is not yet connected to the event routes. No production contacts are mapped.

Use a deterministic key derived from the source account ID and contact ID.
Do not use a name or email as the persistent key. These fields are stored as text:

| Field | Purpose |
| --- | --- |
| sourceAccountId | Scope the source identity to its account |
| sourceContactId | Exact Contacts+ identity |
| targetHref | Exact iCloud vCard resource URL |
| targetUid | Expected UID inside that resource |
| sourceEtag | Last verified source version |
| targetEtag | Last verified target version |
| state | pending, verified, conflict, or deleted |
| lastEventId | Most recently handled event; not a complete replay ledger |
| lastVerifiedAt | Verification timestamp |
| photoSha256 | Hash of verified image bytes |

The first four identity fields and state are required by the Make data structure.
State values and URL/UID validation still require explicit scenario guards.

## Required behavior before enabling writes

- Fetch the latest source record; event bodies may be stale.
- Existing contacts need a reviewed or independently verified match. An unmapped
  update must not create a duplicate. An unmapped deletion must stop for review.
- Only use the configured iCloud address book. Validate the resource UID before
  updating or deleting it; never follow an arbitrary event-supplied target URL.
- Create with If-None-Match; update/delete with the current verified If-Match ETag.
  Treat a changed target as a conflict rather than silently retrying the write.
- Save pending identity before a create. Reconcile interrupted requests through
  readback; do not create a second resource after an uncertain outcome.
- Mark a mapping verified only after target readback. Retain a deletion tombstone
  so a delayed event cannot recreate a deliberately deleted contact.
- A separate durable event ledger is still needed for replay/out-of-order handling.
  lastEventId alone cannot provide that guarantee.
- Back up vCards before real writes. Preserve fields outside the agreed sync scope.

The live store and its identifiers are account configuration, not part of the
portable blueprint. Keep real mapping records and backups out of Git.
