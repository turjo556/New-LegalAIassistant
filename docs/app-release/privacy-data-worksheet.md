# App Privacy / Google Data safety worksheet

Draft based on repository inspection, 29 October 2026. **Do not submit these rows as completed declarations.** Apple and Google use different category definitions; the submitting owner must review the final binary, SDK manifests, provider contracts and production configuration.

| Data / source | App behavior in current code | Owner must classify/confirm |
|---|---|---|
| Account name, email, account ID | Registration/login; email confirmation; session linked to account | Contact info, identifiers, required/optional, account-linked purposes |
| Legal name and date of birth | Private adult rider profile; encrypted server storage; not public | Personal/sensitive information, age verification/account and incident handling, retention |
| Optional profile photo | System picker, crop/re-encode, upload; shared with confirmed trip partners | Photos/videos, optional collection, account linkage; no broad library upload claim |
| Driver licence number | Optional secure authority-review submission; encrypted/restricted access | Sensitive personal information, purpose, short active retention and backup limits |
| ID document/selfie | Stripe-hosted identity flow; Ridely stores session/result, not document/selfie images | Third-party collection and disclosure; do not mark “no sensitive data” merely because Stripe hosts it |
| Vehicle model/colour/plate | Provided by driver; plate restricted to confirmed parties/operator | Other personal info/identifiers; publication/sharing scope |
| City, meeting points, custom address/pin | Supplied by user; exact custom address/coordinates sent to server and optionally mapping provider | Precise/approximate location categories even though device GPS permission is blocked; selected coordinates can be precise |
| Bookings, posted rides, completion history | Account-linked trip records | Product interaction/purchase-history definitions and retention |
| Messages, review comments, support/safety reports | User-generated text; private messages, role ratings, support access | User content, linked-account purposes, moderation/retention; review comment recipients |
| Star ratings and role averages | Four criteria, aggregate scores; publication after both reviews or fixed window | User-generated content and visible numerical driver/passenger aggregates |
| Credits and bonus records | Credit ledger; separate web/manual programmes may store recipient email/reference | Purchase/financial category applicability to the final app/backend use; do not claim native card collection when native purchases are disabled |
| Session/password/security data | Password hash server-side; device SecureStore cookie/session | Identifiers/security purposes; distinguish password collection from retained hash |
| IP/provider operational logs | Server/hosting/provider may process request/IP and delivery events | Diagnostics/device IDs/log retention; inspect production SDKs and contracts |

## Claims that require explicit confirmation

- No advertising/tracking SDK was identified in this focused source review. That does **not** by itself establish the stores' “no tracking/no sharing” selections. Review all transitive SDKs and final native privacy manifests.
- The app does not request device location, camera or microphone permission in `app.json`. Manually entered addresses/coordinates are still collected location data.
- Optional image selection uses the system picker. Test actual Android/iOS permission prompts in the signed binary.
- Provider list in current backend/policy includes Cloudflare, Stripe Identity, Resend, mapping services when configured, and external map links. Twilio/SMS is disabled; remove stale policy text that suggests it is required if it remains in the final public policy.
- Transport uses HTTPS. Review the exact App Store encryption questionnaire; `usesNonExemptEncryption:false` is a build declaration, not a legal determination made by this worksheet.
- Legal entity, deletion and record-retention schedule must be final before submission. Do not invent immediate deletion from backups or promise all records can be erased despite lawful retention needs.

## Deletion gate

30 October: app/web password-confirmed deletion requests and public `/delete-account` instructions now exist. Requests enter the authenticated operator support queue; the account remains active pending review. Full erasure tooling, an approved retention schedule, provider deletion and an end-to-end completion exercise remain required before this gate is cleared. See `account-deletion-runbook.md`.

## Inputs still needed from owner

Legal seller/entity/contact address; final policy and support URLs; retention schedule; processor list/contracts; production analytics/crash SDK choices; legal grounds for any retained incident records; current paid-credit availability; app-account deletion URL and actual implementation; final store age/content questionnaire answers.

Message-read watermarks are stored per account and booking to calculate unread counts. They are not exposed as another traveller's read receipt or online status. Include this account-linked messaging functionality in the final privacy review.
