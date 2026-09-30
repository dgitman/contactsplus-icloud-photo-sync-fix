# Contacts+ Photo Sync

Private, disabled-by-default pilot for copying reviewed Contacts+ photos into Apple Contacts. This repository is separate from [Contacts+ Photo Review](https://github.com/dgitman/contactsplus-photo-review), which reads and writes Contacts+ only.

## Status

No scheduled job, hourly sync, automatic startup, or full-address-book sync is installed by this repository. Moving these scripts here does not execute them or change contacts.

The AppleScript pilot previously saved one missing photo and verified that the note remained unchanged. It accepts an already-downloaded TIFF image; it does not yet fetch Contacts+ photos itself. The complete automated Contacts+-to-Apple-Contacts pipeline remains future work.

## Pilot

`scripts/set-missing-photo.applescript` requires six arguments: exact Apple Contacts identifier, TIFF path, backup vCard path, expected first name, expected last name, and expected email. It checks identity, refuses to replace an existing photo, saves a vCard backup, then writes and verifies the photo and note.

Running this script performs a real Apple Contacts write. There is no dry-run flag. Use only an explicitly reviewed contact and image, and use a fresh backup path; the legacy pilot overwrites the supplied backup path. Apple Contacts may sync that change through its configured accounts.

No personal identifiers, manifests, downloaded images, credentials, or vCards are included. Keep private inputs and backups in ignored `outputs/`.

## Experimental Swift helper

`experimental/PhotoSync.swift` is retained for investigation. Reads were successful, but the tested save failed with Cocoa error 134092. It is not the working sync path. Do not clear notes or disable macOS security to work around that failure.

## Validation without contact changes

Compile the AppleScript without running it:

```sh
osacompile -o /tmp/contactsplus-photo-sync-check.scpt scripts/set-missing-photo.applescript
```

macOS Contacts/Automation permission is needed when explicitly running the pilot. No credentials, access grants, or contact data were migrated from the review app.
