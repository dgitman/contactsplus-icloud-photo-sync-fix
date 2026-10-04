# Private CardDAV query test

Status: configured in the private Make custom app, but the authenticated query has not yet run. This is not a production sync or proof that REPORT works in Make.

The standard HTTP v4 module rejected REPORT before network dispatch. This action tests the custom-app request engine instead. It performs a read-only, exact-name query for the disposable Codex CardDAV Test contact and requests only UID, FN, and ETag. An empty successful multistatus response is valid if the test contact was previously deleted.

Replace the example address-book URL in both communication files with the URL discovered for the account. Never commit the account URL or password. Create a Basic Auth connection definition with required username and password fields (the latter uses the password type), and attach it to the query action. Credentials belong in Make connections, never in module code or common data.

Use base.json as the app base; use the query files for Communication, Mappable Parameters, and Interface. Static parameters are empty; Make manages the attached connection separately. Keep the app private. The authentication check is a depth-zero PROPFIND; the action uses REPORT with Depth: 1. Neither changes contacts.

The existing HTTP Basic Auth key is not offered by the custom-app connection picker. A separate connection must be authorized before testing. Accept success only after inspecting an HTTP 207 response and valid CardDAV multistatus; an editor save alone is not verification. Do not attach this to production writes yet.

Detailed scenario logging is enabled at the user's request. Authorization headers remain sanitized.
