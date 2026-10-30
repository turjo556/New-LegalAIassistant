# Account-deletion request handling — release gate

The app and website initiate a deletion request. They do not automatically erase accounts. Do not claim full automatic deletion or store compliance until an operator completes and verifies this process on a fictional account.

Public instructions: https://ridely.ca/delete-account and /fr/supprimer-compte. Account requests require a signed-in session, current password, and typed DELETE. Repeated requests create only one support ticket. The operator dashboard's support queue contains `Account deletion request` with the authenticated member ID. Email requests need ownership verification; never accept a supplied third-party ID as proof.

1. Assign the ticket and confirm the processing schedule with the member. No response/completion deadline is currently promised by the software. Establish and publish a lawful operational timeline before store submission.
2. Review upcoming rides, accepted bookings, pending seat requests, unresolved safety reports and outstanding payments/credits. Contact the member about cancellation; use existing cancellation tools so credits, partners and notifications remain correct. Do not silently cancel all trips by deleting database rows.
3. Record exactly which records require retention, why and for how long. A generic assertion of legal necessity is not a retention schedule. Confirm this policy with the business before release.
4. Use a reviewed, transactional erasure procedure: revoke every session; remove optional photo, private rider data, encrypted licence and insurance submissions, driver checks, drafts, contact identifiers, verification challenges and outbox destinations; redact Stripe Identity records through the provider where applicable. Purge unnecessary messages/review comments and exact private stop addresses. Preserve only justified trip/payment/fraud/safety records, pseudonymised where possible, and expire them under the approved schedule. Account rows cannot simply be deleted because bookings and audit records reference them.
5. Verify that old sessions fail, sign-in fails, profile/photo/document endpoints disclose nothing, backups follow the defined expiry, no queued email goes to the old account, and retained records contain only approved data. Inform the member of completion and specific exceptions before removing the final contact address.
6. Only then update `account_deletion_requests.status` to `completed` and resolve the support ticket. Never use ticket resolution alone as evidence of erasure.

Still required: an approved retention schedule, reviewed completion tooling, provider deletion testing and one complete end-to-end operational exercise. These are app-release blockers, not completed by adding the request button.
