# Contacts+ iCloud Photo Sync Fix

An on-demand macOS tool that copies missing contact photos from Contacts+ into Apple Contacts. It runs locally and is separate from the Contacts+ Photo Review application.

No hourly job, automatic startup, or recurring sync is installed. Running with `--apply` is an explicit write operation through the Contacts app scripting interface, never Address Book SQLite. Apple Contacts may sync saved photos through its configured accounts.

## Why this exists

We built this tool to work around missing profile photos when syncing Contacts+ with iCloud Contacts. In the affected setup, Contacts+ supplied profile photos as URLs, but Apple Contacts did not load those URL-based images. The photos were available in Contacts+ yet missing from the contacts synced through iCloud to macOS, iOS, and iPadOS. This describes the compatibility issue we observed, rather than a claim about every version or configuration of either service.

This script downloads the primary photo stored in Contacts+ and saves the actual image data to the matching contact in Apple Contacts on your Mac. For contacts stored in iCloud, iCloud can then sync the saved image to your other Apple devices. It fills in missing photos and preserves existing contact images.

## Workflow

1. `scripts/inventory.js` exports an exact-ID local contact inventory and vCards into a private output file.
2. `scripts/fetch-source.py` reads every Contacts+ page using a 1Password token reference supplied in a private config file.
3. `scripts/plan-sync.py` selects only missing-image records with matching names and a unique email on both sides. Records without email may match by a unique exact phone number; it does not guess country codes or extensions. Existing photos, shared identifiers, name mismatches, and absent source photos are skipped.
4. `scripts/run-sync.py` refetches source records, checks versions and primary URLs, downloads and decodes TIFF images, and prepares a private plan. Without `--apply`, it stops there.
5. With `--apply`, it calls the AppleScript writer serially, makes a fresh vCard backup, rechecks identity and absence of a photo, saves, and verifies all non-photo vCard fields. Only PHOTO and REV changes are permitted. An unexpected failure stops the run; no uncertain write is automatically retried.

The runner appends durable results to the run directory. It will not repeat recorded attempts or overwrite unresolved backups. Always inspect failures before resuming. Source preparation failures are recorded separately in `prepared.json`.

## Usage

Requires macOS, Python 3, the 1Password CLI, and Contacts automation access. Credentials stay in 1Password. Private configuration must provide `oauth_item`, the ID of an authorized Contacts+ token item. Token refresh is not implemented.

```sh
osascript -l JavaScript scripts/inventory.js /absolute/private/path/inventory.json
python3 scripts/fetch-source.py --config /absolute/private/config.json --output outputs/source.json
python3 scripts/plan-sync.py --local /absolute/private/path/inventory.json --source outputs/source.json --output outputs/plan.json
python3 scripts/run-sync.py --config /absolute/private/config.json --plan outputs/plan.json --run-dir outputs/RUN_NAME
# After reviewing the plan, repeat the last command with --apply.
```

`scripts/set-missing-photo.applescript` is the low-level writer. It requires local contact ID, TIFF path, new backup path, first name, last name, and matching email. An optional seventh argument `phone` uses the sixth argument as a phone instead. The bulk runner passes the current My Card ID as an eighth argument and checks it before and after every photo save. It performs a real write and has no dry-run flag.

## Private data and validation

Keep all inputs, source snapshots, images, identifiers, reports, and vCards in ignored `outputs/`. Never commit credentials or contact data. Local inventory and before/after backups remain available for recovery. Exported JSON, CSV, contact databases, image files, and common credential files are also ignored as a precaution; ignore rules do not protect files that are already tracked or force-added.

Examples and tests use synthetic contact data. Git author names and GitHub noreply addresses remain part of the public commit history. Before publishing changes, inspect the staged files and scan the full history with `gitleaks git --redact --log-opts=--all .`. Do not attach real run outputs to public issues.

```sh
python3 -m unittest discover -s tests
osacompile -o /tmp/contactsplus-icloud-photo-sync-fix-check.scpt scripts/set-missing-photo.applescript
```

Compilation does not execute a contact write. `experimental/PhotoSync.swift` remains an unused prototype: its tested save failed with Cocoa error 134092. Do not clear notes or disable macOS security to work around that failure.

## One-time run progress and QA

The active run writes `results.jsonl` after each verified save. Its My Card identity is pinned in `my-card-id.txt`; a change stops further updates. `--prepared` resumes an already downloaded, source-checked plan without retrieving credentials again. Inspect every failed attempt before retrying; recorded attempts are not repeated automatically.

`scripts/tag-updated.applescript` adds only verified updates to the user-approved **Contacts+** list and checks membership and My Card afterward. `scripts/follow-tags.py` follows one running process and adds newly verified contacts in batches. If a contact temporarily has no readable photo, it defers that contact and continues with the others; later checks retry deferred membership additions. It records only memberships confirmed by readback. `scripts/finish-run.py` waits for that process, finishes newly prepared entries, updates the list, and writes `final-report.json` after a final macOS inventory. These are bounded helpers for one run, not a recurring sync service.

Image hosts include current `img.contactsplus.com` and legacy `img.fullcontact.com`. Source URLs returning access errors are left unchanged. Background progress notifications, when requested, monitor the existing run only and do not schedule another sync.
