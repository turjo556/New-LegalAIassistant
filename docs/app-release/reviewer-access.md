# Reviewer access and release notes — private-console plan

No passwords or secrets belong in this repository. Complete account credentials only in the stores' private App Review/App access fields.

## Choose the correct candidate

- `beta` EAS profile uses the isolated synthetic test backend. Identify it honestly as a test/beta build; no real trips, identity checks, charges or payouts occur there.
- `production` profile uses `https://ridely.ca`. Do not submit a synthetic-backend binary as the public production product, and do not seed fake public rides or fake approvals into production just for a screenshot.
- The first public candidate must provide a reliable way for reviewers to inspect relevant functionality without supplying a real licence or selfie. Plan dedicated authorised reviewer access and clearly labelled, isolated review data. Keep production inventory genuine. Decide/test this before building; the current beta profile alone does not solve production reviewer access.

## Private console fields to complete

- Review contact name, email, reachable phone and support hours.
- Passenger reviewer email/password and driver reviewer email/password, privately supplied.
- Whether any one-time email-code step is required; provide a stable documented review path rather than asking reviewers to wait on an unmonitored inbox.
- Exact build/backend used and which features use synthetic data.
- Explain cash fares versus booking credits, disabled native credit purchases, and no live GPS/push notifications.
- Working support/privacy/deletion URLs after implementation and verification.

## English review-note draft

Ridely is an intercity ridesharing pilot for Montréal, Longueuil, Ottawa and Gatineau. The app supports passenger and driver accounts using one sign-in. Home provides role shortcuts; the bottom tabs are Home, Search, Post, Cart and Profile.

A passenger requests standard seats and the driver must accept before a booking is confirmed. One booking credit is used on acceptance; the ride fare is paid directly to the driver in cash. Native credit purchases are disabled in this candidate. Custom stops are optional, priced separately, and require the driver to offer and approve them.

Driver identity, licence eligibility and insurance are separate checks. Reviewers should use the privately supplied driver access to inspect an approved flow; they should not upload personal identity documents. State the tested review environment and synthetic-data behavior here before submission.

Boarding codes and revocable itinerary links share booking/trip details; they are not live GPS or a safety guarantee. Messages and updates refresh while the app is open. Push notifications are not connected.

Trip reviews become eligible after both completion confirmations and publish after both sides review or the review window ends. Safety reports go to support. Include exact in-app blocking/deletion instructions here once those release gates are implemented and tested.

## Français — note de révision

Ridely est un projet pilote de covoiturage interurbain entre Montréal, Longueuil, Ottawa et Gatineau. Un même compte permet d’être passager ou conducteur. L’accueil présente les deux rôles; les onglets sont Accueil, Recherche, Publier, Panier et Profil.

Le passager demande des places standards et le conducteur doit accepter avant confirmation. Un crédit est utilisé à l’acceptation; le prix du trajet est payé au conducteur en espèces. Les achats de crédits dans l’application sont désactivés dans cette version. Les arrêts personnalisés sont facultatifs, facturés séparément et soumis à l’accord du conducteur.

Les vérifications d’identité, de droit de conduire et d’assurance sont distinctes. Utilisez les accès privés fournis pour consulter le parcours conducteur approuvé; aucun document d’identité personnel du réviseur ne doit être nécessaire. Préciser l’environnement et les données de démonstration avant soumission.

Les codes d’embarquement et liens d’itinéraire temporaires ne constituent ni un suivi GPS en direct ni une garantie de sécurité. Les messages sont actualisés lorsque l’application est ouverte; les notifications poussées ne sont pas connectées. Ajouter les instructions de blocage et de suppression du compte après leur mise en œuvre et leur validation.

## Candidate notes

The listing/review notes must be reconciled with the final message unread indicator requested by the owner. Do not show a bell screenshot if the final build uses a red number beside Messages. Never claim a successful store review based on local JavaScript export/configuration checks.
