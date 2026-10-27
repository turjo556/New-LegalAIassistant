# Ridely: from Expo Go to downloadable apps

Prepared 27 October 2026. No store membership, cloud build, signing credential,
TestFlight upload or Google Play release has been created from this workspace.
The existing app remains linked to Expo project
`07f16659-df0c-456b-a48e-1ced12874553`. Do not create another starter app.

## 1. Enrol the developer accounts

- Apple: https://developer.apple.com/programs/enroll/ . Use your own Apple Account,
  enable two-factor authentication, choose the correct individual/organization
  status, and wait for membership activation. Organization enrolment typically
  requires legal-entity verification, signing authority and a D-U-N-S number.
  An individual account generally displays the person's legal seller name.
  Apple membership is generally US$99/year; check the local checkout and tax.
- Google: https://play.google.com/console/signup . Use the correct legal account
  type and complete identity/contact verification. Registration is generally
  US$25 once; check the checkout and tax. New personal accounts may also require
  Android-device verification and a closed testing period before production
  access. Follow the requirements shown in your Console; do not assume internal
  testing grants public-release eligibility.

Do not share passwords, identity documents, payment details, app-specific
passwords, service-account JSON or signing keys in chat or in Git.

## 2. Prepare the existing project on your Mac

From the folder you already cloned:

```sh
cd ~/New-LegalAIassistant
git pull
npm ci
npm run mobile:release:check
npx eas-cli@latest login
```

Use the Expo account you linked previously. There is no need to recreate the
project or run `create-expo-app`. EAS verifies access to the existing project when
building; the configured project ID alone does not prove access.

The first installable builds use the separate test Worker/database. Before a
new beta, bring that test environment up to date (including migration 0024):

```sh
npx wrangler login
npm run mobile:test:setup
```

This is the existing isolated-test setup. It must not target the production
Worker/database. It preserves existing synthetic accounts and consumed credits.
Private test logins remain in `.ridely-test/TEST-ACCOUNTS.txt`, never in Git/chat.
The existing website deployment and test deployment are separate.

## 3. Build an iPhone beta for TestFlight

After Apple membership is active:

```sh
cd apps/mobile
npx eas-cli@latest build --platform ios --profile beta
```

The beta profile creates a signed store build for a physical iPhone. It is not a
simulator build, does not need Metro/Expo Go to run, and uses the isolated test
backend. Let EAS guide signing through your Apple account. Check any quota or
charge shown before starting a build; no paid Expo plan is required by this code.
Keep a record of the returned build ID/link.

In https://appstoreconnect.apple.com/ create the Ridely app record if needed:
name `Ridely` (subject to availability), bundle ID `ca.ridely.app`, unique SKU
`ridely-ios`, and your chosen primary language. Registration/signing must confirm
that this bundle ID is available to your developer team.

Then submit the **beta-profile iOS build**:

```sh
npx eas-cli@latest submit --platform ios --profile beta
```

Select the build you just created. EAS may request the App Store Connect app ID
and submission credentials; enter/store them through EAS, not in chat or Git.
Submission uploads to App Store Connect; it does not publish publicly. Wait for
processing, complete export-compliance/beta details, then enable TestFlight.
Internal testers need App Store Connect roles. Ordinary invited passengers/drivers
are external testers and generally require beta review first. Do not grant an
unrelated tester administrative App Store Connect access just to avoid review.

Install Apple's TestFlight app on your iPhone and accept the invitation. Unlike
Expo Go, the installed beta works while your Mac/Metro server is off. TestFlight
builds expire (typically after 90 days); upload a replacement when needed.

## 4. Build an Android beta

After the Play Console account is active, create the app record in
https://play.google.com/console/ using `ca.ridely.app`, and complete the required
account/store declarations.

```sh
npx eas-cli@latest build --platform android --profile beta
```

This creates an Android App Bundle (AAB) for Google Play. Let EAS manage the
Android signing credentials; retain secure access to them. The first upload may
need to be made manually in Play Console before API-based submission is enabled.
Upload the AAB under **Testing → Internal testing**, add tester email addresses,
review the track and share its opt-in link after releasing it to that track.
An AAB is uploaded to Play, not installed directly like an APK.

For later automated uploads, configure a Google service account with the required
Play Console permissions securely in EAS, then use:

```sh
npx eas-cli@latest submit --platform android --profile beta
```

Select the beta build. Submission is configured for **internal / draft**, so
review/release the testing track manually in Play Console. Neither submit profile
selects a public production rollout. For direct Android sideload testing only,
`--profile preview` creates an APK; users must explicitly allow its installation.

## 5. Test before inviting real pilot customers

For this first beta, use fictional trips and the isolated test accounts only.
The test server allows just the saved synthetic driver/rider accounts; it does
not support ordinary registrations, real document checks, emails, SMS or payments.
This proves installation and trip workflows, not live onboarding readiness.

On an actual iPhone and Android device, verify:

- Launch with the Mac off; correct icon/branding and visible fictional-test banner.
- Driver publishes a future ride; passenger requests seats; pending is not booked.
- Driver accepts after checking availability; exactly one credit is used; passenger
  refreshes to confirmed. Test decline, withdrawal, expiry and duplicate taps.
- Boarding code and correct vehicle details appear only after confirmation.
- Cancellation, credit restoration, messages, saved trips and trusted-link revoke.
- App restart/session persistence, logout, offline/retry and French switching.
- Photo picker/denial, small-screen/large-text layout and accessibility labels.
- Native maps on iPhone; Android currently uses manual coordinates for custom
  stops. Decide whether to disable that feature or finish the Android map UX
  before inviting external testers to use custom-stop entry.

Email status updates exist, but native APNs/FCM push notifications are not
implemented. Do not advertise native push, live location tracking, or instant
cross-platform seat synchronization.

## 6. Gates before a real-customer beta or public release

The production build profile points only to `https://ridely.ca`; beta points only
to the isolated test Worker. Local checks reject accidental profile/origin swaps.
Changing a backend requires a new build; this work does not add OTA updates.
Existing backend secrets must never become `EXPO_PUBLIC_*` values.

Unfinished release work is explicit:

- In-app account deletion initiation backed by an actual deletion/anonymization
  process and a public web deletion-request page; removing a photo/private rider
  profile or sending a generic support ticket is not full account deletion.
- Account recovery/reset and a verified way for customers to regain access.
- Final operating legal entity, bilingual privacy/terms, retention rules and
  support/contact details. Existing `/policies` is early-access content, not a
  claim that store/legal review is complete.
- Real-device validation of live contact verification, Stripe-hosted identity
  return, private licence/insurance submission and operator approval. No test
  fixture may approve a real driver.
- Native report/block and post-trip safety-feedback completeness; the website's
  moderation controls do not automatically appear in the app.
- Store App Privacy/Data Safety declarations matching the shipped app and SDKs:
  contact details, user IDs, optional photos, private rider details, driver/vehicle
  details, trip/messages/support records and third-party verification. No native
  GPS/location tracking or advertising identifier is intentionally used. Check
  actual binary dependencies and provider practices before submitting forms.
- Reviewer access instructions/accounts and seeded review content in a dedicated
  review environment; do not require reviewers to upload real licence documents
  or ask them to share a real customer's credentials. Review access and privacy
  declarations must match the actual build/environment submitted.
- Physical-device screenshots in supported store sizes, age/content rating,
  encryption declarations and current target SDK/build-image requirements.
- Operational/legal/insurance readiness for real rides; paid-credit checkout
  activation and store payment-policy review before enabling purchases. Ride fares
  remain cash to drivers during the pilot. Do not promise payouts from the app.

After those gates, create and test a production-profile build and submit that
specific build. Keep Google uploads on internal/draft until its release is
reviewed intentionally in Play Console. Apple App Review submission and release
settings are separate from uploading a build to TestFlight. Store review approval
and availability cannot be guaranteed by local tests or Expo export.

## Local validation

```sh
npm run mobile:release:check
npm run mobile:release:check -- production
npm test
EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 CI=1 \
  EXPO_PUBLIC_APP_ENV=staging \
  EXPO_PUBLIC_API_URL=https://ridely-app-test.bonjour-847.workers.dev \
  npm run export -w @nearway/mobile
```

A successful export is a JavaScript/assets check; it is not a signed native build,
physical-device QA or store approval. The EAS pre-install hook checks the selected
build's identifiers, backend/environment, binary type and unexpected overrides.
