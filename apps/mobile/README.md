# Ridely for iOS and Android

Native React Native / Expo SDK 54 app using the same API contracts as the Ridely website. No embedded website, seeded public rides, background tracking or automatic charges. The app does not deploy the backend.

## This iteration

- Ridely electric-lime/black/off-white theme and a new illustrative launcher icon.
- Search, Trips, Saved, Credits and Account navigation; rider/driver views.
- Signup with terms acknowledgement; sign-in and device-only SecureStore session. Test and production sessions are isolated by API origin. Language selection persists separately; English/French interface copy and verification-email language headers. Names, addresses and messages are not translated. Some dynamic/error text can still fall back to English.
- Native email/phone code entry, encrypted private adult rider-profile submission, and a guided driver setup with QC/ON selection, explicit consent, encrypted licence-number submission, Stripe-hosted identity verification and review request. All approvals come from the server; test identity results cannot publish bookable rides. Stripe returns to the website; return to the app and check the verification result. Browser and app login sessions are separate.
- Optional profile photos selected on demand with the system photo picker. Crop/re-encode to a 256px JPEG; server re-encodes and strips metadata again. No camera, microphone or live location use is needed. Real permission/picker behaviour still requires device tests.
- Four pilot cities and the owner's canonical meeting-point catalogue. Confirm exact permitted loading spots; no invented coordinates. Price defaults to $25, maximum $30, whole dollars; quarter-hour times. Save private ride drafts before checks and publish only after approval. Canonical coordinates survive draft save/restore.
- Standard reservation first; show server credit balance and readiness checks; require one credit per reservation regardless of seats. Two complimentary credits, then $3.99 each; the ride fare is cash paid directly to the driver. Credit history is available. **No native credit purchase button or charge path is enabled yet.** Confirm store/payment treatment and production refund/dispute handling first.
- Trip cards, dedicated full-itinerary/vehicle/plate screen, messages, custom requests and driver decisions; exact custom addresses only from authorised booking/driver data. Custom-stop 3km/shared-15-minute rules remain server-enforced.
- Native private boarding codes, background/2-minute hiding, driver confirmation, expiring trusted-contact itinerary links through the system share sheet, revocation and confidential reports. Sharing is not live tracking. Review screen check-ins on actual devices before relying on them.
- Six-hour rider cancellation check; driver direct cancellation only without active passengers; otherwise authenticated support tickets. The server remains authoritative. Support requests never cancel automatically. The ten-minute driver waiting requirement is explained, not measured by a timer or GPS.
- In-app notification list, polling while foregrounded, and refresh on return. **Push notifications are not implemented.**

## Configure a test backend first

There is deliberately no default live API destination. Without configuration, the app shows a development notice and makes no startup request.

From the repository root:

```sh
npm ci
# In apps/mobile/.env.local, set public values only:
# EXPO_PUBLIC_API_URL=https://your-actual-ridely-staging-host
# EXPO_PUBLIC_APP_ENV=development
npm run mobile
```

A test backend needs an isolated database and its own provider configuration. Do not point development fixtures at production. `EXPO_PUBLIC_*` values are embedded in the app: never put Stripe, Resend, SMS or encryption secrets there. Backend activation flags are obtained from `/api/state`.

For local testing, loopback HTTP and Android emulator `http://10.0.2.2:3000` are allowed in development. A physical phone cannot use the cloud workspace's localhost. It needs access to an HTTPS test deployment and the Metro development server, or an installable preview build. Starting Metro in this restricted cloud does not itself create a public preview/QR destination.

Production configuration requires HTTPS. The production EAS profile explicitly selects `https://ridely.ca`; it has **not** been built or submitted. Preview profiles require your test API URL set through Expo environment configuration or your local build environment. Restart Metro after changing `.env.local`.

## Maps

On iOS, manual pin selection uses native Apple Maps, with no location permission. The initial city centre is only a viewport, never a submitted exact pin. Android currently uses explicit latitude/longitude fields rather than opening an unconfigured Google map. Both platforms can open canonical meeting-point links externally. Configure and test an Android map provider before external testing of custom-stop entry. No Google Maps API billing, live GPS or automatic family tracking is enabled here.

## Verification

```sh
npm test
EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 CI=1 npm run export -w @nearway/mobile
```

The native host tests render the actual app components with mocked platform primitives against a temporary real Node API. They exercise iOS and Android branches: signup/consent, account gates, reservation/credits/cash notice, private code hiding, share/revoke, preset draft storage and French switching without losing typed licence text. API tests cover persistence, origin isolation, path validation, insecure remote rejection and locale headers. Mocks cannot establish native layout, Keychain, networking/cookie, photo-picker, MapKit, permissions, screen-reader or store behaviour.

## Installable builds — not run here

The owner-provided Expo project ID `07f16659-df0c-456b-a48e-1ced12874553` is recorded in `app.json` under `extra.eas.projectId`. This is public project configuration, not an authenticated ownership check. Do not create another starter project. Sign in and run the linked init command below from the existing app directory to validate project access.

Use your Expo account and the appropriate developer accounts. Never paste credentials into chat. Proposed identifiers are `ca.ridely.app` on both platforms; verify ownership/availability before registering. Changing the old identifiers creates a separate installed app and does not migrate the old app's session.

In `apps/mobile`, with EAS CLI installed according to Expo instructions:

```sh
eas login
eas init --id 07f16659-df0c-456b-a48e-1ced12874553
# Configure a real test backend URL before either preview build.
eas build --platform android --profile preview
# iOS simulator (Mac/Xcode required to run):
eas build --platform ios --profile preview
# Physical iPhone preview: needs Apple membership, registered device and signing:
eas device:create
eas build --platform ios --profile device-preview
```

`preview` produces an Android APK and an iOS simulator build. A simulator build cannot be installed on a physical iPhone. `device-preview` is for registered physical devices. Builds may incur Expo/platform charges. No paid build, developer purchase, live identity check or charge was made during implementation.

## Remaining before public store submission

1. Establish Expo project ownership and Apple/Google developer accounts; finalise identifiers, signing and store records. Use an Xcode/Android build image accepted by the stores at submission time.
2. Run physical iPhone and Android tests for layout, large text, accessibility, secure sessions/logout, offline/retry, permissions, verification return, custom stops, profile photo and sharing. Verify cancelled/completed trip behaviour with two real authorised test users.
3. Connect APNs/FCM notifications with explicit permission, revocation and reliable server delivery.
4. Finalise store-compliant credit payment UX and accounting/refund/dispute processes; no native purchase is active now.
5. Implement account deletion and recovery before store review; website policies or a support email alone do not complete these features. Native post-trip completion/feedback and founding-bonus claiming still need dedicated screens; their existing website workflows remain separate.
6. Configure the Android map experience; validate exact meeting spots and route estimates. Live tracking is a later separately consented feature.
7. Prepare final bilingual legal/privacy/support pages, current data-safety/App Privacy disclosures, content moderation/blocking UX, store screenshots and operational monitoring. Public support availability must match actual staffing. Review the exemption/encryption declaration with the submitting developer.

No signed build, simulator/device run, TestFlight/Play upload or public release has been performed here. A successful JavaScript/Hermes export is not a signed native build.
