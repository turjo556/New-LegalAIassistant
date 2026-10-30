# Ridely store-release preparation

Prepared 29 October 2026. Target: **Wednesday, 4 November 2026**.

This package prepares a submission; it is not a signed build, store upload, approval, or guaranteed release date. No developer membership, paid build, submission, customer account, or email was created by this work.

## Ready in the repository

- Expo project: `07f16659-df0c-456b-a48e-1ced12874553`.
- iOS bundle ID and Android package: `ca.ridely.app` (store ownership/availability must still be confirmed).
- Current app version: `0.3.0`; EAS build numbers/version codes auto-increment remotely for beta/production.
- `beta`: physical-device store build, isolated synthetic backend.
- `production`: physical-device store build, `https://ridely.ca`.
- Existing 1024px launcher icon, portrait/phone configuration, English/French copy, no camera/microphone/device-location permissions requested.
- Local beta and production release-configuration checks both passed on 29 October. These do not verify store accounts or signing.

## Release gates — do these first

| Gate | Current evidence | Required before public submission |
|---|---|---|
| Apple/Google developer accounts | Owner confirmed 29 October: neither Apple Developer nor Google Play Console account exists | Start enrollment, confirm account identity, agreements, team access and store records |
| Google production eligibility | Account type/creation date/testing status unknown | Check Play Console testing requirement. If a newly created personal account requires 14 continuous days of closed testing, a test beginning 29 October cannot finish before 12 November; 4 November public Android launch would be unavailable under that condition. Verify exact tester count/current rule in the console. |
| Full account deletion | 30 October: authenticated app/web deletion requests and public instructions implemented; requests enter operator support queue | Complete and test the actual erasure tooling, approved retention schedule and provider deletion process. Request initiation alone does not clear this gate. |
| Native UGC controls | 30 October: native block/unblock added; reporting already exists; real-backend native checks cover messages denied after blocking | Verify controls and reporting in signed physical-device builds, plus the operational moderation response process. |
| Recovery/reviewer access | Password sign-in works; native reset flow not found in this audit | Verify account recovery and reliable reviewer access; never make reviewers complete real driver-ID checks to inspect the app. |
| Real production service readiness | Local mocked tests and JS exports exist | Confirm live API/migrations, account/booking/cancellation inbox delivery and approval tools using authorised test users. |
| Android custom stops | Manual coordinate entry remains | Either make the feature usable on Android or scope the first release honestly; test 3 km/fee/approval controls on a physical phone. |
| Store privacy/legal declarations | Draft worksheet only | Owner approves legal entity, policy/contact URLs, retention, data labels, age/content questionnaire and encryption declarations. |
| Native signed QA | Expo Go/JavaScript tests are not signed binary testing | Signed physical iPhone/Android builds, release checklist and real screenshots |

**Recommended target:** be ready for a controlled TestFlight/Google Play test on 4 November if public production eligibility cannot be completed. External TestFlight testing can also require Apple review. Internal distribution is not a public App Store/Play launch.

## Owner account setup — start today

1. Choose the legal seller identity and personal versus organisation accounts; do not choose an organisation solely to evade testing rules. Organisation identity/verification may take time.
2. Apple: sign in with an Apple Account using two-factor authentication, begin Apple Developer Program enrollment, and follow the legal-entity/identity steps. Purchase only after reviewing the official terms and current price.
3. Google: create Play Console using the chosen legal account type, complete identity/device verification and pay only after reviewing current terms. Read the production-access requirements shown for that account.
4. Once active, create the Ridely app records, confirm `ca.ridely.app`, supply seller/support/privacy details and grant narrowly scoped build/submission access. Do not share passwords or signing keys in chat.
5. Record account activation and testing requirements. If the personal-account 14-day closed test applies and begins 29 October, its earliest completion is 12 November, subject to continuous testing and production-access approval.

Public store availability on 4 November is therefore **not a committed date**. Aim for a tested signed candidate/controlled test if eligible, then publish when the stores approve.

## Dated critical path

- **Thu 29 Oct:** confirm developer-account status and Google testing eligibility; choose public release versus controlled beta target. Complete seller/legal details and reviewer contact.
- **Fri 30 Oct:** clear deletion and native UGC gates; verify operational production services. Then create signed builds only after the owner authorises any billable platform work.
- **Sat 31 Oct–Sun 1 Nov:** physical iPhone/Android QA, English/French, accessibility/large text, login/logout, request/acceptance, cancellation/credit restoration, custom stops, profile photo and messages. Collect final screenshots.
- **Mon 2 Nov:** freeze the candidate; complete App Privacy/Data safety/content questionnaires; upload and submit when every gate is clear. Earlier submission is better once ready.
- **Tue 3 Nov:** monitor review, answer questions, fix material issues and retest. Do not treat submission as approval.
- **Wed 4 Nov:** release only an approved eligible build, with backend/support ready. If still under review or testing restrictions, communicate a beta/test launch instead of promising public availability.

## Files

- [English listing](store-listing-en.md)
- [French listing](store-listing-fr.md)
- [Privacy/data worksheet](privacy-data-worksheet.md)
- [Reviewer access and review notes](reviewer-access.md)
- [Screenshot and physical QA checklist](screenshots-and-device-qa.md)
- [Official policy references to verify](policy-references.md)

Existing `apps/mobile/README.md` and `STORE_LISTING_DRAFT.md` remain useful background but include older navigation/photo descriptions. Use the actual final binary and this package for this release; do not copy outdated screenshots or unsupported claims.

## Latest message UI check

The bell has been removed. Signed-in users see **Messages** with a red unread number, and a full inbox grouped by accepted reservation. Counts are per account/thread, exclude the user's own messages, and clear when the returned conversation is read; other conversations remain unread. This is in-app polling, not push notifications. Migration `0030_message_reads.sql` must precede the Worker update. Update the isolated mobile test backend with `npm run mobile:test:setup` before testing this change in Expo Go.

Final local verification: 104 automated tests passed; beta/production configuration checks, iOS/Android JavaScript exports, website build, Worker dry-run, and public-page metadata checks passed. No signed cloud build, store upload, enrollment, account deletion implementation, or real customer action was performed.

## 30 October follow-up

Booking checks include the exact ten-minute request cutoff, driver acceptance, concurrent seat/credit limits, expiry and cancellation refunds. Native blocking uses the existing server enforcement and preserves existing reservations. Profile → Delete account initiates a password-confirmed support-reviewed request; it does not erase the account immediately. Public instructions are `/delete-account` and `/fr/supprimer-compte`. Apply migration `0031_account_deletion_requests.sql` before updating the Worker; update the isolated app backend with `npm run mobile:test:setup` before testing this flow.

Password recovery remains missing. Configured Ridely email sender and delivery code are evidence of plumbing only; live provider credentials/domain and inbox receipt remain unverified. The deploy preflight checks the D1 identifier, not all operational services. Developer accounts, reviewer access, final privacy declarations and signed phone QA still remain. See [deletion handling runbook](account-deletion-runbook.md) for the incomplete erasure/retention release gate.

Follow-up validation: **111 automated tests passed**, including actual HTTP deletion requests, English/French deletion-screen checks, native block/unblock and exact booking cutoff behavior. Website build, iOS/Android JavaScript exports, Worker dry-run, beta/production configuration checks and metadata checks for 18 public pages passed. These checks do not establish live migration/email completion or signed store-build approval.
