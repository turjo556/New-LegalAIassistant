# Two-way trip reviews and cancellation delivery

Prepared for user approval; not deployed.

## Behavior

- Confirmed drivers/passengers can review each other after both confirm completion.
- Four required 1–5 criteria, equal-weight overall average, optional 500-character comment.
- Role-specific averages and review counts in web/mobile Account, with no invented initial rating.
- Reviews remain hidden until both submit or their fixed 14-day window ends.
- Public rides expose only published driver numeric aggregates; passenger aggregates go to their confirmed driver. Received text is account-private and has no reviewer identity.
- Guests, outsiders, self-reviews, duplicates, incomplete/cancelled trips, invalid scores, and expired submission windows are rejected.
- Published review notifications are idempotent. Optional email copies use the Ridely theme and English/French text.
- Cancellation emails for both trip partners no longer depend on optional trip-update subscriptions. Stale/repeated cancellation handling and operator delivery labels are included.

## Validation

101 automated tests passed, including actual HTTP review/completion endpoints, mutual publication, cancellation/credit behavior, privacy guards, and English/French cancellation-email outbox dispatch with mocked providers. Native iOS/Android tests submit all four criteria via the real local API and verify hidden-before-mutual/public-after-mutual aggregates.

Local browser tests passed at 320/390/768/1440 pixels in English/French: required stars, keyboard-accessible controls, clean phone layouts, submission, mutual release, and private vs public state. Website build, Worker dry-run, and SEO checks for 18 public pages passed.

Required migrations: 0028_trip_reviews and 0029_cancellation_emails before Worker rollout. No production records, real emails, charges, or live Stripe sessions were created. Live provider credentials, verified sending domain, and actual inbox receipt remain unverified.
