# Durable event inbox

The single scenario records recognized Contacts+ events before looking up a contact
mapping. This is intake only; it does not yet synchronize contacts.

Create a separate Make data structure with required text fields:
sourceAccountId, eventId, sourceContactId, triggerId, receivedAt, state.
Create a data store linked to it. Configure modules 9 and 10 to use this inbox;
modules 7 and 8 use the separate contact-mapping store. The portable blueprint
omits both stores' IDs and the webhook ID.

The key is `contactsplus-primary:<eventId>`. The namespace is fixed configuration,
not supplied by an incoming event. Only contact.added, contact.updated, and
contact.deleted with nonempty event and contact IDs enter the inbox.
New records are saved as pending, without overwriting an existing record. A
repeated event ID stops before routing. The scenario runs sequentially; do not
add another writer to this inbox without addressing concurrent intake.

## Verified test

A synthetic three-event batch was sent twice to the live webhook. The first run
saved three pending records for an unmapped contact. The second ran only the
existence checks, preserving the original records and receipt timestamps.
No mapping was required to retain these events. All synthetic records were
removed afterward and the scenario was disabled. No contacts were written.

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
