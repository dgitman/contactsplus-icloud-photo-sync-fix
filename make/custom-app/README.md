# Private CardDAV query test

Status: authenticated read-only REPORT verified on October 4, 2026 (UTC). iCloud returned HTTP 207 with a valid DAV multistatus. The exact-name test returned no matching resource. This verifies the custom-app transport, not production sync.

The standard HTTP v4 module rejected REPORT before network dispatch. This action tests the custom-app request engine instead. The module now accepts a read-only PROPFIND or REPORT method and XML body against a fixed account address book. The initial exact-name disposable-contact test requested UID, FN, and ETag. An empty successful multistatus response is valid if the test contact was previously deleted.

Replace the example address-book URL in both communication files with the URL discovered for the account. Never commit the account URL or password. Create a Basic Auth connection definition with required username and password fields (the latter uses the password type), and attach it to the query action. Credentials belong in Make connections, never in module code or common data.

Use base.json as the app base; use the query files for Communication, Mappable Parameters, and Interface. Static parameters are empty; Make manages the attached connection separately. Keep the app private. The authentication check is a depth-zero PROPFIND; the action uses REPORT with Depth: 1. Neither changes contacts.

The existing HTTP Basic Auth key is not offered by the custom-app connection picker. A separate connection was authorized for the successful test. Accept success only after inspecting an HTTP 207 response and valid CardDAV multistatus; an editor save alone is not verification. Do not attach this to production writes yet.

Detailed scenario logging is enabled at the user's request. Authorization headers remain sanitized.

A full addressbook-query returned a 507 limit marker. The bootstrap instead lists resources with PROPFIND and reads batches of 100 using addressbook-multiget, validating status, batch counts and unique UIDs. The first complete inventory contained 7,433 unique contact resources. iCloud may return full vCards despite requested property projection; execution logs must be treated as private contact data.
