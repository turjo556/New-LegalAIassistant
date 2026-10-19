# RideMyWay — Your route. Your ride.

A working intercity ridesharing website with a React frontend, Node.js API, and a persistent SQLite database. The iOS app in `apps/mobile` now uses this backend; see [the mobile guide](apps/mobile/README.md) for setup, supported flows, and TestFlight prerequisites.

## Requirements

**Node.js 24** and npm. This server uses the built-in `node:sqlite` module. No database service, API key, or paid account is required to run it locally.

## Development

From the existing repository checkout:

```sh
npm ci
npm run dev
```

This starts the API on port 3000 and the Vite website on port 5173. Vite proxies `/api` requests to the API. No separate checkout or Git worktree is needed.

## Run the built website

```sh
npm ci
npm run build
npm start
```

The Node server serves both the website and API on port 3000. Open the server through your development environment's supported browser access. This repository has not been deployed to a public domain.

Optional environment variables:

- `PORT`: server port, default 3000. Vite's development proxy expects 3000.
- `DATABASE_PATH`: absolute SQLite file path; defaults to `data/ridemyway.sqlite`.
- `NODE_ENV=production`: enables Secure session cookies. Production must use HTTPS through a reverse proxy. Local plain-HTTP development must not set this flag.

The database directory is created automatically and ignored by Git. Keep it on persistent storage. Back it up using SQLite's backup tooling or stop the service before copying the database and associated WAL files. Do not deploy this application onto ephemeral storage without a persistent volume.

## Working workflows

1. Create an account with a first name, email, and password of at least 10 characters.
2. Offer a ride: choose supported cities, future departure date/time, same-day arrival, public pickup/drop-off points, vehicle, seat count, and price in CAD.
3. From an independent account/browser, search the matching route/date and reserve one or more seats.
4. My trips shows passenger reservations. My listings shows the driver's rides and passenger names/seat counts.
5. Use booking messages to coordinate privately. Messages are stored on the server; refresh the conversation for replies. No email or push notification is sent.
6. Cancel a passenger booking to release seats, or cancel your own listing. Driver cancellations are visible on passenger reservations.
7. Save rides to your account and sign in again from another browser to retrieve them.

There are **no seeded or fictional drivers** in the website. New installations start empty. The old browser-local demo data is not imported.

Seat allocation uses SQLite transactions. The server checks capacity, ownership, duplicate reservations, valid dates, and prices. Passwords use salted scrypt hashes; random session tokens are stored as hashes and delivered in HTTP-only, SameSite cookies. Mutation endpoints require JSON and reject cross-origin requests. Login/registration attempts have an in-process per-address rate limit. Email addresses are not exposed to other members. Booking messages are restricted to the passenger and listing owner.

Supported launch cities: Montréal, Québec City, Ottawa, Toronto. Trip times are interpreted as Eastern time; overnight listings are not supported yet.

## Checks

```sh
npm test
npm run build
```

API integration tests cover registration/login, unauthorized writes, invalid listings, simultaneous last-seat reservations, fare calculation, ownership restrictions, private messaging, favorites, session/database persistence after a server restart, passenger cancellation, driver cancellation, and logout. Shared core tests also run for the earlier mobile concept.

Browser validation uses independent driver and passenger sessions to exercise account creation, publication, shared search, reservation, persistent sessions, driver passenger lists, cancellation, and mobile layouts.

## Current limits

- Online payments, payouts, refunds, live mapping, route optimization, driver/vehicle verification, email verification, password recovery, and external notifications are not connected.
- Home drop-offs cannot be booked until routing and driver approval are implemented. The current website books the listed public meeting points only.
- Price is displayed in CAD. No online payment is collected; members arrange payment directly. The service makes no claims of identity or vehicle verification.
- This is a functioning early-access application, not a completed public transportation marketplace. Operating terms, privacy/retention/deletion processes, insurance/transport compliance, moderation, incident support, accessibility review, production monitoring, and load/security review remain launch work.
- SQLite is designed here for one application instance. Use a shared transactional database and shared rate limiting before horizontal scaling.
- The server has been tested in this cloud workspace. A public domain, TLS hosting, and a persistent production deployment have not been provisioned.
- RideMyWay trademark and domain availability are unconfirmed.

The native RideMyWay app is available via `npm run mobile` and shares server data with the website. Its sign-in session is stored separately on the device.

## Cloudflare Workers + D1

A separate Cloudflare-compatible API is now implemented in `apps/worker/index.js`, with D1 schema and database-level capacity protection in `migrations/`. See [CLOUDFLARE.md](CLOUDFLARE.md) for the dashboard fields, required D1 database ID, local validation, and deployment commands. Cloudflare local runtime validation is distinct from deployment to a Cloudflare account.

## Driver-controlled custom stops

The homepage has prominent Riders and Drivers tabs, a rider search workflow, and a driver posting workflow. The visual palette uses navy, electric blue, and orange.

Drivers separately choose whether to allow custom pickup and custom drop-off on each new listing. Both are off by default. Enabling either requires a map pin for its corresponding standard point and a per-person supplement ($0–$50 CAD). The driver must place the standard pin within 25 km of the corresponding supported city centre.

Passengers **book the standard pickup and drop-off first**. Only a passenger with an active booking may submit a custom request from My trips, and only for options that the listing owner enabled. A pin must be within a **3 km straight-line radius** of the corresponding standard location. All passengers can request; the former two-passenger restriction no longer applies to new listings.

Requests are pending until the driver approves. Supplements are added to the booking total only after approval. Declined requests leave the standard booking unchanged. Cancellation invalidates custom approvals, so rebooking cannot reactivate them or bypass the shared budget.

A shared **15-minute driver-estimated detour allowance** covers all approved custom stops on a ride. Drivers must enter additional minutes for each approval, including stopping and boarding. SQL triggers reject concurrent approvals that would exceed 15 minutes. This enforces the entered estimates, not measured driving time. Live road routing, traffic prediction, automatic stop optimization, and third-party address verification are not connected. The driver must review road access, all existing commitments, and actual timing before approving. Do not present this as a guarantee against traffic delays.

Ride cards expose a privacy-safe itinerary before booking: standard points, approximate approved stop labels, added minutes, standard departure/arrival, and the total extra time. Exact home addresses/pins are restricted to the requesting passenger and driver. The public order groups pickup stops before the standard drop-off and then custom drop-offs; it is an indicative sequence rather than a navigation route. Individual stop ETAs and an automatically calculated route map remain future routing work. Updates appear on refresh; external notifications are not connected.

Maps use Leaflet and attributed OpenStreetMap tiles. Users may enter coordinates if tiles are unavailable. Pins are not automatically checked against typed addresses. Home addresses and request data are stored in the database; production retention/deletion policies still need implementation.

Node applies local migrations automatically. Cloudflare's existing deploy script applies additive migrations `0003_custom_stops.sql` and `0004_cancel_stop_requests.sql`. Old listings retain their previous settings; create a new listing to use the new driver permissions. Legacy pickup requests remain visible through their existing review flow.

`npm test` and the local Cloudflare test `npm run cf:test:pickup` cover booking-first enforcement, permissions, both 3 km zones, private data, pending/approved fees, and simultaneous approvals against the shared 15-minute budget.
