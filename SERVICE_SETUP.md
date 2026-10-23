# Activating Ridely's external services

The website works without external API keys: listings, bookings, in-app notifications, messages, reports, blocks, tickets, luggage/vehicle details, and policy pages use the existing database. Address lookup, automatic road routing, outbound email, and SMS require provider setup. Missing services are explicitly unavailable; verification is never granted just because a member requests it.

## Resend — existing account can be reused

1. Keep the Cadence Clean domain/senders intact. Add **ridely.ca** as a separate domain in the existing Resend account.
2. Add the exact DNS records supplied by Resend in the DNS provider currently authoritative for ridely.ca (Cloudflare after nameserver activation). Do not replace Cadence Clean records or unrelated MX records.
3. Wait for Resend to verify the Ridely sending domain. Create a sending API key with the appropriate Ridely-domain permissions. Review usage/billing before enabling sends.
4. In the Cloudflare **ridemyway Worker → Settings → Variables and Secrets**, add `RESEND_API_KEY` as a **Secret**. Add `EMAIL_FROM` as a variable, e.g. `Ridely <no-reply@ridely.ca>` using a sender authorized by Resend. Never commit the API key or send it in chat.
5. Create a Ridely member account, open Account, send an email verification code, and confirm it. Only then can email trip updates be enabled. They are opt-in, not enabled by default.
6. The Cloudflare scheduled handler runs every five minutes. It sends generic booking/itinerary/message notifications only to verified, opted-in recipients. It uses Resend idempotency keys and caps each run at 20 notifications. Failed sends retry up to five times. Turning updates on suppresses older backlog notifications.

Resend sending-domain verification **does not create a mailbox** for `support@ridely.ca`. Configure incoming email with a mailbox/forwarding provider separately. The public site states that delivery/support activation is not yet confirmed. Do not promise a response SLA before actually staffing and testing it.

## Support operator access

Set `RIDELY_ADMIN_EMAIL` in the Worker to the exact email of the operator's Ridely account. The account must complete email verification before it can open the private support/report queue from Account. This can be an existing mailbox you control; it need not be support@ridely.ca. No administrator is inferred from GitHub identity, account creation order, or a client-submitted flag.

`SUPPORT_EMAIL=support@ridely.ca` is already saved as non-secret Worker configuration. Support tickets are persisted even before the operator is configured, but the UI clearly states the inbox is being activated. The queue supports review and marking reports/tickets resolved. There is no automatic disciplinary action based on an unreviewed report.

## Address search and road routing — Mapbox

1. Create/configure a Mapbox account and a server-side token with the required Geocoding and Directions access. Review current pricing, **permanent geocoding** eligibility, billing requirements, and map/display licensing before activation. Search results are persisted with rides/requests, so this integration explicitly requests `permanent=true` instead of silently storing temporary results.
2. Add `MAPBOX_ACCESS_TOKEN` as a Cloudflare **Secret**. The token stays server-side; it is not bundled into the website.
3. Geocoding searches Canadian addresses using Mapbox's forward-geocoding endpoint. Members select an address result, confirm its pin, and still supply the relevant meeting-point text. Pins can be adjusted; they are not identity/address ownership verification.
4. New routes with custom options should include **both standard endpoint pins**, even if only custom pickup or only custom drop-off is allowed. Older listings without both pins must be reposted for full road calculations.
5. Drivers use **Preview full road route** before approval. The server calculates baseline, existing, and proposed road routes in fixed stop order. It includes two minutes of boarding/stopping per active custom stop and rejects more than 15 total detour minutes. It does not claim traffic-proof arrival guarantees or optimize away previously approved stops.
6. Preview quotes expire after five minutes and are bound to the request and current route version. Booking cancellations and stop decisions invalidate older previews. Approval uses a conditional SQL update and existing atomic 15-minute budget triggers, preventing stale concurrent approvals.
7. Exact route geometry is returned only to the listing owner. Public itineraries retain approximate stop labels and never include home addresses or the exact custom route geometry.

Without Mapbox, manual pins and the existing **clearly labelled driver-estimate** approval workflow remain available. Do not advertise automatic road detour verification until the provider is connected and a real hosted route has been checked. Mapping searches are capped per member (100/day); route preview requests are capped (20/10 minutes), and each preview can make three Directions requests. These caps do not replace provider/account-wide spending controls.

## Optional phone verification — Twilio

Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` as Cloudflare secrets/variables as appropriate. The number must be authorized to send SMS to the launch region, with any required sender registration completed. Check Twilio pricing and account limits before enabling it. No SMS provider account, paid number, or subscription has been purchased by this implementation.

Phone codes expire after ten minutes, have five confirmation attempts, and are rate-limited. Verification status means control of the contact channel, **not** identity, insurance, vehicle, or licence verification. Full driver verification still requires a selected provider/process and operating policies.

## Deployment and validation

Use the existing `npm run build` build command and `npm run deploy` deploy command. The latter applies additive migrations 0005/0006 before uploading the Worker. Existing accounts and reservations are retained. The cron is declared in `wrangler.json`; secret values stay in Cloudflare's secure settings.

Tests use mocked external provider responses to exercise real API/database behavior, including OTP expiry/attempts, preferences, email outbox, route quote conflicts and budget rejection, blocks, private support queues, and unconfigured-provider failures. No real email/SMS was sent and no live provider account was accessed during setup. Cloudflare local runtime and browser checks are separate from hosted deployment validation.

The email outbox scheduled handler runs in Cloudflare. The standalone Node development server has the same account/verification endpoints but does not run a background email schedule automatically.

Before wider public launch, finalize the operating legal entity, retention rules, terms/privacy/cancellation drafts, insurance/transport classification, escalation/support staffing, and trademark clearance. The published policy pages are explicitly marked early-access drafts; they are not a legal review or a claim of regulatory approval. No online card payments/refunds were added—current pricing/payment policy accurately describes direct/offline arrangements and a $0 Ridely platform/cancellation fee.

## Stripe Identity and the Montréal–Ottawa driver pilot

Use a separate **Ridely Stripe business account** under the existing Stripe login if Cadence Clean is a separate business. Confirm Stripe's eligibility, supported Canadian driving licences, Identity availability, and current pricing in the Ridely account. This integration does not activate a subscription or make live verification requests until a key is configured and a driver chooses to start.

1. Enable Stripe Identity in the Ridely Stripe dashboard. Start with test mode. Use Stripe's documented test verification flow, never real personal documents in tests.
2. In Cloudflare → Workers & Pages → ridemyway → Settings → Variables and Secrets, add `STRIPE_SECRET_KEY` as a **Secret** using the Ridely account's test secret key. Do not put it in Git, browser code, or chat. `RIDELY_PUBLIC_URL=https://ridely.ca` is already in Wrangler configuration. For local development use an HTTPS test return URL. Ensure Identity permissions are enabled for the key. API version is pinned to 2024-06-20.
3. Configure Resend/email verification as above. Set `RIDELY_ADMIN_EMAIL` to the operator's account email, then verify that email in Ridely. Admin access requires both the configured address and successful email verification. Operators cannot review their own driving eligibility; use a separate operator and driver account.
4. Drivers open **Account → Become a Ridely driver**, request a driver review, verify email, acknowledge Stripe processing, and choose **Verify with Stripe**. Stripe's hosted page collects a driving licence and a live matching selfie. Ridely stores only a session reference, status, and timestamp; it never requests expanded verified outputs or stores licence images/selfies.
5. On return, the driver clicks **Check verification result**. The authenticated server retrieves the saved session directly from Stripe, validates its user metadata, document type, and test/live mode, and records the status. Redirect parameters and client flags cannot mark a driver verified. A successful test-mode session is stored as `test_verified` and never opens bookings; only live-mode verification can satisfy the production gate. This release uses authenticated result retrieval, not webhooks; a result will stay pending until refreshed. No webhook secret is required. Canceled sessions currently need operator assistance to arrange a new check.
6. In Account → Open support queue → Driver eligibility reviews, the verified operator loads enrolled drivers and records a separate **completed external** review of current driving privileges and insurance appropriate for the Québec–Ontario corridor and listed vehicle. Establish that secure evidence process before approving anyone. The form does not perform SAAQ/MTO queries or validate insurance with an insurer. Store evidence externally with appropriate access/retention controls; record only an internal case reference here, never licence/policy numbers or document images. The operator records expiry dates and the exact public vehicle description, and explicitly attests to completed checks. Reviews are audited and expire after 30 days, or earlier when coverage expires for the ride date. Stripe identity verification never automatically approves these checks.
7. Exercise successful, processing, failed/requires-input, and canceled checks in Stripe test mode. Confirm pending drivers cannot accept bookings. Then configure the Ridely live secret only when the operator's review process and launch requirements are ready. Test records do not prove live eligibility: before switching to live mode, clear test sessions/results and review fixtures in the production database through a controlled operator migration. Never seed test approvals in production.

**Booking gate:** all drivers, including pre-existing listings, require verified identity plus current licence and insurance approval covering the trip date and listed vehicle before any new seat reservation. Both the API and database enforce it. Pending drivers may publish listings, marked unbookable. Existing reservations are retained and remain cancellable; suspension does not automatically cancel them. A review is not a guarantee of safe driving, vehicle condition, or legal compliance. No live driver checks or paid Stripe calls were made during implementation.

**Local test fixtures:** Node tests seed approvals only in temporary test databases. Cloudflare smoke scripts create a local approval using `wrangler d1 execute --local`; they reject non-local target URLs and never use `--remote`. There is no public test-approval endpoint or production bypass flag.

## Issuing-authority review and operator access

Add `RIDELY_ADMIN_EMAIL` as a Cloudflare **Secret**, using the owner’s chosen Ridely account email. Keep this personal account identifier out of the repository. Sign in with that address, verify its email, then open Account → Open support queue → Driver eligibility reviews. The owner email is deployment configuration, not a public profile field. Operators cannot approve their own driver application.

Drivers must select their licence's issuing province (QC or ON for this pilot) and explicitly authorise the eligibility review. No licence number, policy number, document upload, or government credentials are collected by the Ridely form. A province correction needs support review. Drivers can request consent withdrawal through support; the operator must clear consent and suspend approvals in the controlled review process.

An operator approving a licence must record the corresponding issuing authority (SAAQ for QC, Ontario Ministry of Transportation for ON), the actual check date within the last 30 days, an internal secure reference to the authoritative evidence, and confirmations of vehicle licence class and restrictions. This is **manual recording of checks performed outside Ridely**, not a government API integration. A basic validity lookup may not establish class, restrictions, insurance, commercial/carpooling eligibility, or driving history: obtain an appropriate official record and any required permissions for each claim. Keep identifying records in an approved secure evidence process, not email or public meeting points. Refer to the [SAAQ official site](https://saaq.gouv.qc.ca/en/) and [Ontario official site](https://www.ontario.ca/) to confirm the relevant service's current terms, access rules, fees, and scope; those pages could not be retrieved from the restricted development workspace, so current details are unverified.

Migration 0008 requires these new fields for all new bookings, including previously approved drivers. It preserves existing reservations and review logs. Approval expires based on both the actual authority-check date and the operator review date; re-recording an old check cannot extend its validity. New records are audited; driver-facing state exposes province/consent/check date but not private evidence references. API and database gates reject missing consent, a mismatched authority, missing class/restriction confirmations, or stale/future authority checks. The 30-day interval is Ridely's pilot policy, not a government requirement or continuous monitoring guarantee.

## Guided driver registration

Drivers → Become a driver opens account creation and then a separate four-step setup: email code, issuing province/authorisation, Stripe identity, and final review. Existing members can use Account → Continue driver setup. Completed checks resume from server state; unsaved form inputs and Stripe-processing consent are not retained. The Stripe return retrieves the saved session automatically once and still offers manual refresh. Test results remain clearly labelled and never approve real bookings. Operator reviews remain separate in the support queue. Stripe's document/selfie collection screen remains provider-hosted.

## Secure licence-number submission (manual authority checks)

**Activation prerequisite:** establish the appropriate SAAQclic Entreprises or Ontario service access and permitted purpose first. This feature does not automate, scrape, or grant access to those services. A portal limited to vehicle lending/rental is not automatically suitable for screening Ridely drivers. Collect only with driver consent and only when the operator can complete the authorised check.

Add `LICENCE_ENCRYPTION_KEY` as a Cloudflare **Secret** for `ridemyway`. Its value must be **32 cryptographically random bytes encoded in standard Base64**. Generate it using a trusted local tool (for example `openssl rand -base64 32`) and paste directly into Cloudflare; never into chat, Git, screenshots, build variables, or logs. Keep a protected recovery copy separately from database backups. A missing/invalid key disables number collection, while allowing account registration and identity setup. No key was generated, committed, or installed during implementation. Preserve the key across deployments: replacing it makes pending submissions unreadable. Until a dedicated re-encryption/key-version migration exists, finish or delete all pending submissions before changing keys. An encryption-key compromise also requires assessing retained encrypted backups, not just current rows.

Numbers are submitted by signed-in, email-verified drivers in setup step 2, after province selection and eligibility authorisation. An additional checkbox explains encrypted storage, operator access, expiry, and replacement. Québec input is one letter plus 12 digits; Ontario input is one letter plus 14 digits. Formatting validation is not an authenticity or privilege check. Dashes/spaces are normalised. The number can be left blank to continue identity setup; the authority review remains pending. Numbers are encrypted using AES-256-GCM, a random 96-bit IV, and authenticated additional data binding the ciphertext to the driver, submission ID, and issuing province. Only ciphertext/IV and submission metadata enter the application database; no number hashes or last digits are stored. Licence photos and selfies still go directly to Stripe. The plain number is never included in `/api/state`, listings, review queues, notifications, or routine application logs. Do not enable request/response-body capture, session replay, analytics capture, or third-party error tooling on these screens/endpoints.

A verified operator opens the review queue and uses **Licence review session → Unlock for 10 minutes**, entering their current operator password and confirming the authorised purpose once. During that fixed session they use **Private licence submission → View number for authority check** for each driver without re-entering the password. Access is rate-limited and logged with actor, submission ID, purpose, and time, without the number. Self-access as an operator is prohibited. The response uses `Cache-Control: no-store`; the browser clears the reveal after 60 seconds, when its tab is hidden, or on Hide/close. It does not write the number/password to local/session storage or copy it to the clipboard. These controls do not prevent an authorised person taking screenshots or manually copying data; handle it only for the authorised check. The unlock is bound to the current authenticated login, does not extend when numbers are viewed, and is invalidated by logout, expiry, or **Lock access**. Locking hides numbers in the current queue immediately; other tabs recheck on focus and all reveal requests check the server grant. Closing the queue alone leaves the ten-minute grant active, so it can be resumed. Password confirmation is not MFA: configure additional account/access controls before broader operations.

Record the authoritative result using the latest submission ID. Also confirm the number and licence holder match the verified identity using appropriate supporting evidence: a valid licence number entered by a driver does not itself establish ownership, and the current Stripe result does not automatically match that submitted number. Authority validity/class/restrictions and insurance checks remain separate. A replacement number invalidates licence approval. Stale submission IDs cannot be approved after replacement. No public approval bypass or government API credentials exist in this integration.

**Retention:** pending ciphertext is cleared from active rows upon licence approval/rejection, driver deletion/consent withdrawal, operator deletion, or after 30 days. Expiry cleanup runs on state requests and the existing five-minute Worker cron; expired records cannot be revealed even before cleanup. Driver withdrawal clears eligibility consent and suspends licence approval. Metadata and number-free access/review logs remain for accountability; determine their legal retention/deletion schedule before general launch. D1 backups/time-travel and underlying storage may retain encrypted historical copies until Cloudflare retention periods end; clearing the active row does not erase those copies immediately. No normal plaintext export or email delivery is implemented.

Transport: the deployed Worker requires HTTPS for number submission/reveal/deletion, except loopback Wrangler development. The Node development server permits loopback HTTP only when secure mode is off; the standalone production Node server needs a reviewed TLS transport integration before enabling this feature behind a proxy. The implementation deliberately does not trust arbitrary forwarded-protocol headers.


## Short operator review sessions

Migration 0010 stores an expiring, server-side unlock grant linked to the existing hashed login-session token. Passwords and unlock bearer tokens are not saved in browser storage. The unlock lasts at most ten minutes or until the login expires, with no sliding extension on reveals. Operator verification and driver consent checks still run on every reveal. Manual lock removes the grant; deleting a login session cascades to its grant. Unlock/lock events and individual reveals are audited without recording numbers or passwords. Separate logins do not inherit access. Failed password unlocks remain rate-limited separately from batch reveals. The UI shares a single unlock across every driver in the open queue, shows remaining time, and keeps per-number hiding after 60 seconds/tab visibility changes. An older client may still perform a fresh password confirmation on a reveal; it receives the same short-lived grant.

## Landing promotions and account pages

The landing page explains the owner-funded $25 CAD founding-driver bonus, limited to 25 eligible approved claims. See the funded founding-driver workflow below for current terms, deployment start, trip confirmation and manual Interac recording. Online ride-fare collection remains unavailable; signups and reservations alone never count as completed trips.

Account access now uses full pages at `/join` and `/login`; `/join?role=driver` starts driver signup. Both use the existing secure account API and password login, with explicit password visibility and password-manager support. This change does not add passwordless login, social login, passkeys, or mandatory passenger identity checks. The driver/rider choice sets the initial flow, not a permanent role restriction. Driver signup continues to the guided checks. Guest booking selection is resumed after successful sign-in. Browser Back and the page's Back to rides return to the site; refresh/direct navigation works through the existing SPA fallback.

## Simple signup and private rider profiles

Account creation remains first name (public profile name), email, password, and terms. Rider signup then opens a three-step profile, also available via Account → Complete rider profile or `/?rider-profile=setup`. Drivers still start their existing driver checks. No home address, government ID upload, or emergency contact is collected in this rider profile. The pilot requires riders to be 18 or older. The server validates the calendar date and age cutoff using America/Toronto's date; the DOB/name are self-reported and are not an identity check.

Before any new rider booking, both API and database require a current private profile plus verified email and mobile phone. Existing reservations remain visible and cancellable even if details are deleted/expire. Registration, browsing, and posting a driver listing are still available without a completed rider profile. Anyone—including a driver—needs a rider profile when booking a seat. Backend gating applies to native clients too; the current native account screen links to the website to complete this profile.

Legal name and DOB are separately AES-256-GCM encrypted using the configured `LICENCE_ENCRYPTION_KEY`, random 96-bit IVs, and an authenticated `ridely-rider-profile-v1:<user-id>` context distinct from licence submissions. No extra key setup is needed if encrypted licence storage is already active. The key remains a Cloudflare secret, separate from D1 data. Contact email and phone continue to be held in the existing protected account records; the extra application-layer encryption specifically covers name/DOB. `/api/state`, public listings, driver passenger lists, notifications and ordinary support queues expose no legal name/DOB or passenger phone. Profile completion is never presented as identity verification. Users can explicitly read their own private details over authenticated, no-store HTTPS responses and delete them from the profile screen. No automatic exports, phone sharing, or ID-verification claims are introduced.

The private profile expires 365 days after its last save and must be renewed before new bookings. Expiry clears ciphertext and the adult declaration from active rows through state requests or the Worker cron. User removal deletes the active profile row. Booking/contact/incident records remain separate. Provider backup/time-travel retention can retain encrypted historical copies; do not promise immediate physical erasure from all backups. Define incident-record and access-log retention and review the privacy policy with the operator's legal/privacy adviser before general launch. The early-access policy explains these distinctions.

SMS is required to verify a phone. Configure the existing `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` secrets with an appropriate SMS-enabled number and permitted destinations; email uses the existing Resend settings. If SMS/email/private-storage configuration is absent, the interface clearly explains what is unavailable. No verification bypass or client-only completion flag is accepted. Tests mock external delivery; no paid messages were sent during development.

Operator access to private rider details is **incident-only**, under the support operator screen. It requires the verified `RIDELY_ADMIN_EMAIL` account, current password confirmation, a booking ID, a related support-ticket/member-report ID, an allowed purpose (accident, safety report, lawful request), and an authority acknowledgement. The record is never an ordinary driver lookup or passenger directory. Each access records operator/rider/booking/case/purpose/time without the private details. The UI hides results after 60 seconds or when the tab is hidden. Licence-review unlocks do not confer incident access. The form does not automatically establish that a request is legally valid: the operator must assess access/disclosure authority. Self-reported details may be inaccurate; do not infer accountability or guarantee safety from collection alone.

Local test fixtures now explicitly seed completed rider profiles and verified contacts for existing booking tests. Those placeholder records exist only in temporary/local test databases; no production bypass flag or test-approval endpoint is available. Migration 0011 adds the real booking gates, encrypted-profile storage, and incident access logs.

### Driver and passenger trip workspace

My listings now opens a dedicated three-column desktop dashboard (itinerary/map,
passenger bookings, pending custom-stop decisions). My trips opens a two-column
booking page (full itinerary/map, driver/booking/custom-stop summary). Both adapt
to phones and have a selector when the account has multiple journeys. Marketing
sections are excluded from these management views.

The shared itinerary includes every approved active custom stop in request row
order, grouped after the corresponding standard meeting point, matching the
existing public itinerary. Pending, declined and cancelled requests are excluded.
Public stops carry opaque request IDs only to match owner-authorised private
requests; public addresses and coordinates remain excluded. Drivers see their
ride's exact approved addresses; riders see only their own exact addresses.
Others' custom map pins use the standard meeting area. Nearby markers are grouped
so all stop numbers remain visible at intercity zoom. City centres are the fallback
for older unpinned standard stops.

Maps remain Leaflet/OpenStreetMap, not Google Maps. The dashed stop overview is
explicitly not a calculated road route or live tracking. Road previews during
approval still use the configured routing provider. Original listed times are
shown for standard stops; uncalculated custom-stop times require driver
confirmation rather than fabricated ETAs. No new payment or paid-status claims
are introduced. Online payments remain unavailable.

### Pilot cities and preset meeting points

Search and ride posting use the shared four-city catalogue: Montréal, Longueuil,
Ottawa and Gatineau. Both server runtimes reject new rides outside those cities.
Existing rides are retained. Test fixtures use pilot routes. Mobile city defaults
also use the pilot catalogue.

`packages/core/meeting-points.js` holds six owner-selected meeting points and the
exact Google Maps short links supplied in the conversation: Longueuil taxi stand,
Burger King Namur, Berri-UQAM Sainte-Catherine exit, Universal Grocery ByWard,
St-Laurent Shopping Centre near Starbucks, and Walmart Saint-Joseph Gatineau.
McDonald's is excluded. The website requires a preset in those cities. The API
validates supplied preset IDs against the selected city and canonicalises names;
legacy clients may still post text meeting points. Canonical presets and their
links are returned on listings, booking review, and trip itineraries without a
schema migration. No guess of a street address or precise coordinates is stored.

Google short links could not be resolved under this environment's network policy.
They are external location links, not a Google Maps API integration. For custom
stops, the full-page posting form requires the driver to confirm both precise
standard pins after consulting those links. The map explicitly starts at the city
centre rather than claiming that it has geocoded the selected location. Presets
are owner selections, not evidence of parking/loading permission.

Offer a ride now opens a dedicated responsive page with route/date, vehicle/fare,
optional custom-stop controls, and a live review sidebar. Publishing uses existing
server validation and driver-approval gating. No payments are collected online.

### Pilot cash payments

Drivers collect the displayed booking fare and approved custom-stop fees directly
from passengers in cash during the pilot. Listings carry a cash badge; posting,
booking review/confirmation, driver and passenger trip pages, landing copy, footer,
and payment policy explain the arrangement. Passenger booking totals are labelled
"Cash due to driver" for active rides. Cancelled rides do not show collection
instructions. This is payment-method messaging, not a payment processor or cash
collection ledger: no booking is marked paid and no driver payout is claimed.

### Funded founding-driver bonus — manual Interac workflow

The owner authorised $25 CAD for up to 25 drivers ($625 maximum bonus allocation,
excluding any bank transfer fees). Migration 0012 activates campaign `founding-25`
at its deployment timestamp; public terms show that start in Eastern time. It is
not backdated. Eligible departures connect Montréal/Longueuil with
Ottawa/Gatineau after the campaign starts. Three distinct departures are needed,
not three seats on one trip. Drivers must have current live identity, licence and
insurance approval when marking a trip complete, after its listed arrival. A
booked passenger with verified email/phone must separately confirm travelling.
Sandbox identity never qualifies. Cancelled trips and duplicate departure times
are excluded; operators must review genuine travel and duplicate-person/account
abuse before approval. Confirmations are attestations, not GPS or cash-payment
proof. No automatic fraud-proof eligibility claim is made.

Drivers see progress in My listings and Account, accept the bonus terms and
submit a private Interac recipient email after three qualifying trips. Only the
claimant and verified operator can access that email. Support queue → Bonus review
& manual payments lists claims with trip evidence and the committed budget.
The first 25 eligible operator-approved claims reserve allocations. Pending
claims do not reserve funds. A database trigger enforces this cap atomically;
rejecting an unpaid claim releases its allocation. Self-review is forbidden.

After approving a claim, the operator must send exactly $25 through their own bank,
verify the recipient and bank history, and then record the unique transfer
reference with an explicit already-sent confirmation. This website does NOT
initiate, retry or settle Interac transfers. A recorded `paid` status means the
operator attested that the transfer was sent, not that the recipient deposited it.
The bank history is authoritative if a transfer was sent but its record failed to
save. Never send another transfer merely because a record is missing. No automatic
emails or bank calls are made by this flow. Passwords, banking credentials and
security answers are never requested. Paid records are immutable and all status
changes are audited. Review notes are visible to the driver; keep them free of
other members' private data. Claims cannot be edited after submission; corrections
and rejected-claim disputes go through support. Retain bank evidence/accounting
records under the operating business's applicable retention requirements.

Passenger ride fares remain cash paid directly to drivers, separate from this
Ridely-funded promotion. No fee collection, Stripe Connect or automatic driver
fare payout has been activated. Campaign closes to new approvals at 25 funded
allocations; landing status reflects exhausted allocations. Production start and
availability require successful Cloudflare deployment/migration, not just a push.

### Booking credits — two free, then $3.99 CAD each

The owner superseded the free-unlimited-bookings pilot with: each account gets two
booking credits automatically, then additional credits cost $3.99 CAD each. One
credit covers one reservation, regardless of seat count; driver fares and approved
custom stops remain cash paid directly to the driver. Accounts/listings stay free.
Migration 0013 backfills existing accounts once and adds a welcome-credit trigger
for new accounts. Existing reservations are not retroactively charged. No expiry
is set and credits are not transferable or cash-withdrawable.

The immutable integer ledger tracks welcome, operator grants/reversals, purchases,
reservation use and cancellation restores. SQLite/D1 triggers consume a credit
within the booking transaction and reject reservations/rebookings with no balance.
Failed inventory/profile/driver checks consume nothing. Booking/driver cancellations
restore a spent credit exactly once per booking cycle; cancelling/rebooking cannot
mint extra credits. Cancellation restores a credit, not a cash refund. Welcome
credits cannot be manually reversed. The operator can issue 1–100 additional
complimentary credits to a verified account, with a visible reason and idempotency
reference; own-account grants are forbidden. No automated paid-credit grant exists
without verified checkout completion.

Account → Booking credits shows the private balance, history, credit terms,
quantity selector and $3.99 price. The booking review states the credit requirement
separately from the driver's cash fare and opens Account if credits are exhausted.
Support queue → Manage promotional credits supports exact verified-email lookup,
grants and reversal of a manual grant where the balance permits. Operators cannot
edit/delete ledger history.

#### Stripe credit checkout setup

Purchases are disabled by default. They use the Ridely Stripe account and dedicated
runtime secrets (never enter these in chat or commit them):

- Secret `STRIPE_CREDITS_SECRET_KEY`: start with the sandbox `sk_test_` key.
- Secret `STRIPE_CREDITS_WEBHOOK_SECRET`: the `whsec_` signing secret for a Stripe
  event destination at `https://ridely.ca/api/credits/webhook` subscribed to
  `checkout.session.completed` in the same test/live mode as the key.
- Runtime text `CREDITS_PAYMENTS_ENABLED=true` after both secrets and the event
  destination are configured. `RIDELY_PUBLIC_URL=https://ridely.ca` is already used.

The API requires HTTPS for return URLs, calculates $3.99 per credit on the server,
accepts 1–10 per checkout and ignores client prices. Card data is collected by
Stripe hosted Checkout. Mode is checked against the configured key. The webhook
validates the exact raw-body HMAC signature and timestamp, then independently
retrieves the saved Checkout session from Stripe. Session owner/order, currency,
amount, mode and completed/paid status must match before crediting. The browser
return does the same provider retrieval; it cannot supply a paid flag. Ledger
purchase keys prevent duplicate credits across retries, return visits and webhook
replays. Unknown unrelated checkout events are ignored. Confirm the webhook is
receiving deliveries; a browser return alone is not the delivery strategy.

Use sandbox test cards to verify purchase, credit consumption and cancellation
before switching this dedicated key and webhook destination/signing secret to live
mode. This work sent no real charges. Account shows an explicit TEST checkout label
when using the test key. Sandbox purchases are restricted to the verified operator account; other riders
see purchases as unavailable until a live key is activated. Only activate live
collection after support/purchase refund/dispute procedures and business tax setup
are settled. Card refunds and chargebacks are not automatically reconciled into
credit balances in this release; track them in Stripe and resolve them with support
before making further credits spendable. Do not represent cancellation-credit
restores as bank refunds. The application does not enable Stripe Connect or driver
fare payouts.

### Landing, search and top navigation

The landing route `/` contains the introduction, rider/driver tabs, benefits and
calls to action. It no longer renders the search form, ride cards or result count.
Search rides opens `/search`; this page owns the search form and results, with no
landing marketing sections. Search submissions preserve the four-city route,
date and seat count in URL parameters for refresh/direct links. Browser Back and
brand links restore the landing/search view correctly. `/my-trips`, `/my-listings`
and `/saved` also have view paths; the posting form still opens as a full-page
application flow after sign-in.

Top navigation includes Search rides, Post a ride, Help and guest Sign up/Log in;
member-only links remain available after authentication. Mobile gets visible
Search/Post quick actions as well as the navigation menu. Daily rides and locale controls remain unimplemented; the booking-credit cart is
described below. Future-feature sections remain on the
landing page only. Search has concise booking-credit/cash-fare guidance instead of
the repeated marketing sidebar.

### Prominent search and booking-credit cart

Desktop Search rides is a solid blue primary navigation button, with the matching
mobile quick action. The always-visible cart icon/label and quantity badge open
`/cart` for guests and members. This cart contains additional booking credits at
$3.99 CAD each, not passenger seats or driver cash fares. It supports an empty
state, quantities 1–10, removal, an order summary and sign-in return to the cart.
Only the draft quantity is stored in localStorage (`ridely.credit-cart.v1`); balances
and purchases remain server-authorised. Account's credit selector now sends the
chosen quantity to this cart for review, using the same guarded Stripe checkout.
Cart quantities survive refresh/login and clear on server-confirmed purchase.
Cancelling Stripe checkout returns to `/cart` with the draft intact. Payment
activation requirements and sandbox operator restrictions remain in force.

### Pickup wait and six-hour cancellation policy

Drivers must wait at least ten minutes at the agreed pickup point, measured from
the later of the agreed pickup time and the driver's arrival. This is a displayed
operating policy; arrival/check-in timers are not implemented. No automatic no-show
penalty is introduced. The check-in screenshot is a proposed design only.

Passenger online cancellation is permitted at least six hours before the original
listed ride departure, interpreted in America/Toronto time. At the exact six-hour
boundary it is allowed. Later cancellation requests must go through support; they
do not automatically cancel the booking. Driver-cancelled rides can still be
removed by passengers without this restriction. The API enforces the cutoff and
My trips replaces cancellation with a support link that includes the booking
reference. Credit restoration occurs only after actual cancellation.

Migration 0014 adds operator cancellation review fields and an audit trigger.
Support queue → the rider's ticket → Review a cancellation request lets the verified
operator approve a booking cancellation with a reason. The ticket must belong to
that booking's rider; ordinary members cannot invoke the action. The cancellation,
credit restoration and audit entry occur in the same database update transaction.
Repeat approvals cannot restore extra credits. Cash already exchanged must be
resolved separately; no automatic bank refund is made.

### Drivers cancelling listings

A driver can cancel their own listing at any time only if it has zero active
(non-cancelled) passenger reservations. Once at least one active booking exists,
My listings replaces Cancel ride with Contact support to cancel listing. The
support form includes the ride reference and a driver-cancellation subject. If
all passengers cancel their bookings, driver self-cancellation becomes available
again. This does not change the passenger six-hour cancellation cutoff.

Both runtimes use one conditional SQL update with NOT EXISTS(active bookings),
so a stale browser or concurrent new booking cannot bypass the restriction.
Support queue → driver ticket → Review a driver listing cancellation allows the
verified operator to cancel a ride belonging to that ticket's driver, with a reason.
Migration 0015 audits approved ride cancellations. Existing database triggers notify
passengers in Ridely and restore any spent booking credits once; no bank refund
or cash-fare collection occurs. A support request alone leaves the ride active.
