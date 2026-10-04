# Durable event inbox

The single scenario checks duplicate delivery and mapping existence, then records
recognized Contacts+ events before any contact request. Verified mapped contacts
use the limited shared-field update path; unknown identities remain held.

Create a separate Make data structure with required text fields:
sourceAccountId, eventId, sourceContactId, triggerId, receivedAt, state.
Create a data store linked to it. Configure modules 9, 10, and 14 to use this inbox;
modules 7 and 8 use the separate contact-mapping store. The portable blueprint
omits both stores' IDs and the webhook ID.

The key is `contactsplus-primary:<eventId>`. The namespace is fixed configuration,
not supplied by an incoming event. Only contact.added, contact.updated, and
contact.deleted with nonempty event and contact IDs enter the inbox.
New records are saved as pending for known mappings or held_needs_identity for
unknown contacts, without overwriting an existing record. A repeated event ID
reads its inbox entry; only an unfinished shared-write receipt can proceed to
read-only recovery. Other repeated events stop before contact requests. The scenario runs sequentially; do not
add another writer to this inbox without addressing concurrent intake.

## Verified test

A synthetic three-event batch was sent twice to the live webhook. The first run
saved three pending records for an unmapped contact. The second ran only the
existence checks, preserving the original records and receipt timestamps.
No mapping was required to retain these events. All synthetic records were
removed afterward and the scenario was disabled. No contacts were written.

## Preparation outcomes

Module 14 updates only the existing event's state after name/notes preparation:

- `prepared_name_notes`: a name or notes difference was prepared, not applied.
- `unchanged_name_notes`: those fields already match; other fields are not covered.

Neither state means the contact is fully synchronized. The module has upsert
turned off and preserves the original receipt timestamp and source identifiers.
Unmapped events and the create branch remain pending. Successful name/notes
readback records `verified_name_notes`; confirmed deletion records
`verified_deleted`. Neither provides general replay recovery.

Both outcomes were tested in a temporary Make scenario with a synthetic inbox
record. Readback confirmed that all other fields stayed unchanged. The temporary
scenario and record were removed afterward; no contacts were written.

## Remaining work

- A pending-event processor and explicit completed/conflict states are not built.
  Duplicate delivery does not retry a pending event; retained records must be
  processed explicitly. Do not enable production until that path exists.
- This does not guarantee exactly-once writes or handle out-of-order source changes.
  Reconciliation and conditional writes are still needed.
- Invalid events currently stop at validation; malformed-event quarantine remains
  unimplemented. A reused event ID with changed content is not separately detected.
- The store holds event metadata, not source contact contents or deletion backups.
- Before adding failing downstream modules, test transaction rollback and incomplete
  execution behavior so an intake record cannot be lost after acknowledgement.
- Provisioned capacity is 1 MB. Retention, capacity alerts, and archiving are not
  configured yet. Preserve records until processing is confirmed.

Live duplicate searches are deferred at the user's request. This inbox makes no
live iCloud requests and does not change source sync settings.

## Current deployed states (October 4)

The shared-field adapter supersedes the name/notes-only preparation states above:
`prepared_shared_fields`, `unchanged_shared_fields`, `held_needs_baseline`,
`held_field_conflict`, and `held_validation`. Verified readback and baseline
persistence precede `verified_shared_fields`. Unmapped events still stay pending.

Mapped deletion events now become `held_merge_or_delete`; the direct target-delete
modules were removed. This state is not a completed deletion. Event retention and
processing of held/pending records remain launch requirements.

Mapped contact.added events now share the guarded contact.updated path. They
never authorize resource creation. Unmapped added, updated and deleted events
are recorded as `held_needs_identity`; they cannot reach any contact request.
These holds need bootstrap/reconciliation before processing. The API metadata
examined does not reliably identify iCloud-import origin, so automatic new-card
creation stays disabled while iCloud pull-in is enabled.

## Shared-field pre-write receipts

Optional text field `writeReceiptJson` is now saved by module 14 before the
conditional shared-field PUT. Preparation requires an event ID and source version.
The receipt contains identities, versions, before/expected card hashes and the
proposed field-hash baseline. It contains no vCard, contact body or photo bytes.
It reuses existing Code and Data Store steps, adding no module actions per update.

`shared-write-receipt.js` can verify an interrupted shared-field update by exact
readback, allowing only REV/PRODID differences. It requires unchanged source
content/version and baseline, correct identities and a new strong target ETag.
Unchanged-before, drift, missing target, changed source or changed baseline remain
held. Every result has `writesAllowed:false`; the caller must never retry from it.
Receipt storage is trusted internal state, not an input accepted from webhooks.

Synthetic Make tests confirmed that both a marker and the full generated receipt
survive a later failing Code module with autoCommit enabled. These tests made no
contact requests. The production configuration has the same autoCommit setting.

The redelivery recovery route described below now consumes these receipts.
A scheduled pending-event sweep is not deployed.
Photo writes, creates and deletes are not covered by this receipt. Never remove
an unresolved receipt during event retention cleanup. Historical events without
a receipt cannot be retroactively treated as verified.

## Recovery on repeated delivery

Router 60 separates first deliveries from repeated events. First deliveries keep
the existing guarded flow. Repeated events read the inbox; only
prepared_shared_fields or held_recovery entries with receipts can proceed.
Before authenticated reads, a pure gate checks the event, inbox, mapping,
namespace, receipt identities and fixed target path. Completed, unmapped, photo,
create/delete and receiptless entries cannot enter recovery contact reads.

The route reads the current Contacts+ source and exact iCloud resource, then
reconciles against the receipt. It contains only GET, never PUT or DELETE. Exact
verified recovery advances the mapping and marks verified_shared_fields_recovered.
Other outcomes become held_recovery, retaining the receipt. If baseline persistence
previously succeeded but event completion failed, the exact expected baseline is
accepted idempotently; unrelated baseline versions remain held.

Recovery currently requires another delivery of the same event. It does not
periodically sweep stalled records, guarantee Contacts+ redelivery, or recover
photo/create/delete operations. Failed source reads leave the unfinished receipt
available; no retry of a contact write is authorized.
