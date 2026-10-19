# Deploy RideMyWay to Cloudflare

This repository now includes a Workers API and D1 migrations. The existing website is served as Worker static assets. Cloudflare does not run the original Node.js HTTP server or its filesystem database.

## Dashboard setup (including from iPhone)

1. In Cloudflare, open **Storage & databases → D1** (or search the dashboard for D1).
2. Create a database named **ridemyway**. Copy the Database ID from its overview. This ID identifies a resource; it is not a password or API token.
3. Add that ID as `database_id` to the `DB` entry in the repository's `wrangler.json`. Keep the `binding` as `DB`, the name as `ridemyway`, and the migrations directory as `migrations`. Do not use a placeholder ID. Commit the edit before deploying.
4. In **Workers & Pages**, connect `turjo556/New-LegalAIassistant`, branch `main`.
5. Set the Worker/project name to **ridemyway**, matching `wrangler.json`.
6. Set the **build command** to `npm run build`.
7. Set the **deploy command** to `npm run deploy` (not just `npx wrangler deploy`). This first checks the database ID, then applies D1 migrations before uploading the Worker and website.
8. Use the repository root as the build root. Node 24 is recommended; use the dashboard's supported Node version setting if needed.
9. Disable preview builds initially so previews do not share the production database. Add separate preview D1 configuration before enabling them. Keep Access off only if you intend the site to be publicly accessible.
10. Deploy. Open the HTTPS `workers.dev` address returned by Cloudflare on your phone. It does not require buying a domain.

Cloudflare's build integration must have permission to operate Workers and the configured D1 database in the same account. If its build token cannot apply migrations, use Cloudflare's secure build-token settings to authorize D1 access; do not place credentials in Git or chat. The deployment logs will report any actual authorization failure.

## Local Cloudflare validation

```sh
npm ci
npm run build
npm run cf:migrate:local
npm run cf:dev -- --port 8788
```

In another terminal:

```sh
npm run cf:test
npm run cf:check
```

`cf:test` creates test accounts/rides in the local D1 database. It refuses non-loopback destinations. `cf:check` bundles the Worker and website without deploying. Local Cloudflare state under `.wrangler` is ignored by Git. Deployment never copies those test accounts into the hosted D1 database.

The Cloudflare runtime tests cover accounts/login, shared search, fare calculation, simultaneous requests for the last seats, favorites, private messages, authorization, cross-origin protection, passenger/driver cancellation, rebooking, sessions, and logout. The browser workflow was also exercised against the local Worker.

## Hosted behavior

- The initial hosted D1 database is empty. Create accounts and publish a ride to test with a second account/device.
- Seat capacity and cancellation checks run in SQLite triggers inside each write, so concurrent Worker requests cannot overbook the same ride.
- Passwords use Web Crypto PBKDF2-SHA256 with per-user random salts (100,000 iterations, supported by Workers). Session cookies are HTTP-only, SameSite, and Secure on HTTPS. Session tokens are hashed in D1. Login rate limits are stored in D1 across Worker instances.
- Node development still uses the original scrypt implementation. Node accounts/databases are not automatically migrated to Cloudflare and password hashes must not be copied between these backends.
- Online payments, verification, password recovery, external notifications, and home-drop-off routing remain unavailable. Hosting does not complete those features or the operating-policy/security review needed for a public service.
- Wrangler is pinned by `package-lock.json`. Cloudflare usage and billing depend on the account plan. No paid plan, custom domain, or subscription was purchased by this setup.

This code has been validated locally, not deployed to your Cloudflare account by the assistant. Confirm the hosted deployment using two accounts once Cloudflare reports success.
