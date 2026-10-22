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
