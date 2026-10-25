# Ridely isolated app testing

The approved next step is a separate test database, not production accounts. The existing phone preview already works. This setup creates a separate Cloudflare Worker and D1 database called **ridely-app-test**, then writes its HTTPS URL to `apps/mobile/.env.local`.

## On the owner's Mac

Stop Metro with Control+C. At the repository root:

```sh
git pull
npx wrangler login
npm run mobile:test:setup
```

Approve the Cloudflare login in your browser using the account that should host the test environment. The setup script uses the installed Wrangler and existing login; it does not ask for a password, API token or encryption key in chat. Cloudflare resource usage is subject to the account's plan/limits. No paid plan is purchased by the script.

The command creates/migrates only the distinct database, builds the web assets, deploys only the test Worker and securely provisions its independently generated encryption key. The live Worker name, database ID and custom-domain routes are not used as deployment targets. The script rejects the production database ID, and refuses an existing same-name database without the expected test marker. No production provider credentials or records are copied.

When it prints **Test server ready**, open the generated local account instructions:

```sh
open .ridely-test/TEST-ACCOUNTS.txt
cd apps/mobile
npx expo start --clear
```

Scan the new QR code. The app displays **Test mode · fictional accounts**. Use the private logins from the file. Do not paste the file or passwords into chat.

## First complete journey

1. Sign in as `driver@ridely.test`. Its contact, driver identity, licence and insurance approvals are synthetic fixtures, not real checks. Use **Toyota** as the approved vehicle model and fictional plate details. Choose a future Montréal → Ottawa trip, preset meeting points, quarter-hour times and a $25 whole-dollar price. Publish it.
2. Sign out and sign in as `rider@ridely.test`. Search the same date/cities and reserve a standard seat. One of its two automatic credits is consumed. The cash-fare label describes the real pilot policy; do not exchange money for test trips.
3. Open the itinerary and compare the fictional vehicle/plate. Generate a boarding code; sign in as the driver and confirm the code for that reservation.
4. Create/revoke a trusted-contact itinerary link and test messages. Test cancellation more than six hours ahead, ensuring the credit returns once. A late/support-request path does not automatically cancel the booking.
5. To test optional custom stops, first enable them on a listing and explicitly set standard pins using confirmed test coordinates. The existing 3km/shared-15-minute validation still applies. Android currently uses manual coordinates. The initial city-centre viewport is not an exact pin.

Driver approval expires after 30 days under the existing policy; rerunning setup refreshes the synthetic fixture. Rerunning preserves users, passwords, rides/bookings and consumed credits; it does not give repeat welcome credits. Do not delete `.ridely-test/private.json`: it holds only local staging credentials/key needed for repeat setup. It is excluded from Git and created with restricted file permissions.

## Deliberate restrictions

- Only the two fictional account emails may log in. New registrations and operator endpoints are blocked.
- Real email/SMS codes, Stripe identity sessions, paid-credit purchases, licence-number uploads and new private rider details are blocked. Other external provider keys are not forwarded, even if accidentally configured on the test Worker.
- Synthetic checks only exercise the post-approval journey; this does not validate real identity, licence, insurance, contact verification or payment-provider integrations.
- Test database and account changes are not copied back into production. There are no automatic payments, payouts, emails or SMS.
- Every API response identifies the isolated test environment. Website HTML displays a test banner; native state responses retain a test-mode flag after sign-in and booking.
- The test Worker fails closed without its activation variable and matching database marker. Normal `wrangler.json` continues to point to the production entry; it does not import the test Worker.

## Validation and limits

Local integration tests run the real Worker API against an isolated SQLite adapter: seed/login/passwords, encrypted profile readiness, synthetic driver approval, publish/book, session cookie preservation, credit balance on rerun, missing marker, provider stripping and blocked real flows. Native tests still use mocked platform hosts and do not establish physical-device behaviour.

The setup was prepared and locally validated in the coding workspace. Remote creation/deployment still requires the owner's Cloudflare login on the Mac. If the command fails, send the final error message, not private files. A failure may leave partially created test resources; it does not select production as a fallback. No automatic cleanup deletes a database or Worker.
