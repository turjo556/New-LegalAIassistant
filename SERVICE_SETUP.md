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

## Rider contact verification — email only

The pilot no longer collects or verifies a phone number during rider setup.
Verified email and a current encrypted adult rider profile are required; driver
identity, driving privileges and insurance approval remain separate and mandatory.
Twilio is not required. SMS capabilities are disabled even if old Twilio variables
exist, and old clients attempting phone-code send/confirm receive HTTP 410. No
phone status is automatically marked verified. Previously stored contact data is
not deleted or fabricated by this change.

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

A verified operator signs in normally and uses **Private licence submission → View number for authority check**. There is no separate operator key, password confirmation, or ten-minute unlock step for licence reviews. Each reveal checks the configured operator email, verified email, active login session, driver consent, submission status and expiry; the login is checked again before returning the number. Access is rate-limited and audited without recording plaintext. Self-access as an operator is prohibited. Responses use `Cache-Control: no-store`; the browser hides numbers after 60 seconds, when its tab is hidden, or on Hide/close. Plain numbers are not placed in browser storage or copied automatically to the clipboard. Log out when leaving an operator device unattended. The Cloudflare encryption secret remains required and is never entered in the review interface.

Record the authoritative result using the latest submission ID. Also confirm the number and licence holder match the verified identity using appropriate supporting evidence: a valid licence number entered by a driver does not itself establish ownership, and the current Stripe result does not automatically match that submitted number. Authority validity/class/restrictions and insurance checks remain separate. A replacement number invalidates licence approval. Stale submission IDs cannot be approved after replacement. No public approval bypass or government API credentials exist in this integration.

**Retention:** pending ciphertext is cleared from active rows upon licence approval/rejection, driver deletion/consent withdrawal, operator deletion, or after 30 days. Expiry cleanup runs on state requests and the existing five-minute Worker cron; expired records cannot be revealed even before cleanup. Driver withdrawal clears eligibility consent and suspends licence approval. Metadata and number-free access/review logs remain for accountability; determine their legal retention/deletion schedule before general launch. D1 backups/time-travel and underlying storage may retain encrypted historical copies until Cloudflare retention periods end; clearing the active row does not erase those copies immediately. No normal plaintext export or email delivery is implemented.

Transport: the deployed Worker requires HTTPS for number submission/reveal/deletion, except loopback Wrangler development. The Node development server permits loopback HTTP only when secure mode is off; the standalone production Node server needs a reviewed TLS transport integration before enabling this feature behind a proxy. The implementation deliberately does not trust arbitrary forwarded-protocol headers.


## Operator login access

Licence reviews rely on the normal authenticated operator session. Migration 0010 remains as historical schema, but its separate unlock grants are no longer used. Legacy unlock/lock/status endpoints return 410 and cannot enable additional access. Logout, deleted sessions and expired logins prevent further reveals. Incident-only rider-detail access retains its separate case-specific controls.

## Landing promotions and account pages

The landing page explains the owner-funded $25 CAD founding-driver bonus, limited to 25 eligible approved claims. See the funded founding-driver workflow below for current terms, deployment start, trip confirmation and manual Interac recording. Online ride-fare collection remains unavailable; signups and reservations alone never count as completed trips.

Account access now uses full pages at `/join` and `/login`; `/join?role=driver` starts driver signup. Both use the existing secure account API and password login, with explicit password visibility and password-manager support. This change does not add passwordless login, social login, passkeys, or mandatory passenger identity checks. The driver/rider choice sets the initial flow, not a permanent role restriction. Driver signup continues to the guided checks. Guest booking selection is resumed after successful sign-in. Browser Back and the page's Back to rides return to the site; refresh/direct navigation works through the existing SPA fallback.

## Simple signup and private rider profiles

Account creation remains first name (public profile name), email, password, and terms. Rider signup then opens a three-step profile, also available via Account → Complete rider profile or `/?rider-profile=setup`. Drivers still start their existing driver checks. No home address, government ID upload, or emergency contact is collected in this rider profile. The pilot requires riders to be 18 or older. The server validates the calendar date and age cutoff using America/Toronto's date; the DOB/name are self-reported and are not an identity check.

Before any new rider booking, both API and database require a current private profile plus verified email and mobile phone. Existing reservations remain visible and cancellable even if details are deleted/expire. Registration, browsing, and posting a driver listing are still available without a completed rider profile. Anyone—including a driver—needs a rider profile when booking a seat. Backend gating applies to native clients too; the current native account screen links to the website to complete this profile.

Legal name and DOB are separately AES-256-GCM encrypted using the configured `LICENCE_ENCRYPTION_KEY`, random 96-bit IVs, and an authenticated `ridely-rider-profile-v1:<user-id>` context distinct from licence submissions. No extra key setup is needed if encrypted licence storage is already active. The key remains a Cloudflare secret, separate from D1 data. Contact email and phone continue to be held in the existing protected account records; the extra application-layer encryption specifically covers name/DOB. `/api/state`, public listings, driver passenger lists, notifications and ordinary support queues expose no legal name/DOB or passenger phone. Profile completion is never presented as identity verification. Users can explicitly read their own private details over authenticated, no-store HTTPS responses and delete them from the profile screen. No automatic exports, phone sharing, or ID-verification claims are introduced.

The private profile expires 365 days after its last save and must be renewed before new bookings. Expiry clears ciphertext and the adult declaration from active rows through state requests or the Worker cron. User removal deletes the active profile row. Booking/contact/incident records remain separate. Provider backup/time-travel retention can retain encrypted historical copies; do not promise immediate physical erasure from all backups. Define incident-record and access-log retention and review the privacy policy with the operator's legal/privacy adviser before general launch. The early-access policy explains these distinctions.

Email verification uses the existing Resend configuration. SMS is no longer required or enabled. Missing email/private-profile configuration still blocks booking. Tests mock delivery; no real messages are sent during development.

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

### Vehicle identification

Migration `0016_vehicle_identification.sql` adds licence plate, issuing Canadian province/territory and car colour. New listings require all three; old listings remain readable and owners can add them in My listings → Update plate & colour. Existing passengers may see “Not provided yet” until the owner updates the listing. Plate numbers are normalized to uppercase without spaces or hyphens. Public search exposes colour, while plate and issuing province are returned only in the owner's hosting data and active booked passengers' trip data. Cancellation removes passenger access. Changes notify active booked passengers. These details are driver-provided and do not constitute a registration or ownership verification; changing plate/colour does not change the separately reviewed vehicle make/model.

### Driver posting gate

Ride publication now requires verified email and current live identity, issuing-authority driving eligibility and insurance approval for the exact selected vehicle and trip date, in both Node and Cloudflare APIs. Rider accounts can start driver setup, but cannot publish before approval. Stripe sandbox results do not qualify. The web Post ride flow links unapproved members to driver setup. Previously posted pending listings remain unbookable; no bookings are enabled by this change.

### Optional member photos and private ride drafts

Migration `0017_profiles_and_ride_drafts.sql` stores one small optional photo and one private ride draft per account. Both riders and drivers can upload/change/remove a photo in Account. Browser accepts JPEG/PNG/WebP up to 10 MB, crops to 256 square, converts to JPEG. The backend separately decodes with resolution/memory/byte limits and re-encodes pixels only, stripping EXIF and original metadata; original files are not retained. Only the authenticated owner can mutate their photo. Upload requires acknowledgement of public visibility: driver photos appear on public listings; rider photos appear to their driver in booked trip details. Photos are served as JPEG with nosniff and no-store, so removal also invalidates prior URLs. Initials remain the default. No face identification is performed. Database storage is intended for the small pilot; at scale move photos to object storage with moderation/retention controls.

The earlier pre-form driver gate is replaced: all members can fill the ride form and save a draft first, then proceed to driver verification. Drafts are account-bound and excluded from public rides and booking inventory. My listings and driver setup link back to the draft. Publication still requires email/live identity/licence/insurance approval for the vehicle and trip date in both APIs. Publishing clears the draft. A member can also delete their draft explicitly. Changing devices restores the server draft, rather than putting licence plates or trip plans in localStorage. Close/back without saving discards unsaved edits.

Ride departure and estimated arrival use 15-minute increments (`:00`, `:15`, `:30`, `:45`) in Eastern time. Website selects provide all 96 quarter-hour choices; native time selection rounds to a quarter hour. Both publication APIs and draft saves reject off-increment times. Existing posted ride times are retained; an older off-increment draft must choose valid times before it can be saved or published.

### Electric-lime brand rollout

The approved lime/near-black/off-white homepage concept is implemented in `LimeLanding.jsx` and `lime-theme.css`, with self-hosted Inter and Archivo Black fonts and three local compressed WebP marketing images (~370 KB combined). The photos are generated illustrative scenes based on the approved concept, not actual members or verification evidence. The landing page retains separate Search/Post routes and real campaign terms/availability; bonus text changes when allocations are exhausted. Driver draft/verification gates, booking credits and cash fare rules are unchanged. The brand extends to navigation, signup, posting, account and trip screens; mobile layouts include visible Search/Post actions. Node static MIME types now cover WebP and self-hosted font files. GitHub main triggers the existing Cloudflare build connection; direct deployment still requires authenticated Cloudflare access in this workspace.

### English / Québec French website

The English/Français control is available in the main navigation and the signup/ride forms. Language switches rerender the interface without reloading or clearing form state. `?lang=fr` or `?lang=en` can select a language on entry; preference persists in `ridely.locale` localStorage. Without an explicit preference, the browser's French language selects French. Document language/title and visible labels follow the selection; user-written names, messages, vehicle descriptions, addresses and review notes remain verbatim. This is not machine translation of member content.

The Vite JSX factory uses `i18nElement` to localize rendered presentation strings from the checked-in French dictionary. It does not rewrite the DOM after render or alter component/API state. Option labels may be translated, but original option values are retained explicitly, including car colours and driver-review decisions. Machine fields (paths, IDs, class names, codes, prices sent to APIs, province/city IDs) are not translated. Preserve `translate="no"` around member-generated text when adding new screens; add visible system copy to `apps/web/src/locales/fr.json`. Dynamic display patterns and date/currency formatters live in `i18n.js`. Times remain Eastern, and limits/fees/verification/cancellation rules are unchanged.

Verification-code emails and texts requested through the website use its current `Accept-Language` header. Delivery still requires the existing provider configuration. Scheduled trip-update emails remain English; external provider screens use their own language support. The French policy copy reflects the same provisional operating policies and still needs the same legal review as the English version. Operator-only legacy tools and new/unmapped system messages fall back to English until translated, rather than changing any stored records.

### Pilot trip safety tools

Migration `0018_trip_safety.sql` adds boarding checks, expiring share links and private safety feedback, plus safety categories/priority and booking references on reports. These tools support identity/vehicle checks and reporting; none guarantees safety, proves physical boarding, provides GPS tracking, or triggers an emergency response.

- **Boarding:** only the booked passenger can request a six-digit code. Only the ride owner can confirm it for that booking. Codes are hashed with the booking ID, expire after 15 minutes, are hidden in the passenger interface after 2 minutes or tab hiding, and are replaced when regenerated. Five confirmation attempts per booking per ten minutes are allowed, across regenerations. Confirming clears the stored digest. Neither ordinary state, the driver status response nor public share links return the code. Cancellation deletes the check. Driver/passenger names and vehicle details are checked separately; driver profile photos remain optional and self-provided.
- **Trusted contact:** a member can explicitly consent to creating a link for their own booking or driver listing. Tokens use 256 random bits; only SHA-256 token hashes are stored. The browser link uses a URL fragment, and the public page posts the token to the API rather than putting it in a query string. Responses are no-store. Links expire within 24 hours or four hours after listed arrival, whichever is sooner, and can be revoked individually. Related booking/ride cancellation revokes them. The shared view includes the public meeting points, listed date/times, driver profile name and car/colour/plate, approximate approved-stop cities and optional code-confirmation status. It excludes passenger identities, private custom addresses/coordinates, contact details, messages, fares, feedback and codes. It is a planned itinerary, not a GPS trace, driving order guarantee or emergency alert. Holders can copy or screenshot data; revocation cannot recall those copies. Use only trusted recipients. Production request/response body capture must remain disabled for these endpoints. Links recheck availability every 30 seconds; copies already loaded may remain visible until the next request.
- **Reports and feedback:** booked parties can file a mismatch, unwanted-contact, unsafe-driving or other safety report with the booking reference. Reports are private to authorised support, rate limited and not anonymous. Passenger feedback opens after the driver or passenger has marked the journey complete. Each booking has one feedback record. Uncomfortable, mismatch or conduct-concern answers atomically create a private report via a SQL trigger; mismatch/conduct cases are prioritised. Reports are sorted by safety priority in the operator queue and the verified operator gets an in-app notification. Other passengers, the driver and public link holders cannot retrieve confidential feedback. Reports do not automatically ban a member, cancel a booking, issue a refund, call 911 or establish that an allegation is proven. Review and document actions through the existing support/cancellation tools. No completed-trip claims were made with real participants during testing.
- **Support availability:** the operator explicitly committed to monitoring support 24/7 during the pilot. The public label is “Professional support · Available 24/7 during the pilot”; it does not identify the person staffing it. `PILOT_SUPPORT_24_7=true` is a non-secret Worker variable; the label also requires a configured operator account. This is an operational commitment, not evidence of response performance or emergency monitoring. Monitor the support inbox, priority queue and in-app notifications accordingly; notifications alone do not provide pager/on-call escalation. Update the flag and public copy if coverage changes. In immediate danger in Canada, users are directed to call 911. Support requests do not cancel bookings automatically.

Public meeting-point reminders ask members to confirm lighting, opening hours and a permitted loading location. No venue has been independently safety-certified by this implementation; a real-world venue review remains operational work. Sharing/boarding/reporting work in English and French. Rider/driver safety panels appear in trip details; no external mapping service is loaded on the trusted-contact page.

### Pilot seat-fare recommendation and cap

Base seat fares are recommended at **$25 CAD** and capped at **$30 CAD per person** across the pilot corridor. The posting form defaults to $25 and displays both amounts. The existing $5 minimum remains. Node/Worker publication, draft saves and owner price edits share strict cent validation; booleans, non-finite values, more than two decimals and amounts above $30 are rejected. Custom-stop fees remain optional, approved and disclosed separately; booking credits are also separate.

Migration `0019_seat_fare_cap.sql` lowers active unbooked legacy listings above the cap to $30 and notifies their owners. Existing reservations keep their agreed cash totals. Over-cap listings with active bookings are hidden from new searches and cannot take new reservations until their owner lowers the listing price. My listings includes a seat-price editor; updates apply to future reservations only, and a listing with active bookings may only be lowered. Once all bookings are cancelled it may be raised again within the cap. SQL triggers backstop the cap for new/updated fares and new/reactivated bookings. Old drafts above the cap must be corrected before saving or publishing.

Seat-fare entry now preserves an empty field while typing instead of converting deletion to zero, preventing `025` when entering `25`. Numeric input text is normalised on blur and converted for submission. New seat fares and price edits use whole dollars only (step 1); custom-stop fees and the $3.99 booking-credit price retain their separate precision. Seat summaries and whole-dollar cash totals omit `.00`, while genuinely fractional agreed totals remain exact. Migration `0020_whole_dollar_fares.sql` rounds active unbooked legacy fractional seat fares down and notifies owners. Already-booked fares remain as agreed; fractional legacy listings are hidden from new searches and bookings until their owner sets a whole-dollar fare. SQL triggers enforce whole-dollar base fares for new/updated listings and new/reactivated reservations.

### Native Ridely app refresh (iOS and Android)

The mobile app now uses Ridely branding and native account/check, credits, photo, itinerary, boarding/share/report and support-ticket screens. It imports the pure `packages/core/trip-itinerary.js` helper also re-exported by the website, preserving address visibility rules. There are no backend schema or payment activation changes. Native requests require an explicitly configured API origin; preview builds have no automatic live destination. Sessions are scoped to that origin and retained in device-only SecureStore. Production EAS configuration names ridely.ca but no build/submission was run.

Native paid-credit purchases and push alerts remain unimplemented. Android exact pins currently use manual coordinates; canonical meeting-point links open externally. Finalise Android maps, device behaviour, store/payment policy, account deletion/recovery and release disclosures before store submission. Stripe-hosted identity returns to the website; users return to the app to refresh the server result. The proposed `ca.ridely.app` identifiers still require owner/account availability confirmation. See `apps/mobile/README.md` for the tested workflows and outstanding release gates. No live charge, verification or booking was made during testing.

### Expo Go SDK 58 compatibility

Updated the native app from SDK 54 to SDK 58 and matched React 19.3 / React Native 0.88 plus native modules to the Expo 58 bundled matrix. The website keeps React 19.1. Removed the root-wide React overrides and added native Metro runtime isolation; both platform source maps contain only the mobile React/RN implementation. Existing users must stop Metro, pull, run root `npm ci`, and restart from `apps/mobile` with `npx expo start --clear`. Expo project ID and backend/payment activation settings are unchanged. iPhone Expo Go/device execution remains a user-side check; no signed build was run.

### Isolated native test deployment

`npm run mobile:test:setup` prepares the separate `ridely-app-test` Worker/D1 through the owner's Wrangler login. Configuration and synthetic logins/independent encryption key are saved in ignored `.ridely-test/` files. Production database IDs are rejected, routes/provider secrets are not inherited, and an existing same-name unmarked database is refused. `apps/worker/mobile-test.js` requires its activation variable and database marker and exposes only synthetic sign-ins, with provider/admin/signups/private-detail uploads blocked. The normal production entry never imports it. Native test-mode notices persist on returned state after actions. `MOBILE_TESTING.md` documents the exact command and the limits of simulated approvals. Remote resources have not been created from this workspace.

### Public SEO and routing

`npm run build` now generates 18 readable English/French public HTML pages plus sitemap, robots and a 404 page. `npm run seo:check` validates built metadata, schema and assets. Public content is defined in `packages/core/site-pages.js`; `site-response.js` handles canonical/language redirects, private-screen noindex and staging exclusions. The website links these public guides into prefilled ride search. Route/service guides do not load the full app JavaScript. The homepage remains the existing interactive homepage with a pre-rendered no-JS introduction.

The Worker runs before assets for API/navigation/robots/sitemap paths; static asset requests retain the asset fast path. Assets use extensionless HTML and a real 404 page. Node's local server uses the same routing response helper. Normal `cf:dev` uses localhost to avoid simulating an insecure production host. Prices, driver policy and supported pilot cities were not changed. No SEO work connects Google/Bing accounts, submits URLs, creates a Business Profile, spends on ads or guarantees rankings. See `SEO_LAUNCH.md` for the owner's phone-friendly Search Console verification/submission steps and deployment checks.

Maps, posting and trip-workspace screens are now deferred behind local Suspense boundaries, reducing initial JS from approximately 662 KB to 481 KB before compression. The existing publish/edit flow and French/mobile layout were browser-tested after splitting. No measured live Core Web Vitals score is claimed.

### Live Stripe Identity key permissions

For an Identity-only key, grant **Identity Verification Results: Write** and leave **Recent Detailed Verification Results** and **All Detailed Verification Results** at **None**. The integration creates/retrieves verification sessions and reads their status; it does not retrieve document/selfie images or detailed reports. Leave unrelated Stripe permissions at None. Store the live secret only as `STRIPE_SECRET_KEY` on the production `ridemyway` Worker; do not change the isolated test Worker or separate credit-payment settings.

Identity recognises both standard (`sk_live_` / `sk_test_`) and restricted (`rk_live_` / `rk_test_`) keys. Returned Stripe session mode and account/user metadata are still checked. Publishable/malformed keys leave Identity unavailable. Starting a consented live check after a confirmed `test_verified` result creates a new live session and leaves bookings locked until a real verified result plus separate eligibility/insurance approval. This update was tested with mocked Stripe responses; no live session or charge was created by the coding workspace.

The web driver journey treats `test_verified` as incomplete for live identity. When the backend reports `driverVerification.mode='live'`, it offers a new consented **Start live identity verification** action and a recovery button on Final review. Sandbox-only configuration instead explains that live activation is still required. Refreshing a confirmed sandbox result with a live key leaves it pending without trying to retrieve the sandbox session using the wrong-mode credentials; starting the new consented check is a separate action. Browser checks covered this path, explicit consent and the French/mobile presentation without calling Stripe.

Stripe's `driver-verification=return` URL marker is retained while driver onboarding or its required sign-in is open, then removed with history replacement when the user closes onboarding or returns to a ride draft. Other query context and hashes remain intact. Browser checks covered signed-in draft return, signed-out authentication return, draft persistence, and refresh without reopening driver verification. This navigation change does not modify verification results or approvals.

### Dedicated website section URLs

The main app sections have refreshable URLs: `/offer-a-ride`, `/driver-verification`, `/account`, `/profile`, `/help`, `/policies`, `/notifications`, `/messages` and `/operator`. Existing `/search`, `/my-trips`, `/my-listings`, `/saved`, `/cart`, `/join` and `/login` remain. Messages use an optional `?booking=<reservation-id>`; the backend still authorises each conversation. Operator access still requires the verified configured operator account. No permissions, approvals or data-visibility rules were relaxed.

Section state is restored on direct load and browser Back/Forward. Protected sections open sign-in and restore the requested section afterward, including when the sign-in page itself is refreshed. Only known internal URLs are accepted as authentication return destinations. Posting drafts can be prepared before driver approval; publishing gates are unchanged. Existing Stripe/query-style links remain supported; new Stripe sessions return to `/driver-verification?driver-verification=return`. The marker is removed on leaving that flow. Policy links use `/policies`. New interactive account/form routes are excluded from the public sitemap and served with noindex headers. Existing public SEO guides are unchanged.

Browser verification covered direct/refresh navigation, authenticated account/driver Back/Forward, logged-out posting through a refreshed login URL, close behaviour, preserved ride drafts, booking-specific rider/driver message links and message refresh, and the existing fare/edit and live-identity restart flows. Tests use isolated fixtures and mocked Stripe responses, not real identity sessions.

### Private insurance documents

Driver verification → Final review now accepts the certificate and one optional
insurer coverage-confirmation image. JPG, PNG and WebP are converted in the browser;
PDFs currently need a readable screenshot/photo. The server validates and re-encodes
each JPEG, then encrypts both pages with AES-GCM using the existing
`LICENCE_ENCRYPTION_KEY` (separate insurance AAD). No additional provider account,
public bucket or operator key is required. Do not rotate this key without a plan
for existing encrypted licence, rider and insurance records.

Apply `0021_insurance_submissions.sql` before deploying the updated Worker
(`npm run deploy` already applies migrations). New private images expire after
30 days and are removed from active storage after the operator records a review
or the driver withdraws them. Hosting backups follow the provider's retention.
Metadata and access/review audit records remain. A new submission or driver
withdrawal resets insurance to pending; it does not approve or cancel existing trips.
Operator access is session-bound, logged, and denied for their own application.
Images hide after 60 seconds or when the page is hidden.

In `/operator` → Driver reviews, open the applicant and choose **View insurance
documents**. Match policyholder, vehicle and effective dates and establish whether
the planned ridesharing is covered, using insurer confirmation when necessary.
Upload does not establish authenticity or coverage. Record the internal evidence
reference and coverage expiry before approving. If the submission was replaced or
withdrawn, reload and review the current version. Existing externally arranged
insurance checks remain supported; the software does not contact insurers.

### Automatic preset meeting-point zones

Apply `0022_meeting_point_pins.sql` before deploying. The six original owner-selected
Google Maps links remain in `packages/core/meeting-points.js`. No replacement
coordinates or city-centre approximations are hardcoded.

The existing five-minute Worker schedule attempts to read explicit place pins
from those links for the verified operator account configured by
`RIDELY_ADMIN_EMAIL`. Missing links that cannot be resolved are retried at most
once daily. The resolver follows at most four Google-only URLs, uses a 12-second
timeout and bounded response bodies, and refuses camera (`@...`) coordinates or
ambiguous results. It does not call a paid geocoding service. Automatic setup only
inserts missing pins; it never overwrites an operator correction.

The operator can retry immediately at `/operator?section=locations` using
**Set up pins from saved links**. Each location also permits a manual correction
from its exact Google Maps place link/coordinates with explicit confirmation.
Pin changes are recorded in the audit log. No extra operator key is used.

Drivers select standard meeting points; configured pins automatically supply both
3 km zones. The posting form no longer includes pin placement, coordinate entry,
or unavailable address-search controls. If either location is unresolved, custom
stops are unavailable with a clear message; standard rides and drafts still work.
The backend overrides supplied coordinates for configured presets (including
matching canonical preset names) and rejects custom publication using unresolved
presets. Existing rides keep the coordinates stored when they were published;
changing a preset does not move their zones or existing requests.

### Essential account and document emails

Deploy migration `0023_account_emails.sql` with the updated Worker. Account
creation, email confirmation, secure licence/insurance submissions, Stripe identity
results, and operator licence/insurance decisions queue service emails automatically.
Only future events are queued; existing accounts are not sent a welcome-message
backfill. These are separate from the optional `email_updates` trip-notification
preference. No marketing, identity images, licence/policy numbers, evidence notes,
passwords or private rider details are included.

The existing Resend setup is reused: `RESEND_API_KEY` secret, verified
`EMAIL_FROM` sender/domain, `RIDELY_PUBLIC_URL=https://ridely.ca`. No new key or
provider is needed. Cloudflare starts delivery in `waitUntil` after successful POST
responses, with the existing five-minute schedule as a retry fallback. The Node
server drains the same queue every minute. Existing Stripe sessions in `processing`
are also refreshed on that schedule, without creating new checks; confirmed results
queue their emails even when a driver leaves the page.

Messages have English/French HTML and plain-text versions. Signup language is
stored; subsequent authenticated API requests with an explicit English/French
language preference update it. Only the welcome message can be sent before contact
verification. Email-verification codes keep their existing immediate send flow.

The database queue records events atomically with the state changes. A five-minute
lease and a stable Resend idempotency key prevent concurrent refreshes or retry
attempts from duplicating a message. Temporary failures retry with backoff up to
five attempts. Events older than 24 hours, superseded decisions and replaced or
withdrawn documents are not sent. This stays within the provider's idempotency
window. Missing provider configuration leaves events queued; it never claims that
an email was sent and does not block account creation or document submission.

At `/operator?section=emails`, inspect provider configuration, all-event counts and
the latest 50 events. The operator may retry recent failed messages; sent or outdated
messages cannot be resent there. Operator retries are logged. “Accepted by provider”
means Resend accepted the request, not inbox delivery. Inspect Resend's logs for
bounces/delivery and confirm `ridely.ca` is verified in the Resend account. Delivery
and inbox placement have not been verified from this development environment.

### Shared Ridely email design

All Ridely-generated account/document messages, verification codes and optional
trip updates render through `packages/core/email-theme.js`. Use `ridelyEmail`
for future email types so the same electric lime (`#c5ff28`), black (`#11120f`),
off-white (`#f5f5ec`), header, footer and buttons stay consistent.

The header includes `/images/ridely-logo.png`, a PNG rendering of the existing
website favicon, and a live-text Ridely wordmark. The wordmark remains readable
when an email client blocks images. HTML uses inline styles and presentation
tables; every type also has a plain-text version. Verification codes remain
selectable text with their existing 10-minute expiry. This changes presentation,
not verification, delivery retries, opt-in preferences or approval rules.

### Manually confirm a driver can post rides

In `/operator` → Driver reviews, choose **Checks current** (or **All applications**),
select the driver and use **Send driver approval email**. The branded English/French
message links to `/offer-a-ride` and makes clear approval applies to the vehicle
reviewed and must cover each trip date. This sends a confirmation; it never changes
or bypasses verification status.

The backend requires verified operator access, a configured email provider, the
recipient's verified email, live identity, consent, current official driving-privilege
checks, and valid vehicle-specific insurance. A fingerprint of the actual approval
is rechecked at delivery. Changed/revoked/expired approvals are skipped. Duplicate
requests reuse the recent queued/accepted message instead of sending extra copies.
Manual requests are rate-limited and recorded in the existing email-action audit
log (`account_email_retry_log`). Failed messages can be retried from Email delivery.

### Driver-approved seat requests (migration 0024)

New seat reservations on web and native clients are requests, not instant bookings.
The driver has at most two hours to respond; the deadline is the earlier of that
window or one hour before the scheduled Eastern-time departure. New requests
close one hour before departure. Pending requests do not hold seats, use credits,
expose vehicle plates or produce boarding codes. Passengers can withdraw freely.
Drivers review requests in My listings, confirm availability across their other
listings and accept or decline. There is no Kangaride integration: drivers must
update other platforms themselves. Simultaneous acceptance is protected by an
atomic SQL trigger that creates/reactivates the booking and uses exactly one
credit, retaining existing capacity and eligibility gates. A changed fare needs a
new request; acceptance never silently increases the agreed price.

Essential, bilingual branded emails are queued for both members on request and
decision, regardless of optional trip-update preferences. Confirmed booking links
open My trips for the full details/boarding tools; driver links open My listings.
An hour-one reminder is queued only while the request is still open. The existing
five-minute Worker schedule handles reminders/expiry and email retries; state
refresh also enforces expiry. Exact acceptance deadlines are enforced at mutation,
not dependent on cron timing. Email provider acceptance is not inbox delivery.
Existing confirmed reservations remain confirmed and retain their agreed fares.
Apply migration 0024 to both production and the isolated mobile test database
before running the updated clients. Production deploy already applies migrations.

The founding-driver promotion remains one $25 CAD bonus after three distinct
qualifying completed trips with at least one genuine booked passenger confirming
each journey. One passenger per trip qualifies; three passengers on a single trip
count only once. Unaccepted requests cannot qualify. Operator-reviewed claims,
manual Interac payment, first 25 approved claims and $625 total cap remain.


### Simplified pilot rider setup (migration 0025)

Migration 0025 replaces the rider booking triggers with verified-email + current
private adult profile checks and removes outstanding phone challenges. It does
not alter any stored phone-verification flags or weaken driver checks. Website
and native setup omit the phone step, account settings offer email verification
only, and bonus qualification no longer requires passenger phone verification.
A passenger who previously stopped at the unavailable SMS step becomes ready as
soon as the updated deployment loads, provided email/private details are current.
New reservations still require driver acceptance and a booking credit.

### Custom-stop fee range

Custom pickup and custom drop-off each cost $5–$10 CAD per passenger, in $1 steps.
Enabled options are validated server-side when publishing, and again when creating
a stop request; disabled options carry no supplement. Fees are independent: two
passengers using $5 pickup and $10 drop-off add $30 to their cash fare only after
both requests are approved. The driver sets the fee within the allowed range.
Existing pending/approved requests retain their recorded supplement; updates never
rewrite it. The driver can update enabled option fees under My listings →
Custom-stop fees; new requests use the revised fees. Updated web/native clients
send the displayed per-person fee so a stale price produces a review/refresh
message rather than silently accepting a changed quote. Older listing options
outside this range are hidden from new requests until the driver corrects them.
No migration changes historical requests, and the 3 km / 15-minute / explicit
approval rules remain unchanged.

### Referral code ABA01 (migration 0026)

Both driver and passenger signups accept the optional `referralCode` field.
`/join?ref=ABA01` opens signup with the code populated; add `lang=fr` or
`role=driver` as desired. It survives role/login toggles and reload in the same
browser tab. Users can remove it before signup. Native signup supports manual
code entry; app deep-link attribution is not implemented. The linked QR opens
web signup. ABA01-specific bilingual print cards are under `/downloads/`.

Attribution is stored atomically with the new user, with an immutable referral
code/timestamp. Existing accounts cannot be retroactively attributed or changed.
Invalid/paused/ended codes are rejected with a message allowing removal. Codes
do not enable special account roles. Aba has no operator dashboard, credentials,
private document access, signup email list or automatic payment permission.
No email account is required for a referral code; his mailbox is independent.

Operator → Referrals tracks referred accounts and review candidates:
- $5 per genuine, bookable published ride (drafts excluded).
- $5 when that ride is completed with at least one genuine confirmed passenger.
- $3 once per referred passenger’s first completed/confirmed trip.
Each event key is unique, and duplicate same-driver/date/departure listings are
collapsed. Candidate checks require verified account email, active pilot rides,
driver approval or recorded completion eligibility, and real trip confirmation.
A driver and passenger referral can both earn a bonus for the same trip. The
employee's $20/hour wage is separate and is not calculated by this feature.
These are review candidates; code attribution alone does not prove genuine
recruitment or prevent duplicate people using different accounts. The operator
must review that evidence before approval/payment.

Tracking begins at migration; there is no historical signup backfill. ABA01
starts enabled with no end date and a $0 bonus budget. This activates referral
capture but prevents reward approval until the operator sets an agreed budget.
Set the budget and optional last qualifying day (Eastern) in Programme budget &
dates. Pausing a code blocks new attributed signups; it does not erase existing
attribution. An end date limits qualifying events as shown. Agree these terms
with the employee separately before work; the dashboard does not create an
employment agreement or authorize unpaid hourly work.

Manual approvals reserve budget using database guards; paid + approved totals
cannot exceed the configured amount, and committed budget cannot be lowered.
Recording payment requires a previously approved, still-qualifying event,
confirmation the payment already happened, and a payroll/payment reference.
This does not send money or add booking credits. Paid rows are final and remain
in the audit if later circumstances invalidate a result. Reject unpaid invalid
claims to release reserved budget. Changes are operator-only, rate-limited and
audited; self-review of the operator's own referred account is forbidden.
Apply migration 0026 on production and the isolated mobile database before
using the updated signup clients. Automated tests use temporary databases and
mock/synthetic approvals, never real recruitment payouts.

### Compact search cards and ride detail links

Search and Saved now show compact ride cards with the date, route, times, fare, driver and passenger-seat icons. Lime means available; charcoal means booked, with only a small legend underneath. The icons use public `capacity` and remaining `seats` (confirmed, uncancelled reservations only); pending requests do not change them. Passenger identities, private stops and licence plates are not exposed.

“View ride” opens `/ride/<id>`, including on direct navigation, refresh, browser back/forward and sign-in return. The page contains public itinerary stops, meeting-point directions, driver/vehicle information, custom-stop prices and cancellation/payment rules. Its separate “Request to book” button retains the existing rider-profile, credit and driver-acceptance flow. Confirmed riders and pending requesters are directed to My trips. Unavailable, full, departed and unapproved rides cannot be requested. Dynamic ride pages serve the noindex app shell on Node and Cloudflare; marketing route pages under `/rides/` remain unchanged. No database migration is needed.

Validation: existing suite, dedicated route/auth-return tests, production web build, SEO checks and Worker dry-run. Local Chromium exercised a 3-seat ride with 2 booked seats, direct links/reload, request submission and login continuation, pending requests, unavailable rides and English/French at 320/390/1440px. Provider delivery and live deployment are separate checks.

### Google branding and search appearance

Public pages declare the stable lime/black SVG favicon, a 96×96 PNG favicon and a 180×180 Apple touch icon. Organization JSON-LD uses the 512×512 brand icon, customer support contact and Ridely.ca alternate name. WebSite and Service data identify the Canadian intercity pilot and its four cities. English/French homepage descriptions describe booking credits, driver checks, optional custom stops and cash fares without promising a particular rich result.

After deployment, use the verified ridely.ca Google Search Console property: URL Inspection → Test live URL → Request indexing for https://ridely.ca/ and https://ridely.ca/fr; submit https://ridely.ca/sitemap.xml under Sitemaps. Google's favicon, snippets, sitelinks and AI Overview update on its own crawl schedule and are not guaranteed. No Search Console submissions or live crawl checks were performed by this change.

### Driver identity privacy before acceptance

Public ride results use a generic Driver label and omit photo URLs and initials. Pending seat-request records conceal the driver name; confirmed bookings and the driver's own Hosting data retain private details. Cards show labelled icons for current driver checks, luggage allowance and enabled custom stops. Reviews and trip counts remain hidden.

Photo retrieval requires the authenticated owner, a confirmed driver/passenger pairing or the verified configured operator; anonymous and unrelated accounts and pending requesters receive 404. Native photo requests attach the existing session only to same-origin profile-photo URLs. Profile-photo consent and privacy copy now describe sharing with confirmed trip partners and authorised support. Driver-written vehicle notes remain public and should not contain personal information. No migration is needed.

Validation: 84 tests passed, including private/pending/confirmed identity and photo access and native photo-source URL restrictions. Web build, SEO checks, Worker dry-run and English/French browser booking/navigation checks passed. Live deployment and physical native-device delivery were not verified.

### Public safety guide

`/safety` and `/fr/securite` now serve a dedicated, original Ridely safety guide in lime/cream/charcoal styling. It includes driver-check explanations, identity/address privacy, boarding codes, expiring itinerary links, travel-stage advice, professional pilot support, emergency guidance and native expandable FAQs. It does not promise criminal checks, live GPS, passenger ID verification, Ridely-provided insurance or guaranteed safety. The guide is readable without JavaScript or authentication and retains canonical, language and sitemap metadata. App navigation, footer and homepage safety panel link to it.

The supplied Poparide URL could not be fetched because the workspace proxy returned 403; no claim is made to have inspected or copied that page. Existing Ridely imagery is illustrative. English/French browser checks passed at 320/390/768/1440px, including FAQ controls, fragment links, image loading and no overflow. Existing 84 tests, web build, all 18 SEO checks and Worker dry-run passed. Live deployment is not verified here.
