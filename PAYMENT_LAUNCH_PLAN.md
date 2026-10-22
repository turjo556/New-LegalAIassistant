# Passenger payments — launch decisions and implementation plan

Current state: Ridely reserves seats and collects no online payments. Stripe Identity is configured independently; it does not enable passenger charges or driver payouts. No payments, fees, payouts, refunds, or cash promotion payments are activated by the landing-page work.

Use the Ridely Stripe business account to confirm Connect eligibility for Canadian intercity ridesharing, supported payment/transfer flows, payout scheduling, and platform liability before integration. Drivers will need Connect payout onboarding in addition to identity/licence/insurance checks. An Identity result is not payment-account approval.

Decisions needed before checkout implementation:

- Ridely's fee amount, who pays it, and whether the displayed seat price includes it. No new fee is chosen or charged by the current site.
- Rider and driver cancellation rules: cutoffs, refunds, cancellation compensation if any, and treatment of processing fees and disputes.
- Who confirms a completed trip, when driver payouts become eligible, and how delays/disputes affect payout. Confirm Stripe supports the intended timing; do not call it escrow.
- Founding-driver bonus budget, start/end dates, claim deadline, trip eligibility/confirmation, and bonus payout method. A completed-trip event is not yet tracked; registrations and reservations must not count as completion.

Implementation should create expiring seat holds backed by database inventory constraints, create a CAD hosted Stripe Checkout session with prices calculated on the server, and confirm bookings only from signature-verified, idempotently processed payment events. Failed/expired checkout must release holds. Define refund reconciliation, payout/transfer idempotency, dispute operations, and reconciliation jobs before accepting real money. Approved custom-stop fees need explicit passenger acceptance and a separate payment event; never silently add them to an existing card charge. Stripe hosts card entry; Ridely should not store card details.

The launch bonus is advertised as **planned**, not earnable today. Driver signup, approval, and first listings can proceed while commercial terms and completion/payment tracking are prepared. Any activation must publish the final terms and dates first.
