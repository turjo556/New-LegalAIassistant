# RideMyWay — Your route. Your ride.

A working intercity ridesharing website with a React frontend, Node.js API, and a persistent SQLite database. Mobile development is paused; `apps/mobile` remains the earlier concept app and is not connected to this backend.

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

The earlier mobile demo remains available via `npm run mobile`; its sessions, data, and Nearway branding are separate from this website.
