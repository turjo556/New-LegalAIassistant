# First-booking mobile website review

## Completed work

Two agents reviewed the first-use passenger and driver paths. Local browser tests used synthetic accounts and local test data; external email/Stripe interactions were not exercised.

- Passenger: declined, expired and withdrawn requests retain an explicit result on the request page, including after reload/polling. The page states that no seat/credit was used. A fresh request requires an explicit action and fresh consent. Pending and confirmed states remain separate.
- Driver: publishing readiness now includes the selected vehicle and licence/insurance coverage through the selected ride date. A new listing needing review can be saved privately; an invalid edit stays in the editor with a specific error and does not create a second ride or draft.
- Driver account expiry uses America/Toronto's date, matching pilot trip dates, so UTC midnight does not remove approval early in the local evening.
- French translations cover the new status and validation messages.

## Validation

- 94 automated regression tests passed, including selected-vehicle/date boundaries and the Eastern-vs-UTC expiry boundary.
- Production website build and Worker dry-run passed.
- All 18 public pages passed SEO metadata/assets checks.
- Passenger browser checks passed: EN/FR at 320/390/900/1440px, sign-in return, private profile continuation, credits, quantities, disclosures, pending/confirmed/cancelled, full/missing ride, plus declined/expired/withdrawn outcomes and explicit retry with fresh consent. No runtime errors.
- Driver browser checks passed with a local backend: prefilled private vehicle details, save in place, vehicle/date mismatch preserving edits, French mobile view, booked-seat editing restrictions, new-ride save-and-verify behavior. No runtime errors.

## Limits and release

Prepared for user review; not deployed in this batch. Live email receipt, live Stripe Identity completion, production account creation, and real mobile devices were not tested by these local automated checks. No real messages, payments or production data changes were made.
