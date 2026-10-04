# Persistent contact mapping

A dedicated Make data store now exists for source-to-target identities. Synthetic
create, read, partial-update, and delete operations passed; the store is empty.
It is connected to all three event routes through existence and identity/state
filters. No production contacts are mapped.

The current single-account deployment uses a fixed logical namespace,
`contactsplus-primary`, followed by `:` and the exact contact ID. This namespace
is configured in the scenario, not taken from the event. Give any additional
source account its own namespace. Use the same namespace in sourceAccountId.
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
- The event inbox retains first deliveries; processing and out-of-order handling
  remain unfinished.
  lastEventId alone cannot provide that guarantee.
- Full contact backups are intentionally omitted. Preserve fields outside the agreed
  sync scope and use conditional writes and readback. Provider restore points are
  the chosen content-recovery mechanism.

The live store and its identifiers are account configuration, not part of the
portable blueprint. Keep real mapping records and backups out of Git.

## Live no-write gate test

Synthetic webhook batches verified that all three event types proceed only for an
existing record with state `verified`, the configured source namespace, and the
exact source contact ID. Unmapped records, pending records, mismatched source IDs,
and empty contact IDs did not reach any route endpoint. The temporary records were
removed and the scenario was disabled afterward. No target requests occurred.

This is a routing guard, not completed synchronization. Valid unmapped events now
remain pending in the [event inbox](event-inbox.md); a processor is still required.
Target URL/UID checks are implemented on the update preparation route.
Write conflict handling remains to be implemented.

## Baseline gate deployed October 4

The mapping schema now includes optional text `baselineJson`: versioned source
and target field hashes, bound to sourceContactId and targetUid. It is required
for an update to prepare a write. Mapping module 28 advances it only after module
18 verifies readback, and only for changed fields. Initial baselines must be
accepted explicitly by bootstrap; merely receiving an event never initializes
one. The store was empty at deployment. Its 1 MB capacity is not sufficient to
assume a full inventory of field hashes will fit; sizing is still required.
