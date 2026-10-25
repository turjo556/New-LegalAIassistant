# Ridely search visibility

## Implemented

- 18 useful public pages across English and French: homepage, how it works, drivers, safety, questions, and four directional corridor guides (Montréal → Ottawa, Ottawa → Montréal, Gatineau → Montréal, Longueuil → Ottawa). Their route-specific meeting points link to the owner's existing exact map selections. Search links prefill the appropriate origin/destination.
- All public pages are built as readable HTML. Route/service guides work without application JavaScript; the homepage has pre-rendered explanatory content before the existing interactive homepage loads. No sample inventory, made-up departures, fake ratings or new coverage areas are published.
- Unique titles/descriptions, HTTPS canonical URLs, reciprocal English/French `hreflang`, social-preview title/description/image and valid Organization/WebSite/WebPage/Breadcrumb structured data. No invented business address, local-business profile, review score or guaranteed rich-result eligibility.
- `https://ridely.ca/sitemap.xml`, robots rules, internal discovery links and compressed existing local photos. The sitemap includes only public content; no invented last-modified timestamps.
- Private app/auth/cart/shared-itinerary screens are `noindex`; API crawling is disallowed. Test/preview domains return restrictive robots and `X-Robots-Tag: noindex`, with no test sitemap. This is search-exclusion guidance, not access control. Existing authentication still protects private data.
- Canonical host/HTTPS and old language-query redirects; true 404 handling instead of indexing an unknown URL as another copy of the homepage. Navigation/API requests go through the Worker; ordinary static images/fonts/CSS/JS retain the asset fast path.

## Verify after the GitHub-linked Cloudflare deployment

The changes are committed/pushed through the existing workflow; live deployment completion and indexing are separate steps. Check on the real domain after deployment:

1. `/` and `/fr` load the existing homepage. `/rides/montreal-ottawa` and `/fr/covoiturage/montreal-ottawa` load readable public guides. On Safari, test a route guide's search button and confirm prefilled cities.
2. `/sitemap.xml` is valid XML and lists 18 `https://ridely.ca` public URLs; `/robots.txt` points to it.
3. A random missing page returns HTTP 404. `/search`, `/login`, `/cart` and `/trip-share` return noindex headers. Test `www.ridely.ca` normalises to `ridely.ca`.
4. The test backend must continue to return `Disallow: /` at `/robots.txt` and noindex headers. Its account data does not belong in search engines.
5. Use Google Search Console URL Inspection / live test for a public English and French route, plus Google's Rich Results Test or Schema Markup Validator for structured-data syntax. Valid schema does not promise a rich result.

## Founder action: Google Search Console (phone works)

1. Open https://search.google.com/search-console and sign in with the Google account that should own Ridely's search reporting.
2. Add a **Domain** property: `ridely.ca` (no `https://`).
3. Follow Google's Cloudflare authorisation flow if offered. Otherwise copy the Google-provided TXT verification value to Cloudflare → ridely.ca → DNS → Add record → TXT, Name `@`. Keep existing DNS/email records; add the new TXT alongside them. Return to Google and verify. The verification value is public DNS data, not a password.
4. In **Sitemaps**, submit `https://ridely.ca/sitemap.xml` only after the new file is live.
5. Inspect the homepage and one English/French route and request indexing if eligible. Review Google's reported canonical and any crawl errors.

No Google account is connected in this coding workspace. Verification, sitemap submission and live indexing have not been performed here. Google decides what to crawl/index and when; indexing or a top position cannot be guaranteed.

## Other discovery work

- Verify Bing Webmaster Tools (https://www.bing.com/webmasters), optionally import a verified Search Console property, then submit the same sitemap. No automated submissions were sent.
- Secure consistent social handles and link the official accounts to ridely.ca once their real URLs are available. No invented social profiles are placed in structured data.
- Seek genuine links through campus/community partners, local travel resources and groups that permit promotion. Ask for permission and disclose the pilot. No outreach messages or directory submissions were sent by this implementation.
- Publish practical bilingual updates based on actual customer questions: which entrance to meet at, what luggage is allowed, cash fare versus booking credit, and what screening does and does not establish. Keep availability claims tied to real listings.
- Ask actual customers for honest feedback after completed trips; do not manufacture reviews or offer rewards conditioned on a positive review.
- Google Business Profile remains unsuitable for a purely online platform unless Ridely later genuinely meets the in-person eligibility rules. Do not create a virtual/fake address listing.

## Measurement and maintenance

Search Console is the first measurement tool: track indexed public pages, relevant search queries, impressions, clicks, country and device. Compare changes over several weeks rather than promising immediate traffic. Measure search-to-real-booking conversion separately from raw visits.

Use PageSpeed Insights on the real deployed homepage and a guide. The guides avoid the application JS bundle. Maps, posting and trip-workspace code now load on demand: the initial app JS fell from about 662 KB to 481 KB before compression (about 27% smaller). This is a bundle measurement, not a measured improvement in Core Web Vitals; field performance must still be checked on the deployed site. No analytics/tracking script or advertising spend was enabled. If adding analytics or ad pixels, decide the applicable consent/privacy setup before loading them.

Update public pricing, coverage and cancellation copy when the product changes. Rebuild with `npm run build`, then run `npm run seo:check` and the normal tests. Add new route pages only when they provide useful, specific information; do not mass-produce thin city pages or imply service outside the pilot.

Local verification completed: page/schema/reciprocal-language tests; built-file/sitemap checks; browser tests with JavaScript disabled, French/mobile widths, route search prefilling, locale canonicals and 404s; full suite; Worker dry-run. Production-style local Cloudflare asset routing uses `wrangler dev --local --host ridely.ca --upstream-protocol https` to avoid development HTTP being redirected by the production HTTPS rule. Normal `npm run cf:dev` uses a localhost host.
