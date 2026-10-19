# RideMyWay for iOS

A native React Native / Expo app connected to the existing RideMyWay API. This replaces the earlier offline Nearway demo. The default API is `https://ridemyway.bonjour-847.workers.dev`; no sample trips are seeded by the app.

## Implemented

- Navy, electric-blue, and orange branding, app icon, Riders/Drivers selector, and native bottom navigation.
- Signup/sign-in, session persistence in iOS Keychain using Expo SecureStore, and sign-out.
- City/date/passenger search, ride details, a privacy-safe itinerary, saved rides, and standard-seat reservations.
- My trips, passenger cancellation, driver listings, passenger lists, and driver cancellation.
- Native route publishing with separate custom pickup/drop-off switches and fees.
- Native Apple Maps pin selection for standard points and custom addresses. No location permission or user tracking is requested; users manually place pins.
- Custom stop requests only after booking and only when the listing permits the option. Private address/pin submission, driver approval/decline, and server-enforced 3 km zone checks.
- Driver-entered extra minutes, with a shared 15-minute budget enforced by the API. This is not automatically calculated road routing.
- Private booking messages, refresh controls, loading/errors, and refresh on app foreground.

## Development

From the repository root:

```sh
npm ci
npm run mobile
```

Use a compatible Expo Go client or native development environment. Physical devices need a network path to the Metro server; starting a server in this cloud workspace does not automatically make it reachable from an iPhone. Expo Go version compatibility with SDK 54 must be checked on the actual phone.

For a local iOS simulator on a Mac with Xcode:

```sh
cd apps/mobile
npx expo run:ios
```

All screens use native components; this is not a website embedded in a WebView.

## API configuration and sessions

`EXPO_PUBLIC_API_URL` optionally selects a different API. It is a public URL, never a secret. The client requires HTTPS for remote endpoints. Loopback HTTP is permitted for local automated tests.

The native client captures the server's `rmw_session` Set-Cookie header and stores the session cookie in SecureStore (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). It sends this cookie explicitly on subsequent API requests. Passwords are never persisted. Native session/header behavior must still be verified on an actual iPhone before release; the automated tests exercise the transport contract against the real Node API, not the iOS networking stack or Keychain itself.

Website and app accounts, rides, reservations, and messages share the same backend. The app does not deploy or change that backend. Cloudflare must already be running the custom-stop API version for custom options to work.

## Validation performed here

```sh
npm test
EXPO_NO_TELEMETRY=1 CI=1 npm run export:ios -w @nearway/mobile
```

The native API tests cover signup/login, saved session restoration, route publication, invalid seat counts, reservation, custom request/approval and resulting fare, messages, cancellation, and logout. Existing server and domain tests also pass. The iOS JavaScript/Hermes bundle compiles successfully with the native maps, date picker, safe-area, and SecureStore modules.

Dependency versions are pinned to the bundled Expo SDK 54 recommendations. The online Expo version-check endpoint could not be reached in this environment; offline validation and the installed SDK's native-module matrix were checked instead.

**Not yet performed:** a signed native build, simulator/device execution, real iPhone MapKit/Keychain/network testing, TestFlight upload, or App Store submission. A bundle export does not validate those steps.

## Build for TestFlight

An Expo account and an Apple Developer Program membership with appropriate App Store Connect access are needed. Sign into those services using their own secure login flows; never commit credentials or paste tokens into chat.

The repository includes `eas.json` profiles for an iOS simulator preview and a production build. In `apps/mobile`, after installing EAS CLI using its official instructions:

```sh
eas login
eas init
eas build --platform ios --profile preview
# After simulator/device testing and release setup:
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

`eas init` links the app to your Expo project. Confirm ownership/availability of the current bundle identifier `com.ridemyway.app` before registering it, and choose the correct Apple team. The preview profile creates a simulator build, which cannot be installed directly on a physical iPhone. Production builds can be distributed through TestFlight once signed and processed by Apple. These commands can incur platform/build charges; none has been purchased or executed here.

Before public store release: complete account deletion and recovery, privacy/data-retention policies, support/moderation/reporting, operating compliance, release screenshots/metadata, device accessibility testing, and production monitoring. The encryption declaration currently assumes standard exempt HTTPS/Keychain use; the submitting developer must verify their App Store answers. Online payments, verification, automatic road routing, and push notifications remain unimplemented.
