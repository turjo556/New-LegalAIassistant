# Passenger payments — launch decisions and implementation plan

Current state: Riders get two free booking credits; afterward, each reservation requires a credit purchased at $3.99 CAD. Credit Checkout is implemented but remains disabled until its dedicated Stripe secrets, webhook and activation flag are configured. Stripe Identity is configured independently; it does not enable passenger charges or driver payouts. Pilot fares are paid directly to drivers in cash. The separate founding-driver promotion has an operator-reviewed manual Interac payment ledger; the website does not send bank transfers.

Use the Ridely Stripe business account to confirm Connect eligibility for Canadian intercity ridesharing, supported payment/transfer flows, payout scheduling, and platform liability before integration. Drivers will need Connect payout onboarding in addition to identity/licence/insurance checks. An Identity result is not payment-account approval.

Decisions needed before checkout implementation:

- Booking credits: owner-approved $3.99 CAD per reservation credit, separate from the driver cash fare. Two welcome credits are automatic. Future online ride fares and any additional fee structure still require decisions.
- Rider and driver cancellation rules: cutoffs, refunds, cancellation compensation if any, and treatment of processing fees and disputes.
- Who confirms a completed trip, when driver payouts become eligible, and how delays/disputes affect payout. Confirm Stripe supports the intended timing; do not call it escrow.
- Any changes to the existing founding-driver campaign must preserve the approved $625 allocation cap and distinguish manual bonus transfers from future automated ride-fare payouts.

Implementation should create expiring seat holds backed by database inventory constraints, create a CAD hosted Stripe Checkout session with prices calculated on the server, and confirm bookings only from signature-verified, idempotently processed payment events. Failed/expired checkout must release holds. Define refund reconciliation, payout/transfer idempotency, dispute operations, and reconciliation jobs before accepting real money. Approved custom-stop fees need explicit passenger acceptance and a separate payment event; never silently add them to an existing card charge. Stripe hosts card entry; Ridely should not store card details.

The owner has approved a $25 bonus for up to 25 eligible drivers. Migration 0012 starts this campaign at deployment; the public terms show its start. Driver completion plus passenger travel confirmation, operator review, private Interac recipient emails, a capped allocation ledger and manual transfer records are implemented. No real transfers are initiated by the application. See SERVICE_SETUP.md for qualification, review, recording and reconciliation instructions.

The credit ledger and Stripe Checkout verification do not replace the remaining ride-payment plan. See SERVICE_SETUP.md for dedicated credit-payment setup, sandbox testing, activation and refund/dispute limitations.
