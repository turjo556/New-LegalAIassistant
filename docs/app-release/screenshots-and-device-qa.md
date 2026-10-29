# Screenshots and physical-device QA

Capture the final signed candidate in each language and supported phone size. Use current App Store Connect/Play Console requirements for exact accepted dimensions. Do not reuse website screenshots, Expo Go developer overlays, fabricated ratings, account credentials, private document images or misleading live-tracking maps.

## Screenshot sequence

| Shot | English caption | French caption | State needed |
|---|---|---|---|
| 1 Home | Your ride, your role | Votre trajet, votre rôle | Two simple passenger/driver shortcuts and five bottom tabs; no promotional hero photo |
| 2 Search | Find your next ride | Trouvez votre prochain trajet | Realistic, clearly authorised demo inventory; exact meeting points visible |
| 3 Request | Request your seats | Demandez vos places | Fare/credit separation and driver-approval state; no false confirmed seat |
| 4 Confirmed trip | Keep trip details together | Tous les détails du trajet | Vehicle, approved stops, luggage, boarding-code entry point; hide any real private code/plate |
| 5 Driver | Manage your departures | Gérez vos départs | A genuine staged request with acceptance/decline controls in a review environment |
| 6 Messages | Stay in touch for the trip | Échangez pour votre trajet | Final red unread-count behavior beside Messages; sample text without personal data |
| 7 Profile/reviews | Feedback after the journey | Des avis après le trajet | Use clearly staged approved review content, never imply fabricated reviews are real public members |

Only use enough screenshots to explain the actual experience. Cart shows booking credits and separate cash fare; do not imply a checkout exists when native purchases are disabled.

## Physical iPhone and Android checklist

- Cold launch from installed icon; no test banner in production and no wrong backend.
- Home → passenger search; Home → driver listing/post; all five tabs and back navigation.
- Post while signed out → sign-in → returns to posting; cancel sign-in returns safely.
- Switch tabs while drafting and restore entered values.
- Registration, email verification, adult profile, private data review/removal; full account deletion once implemented.
- Login/logout and recovery; sessions do not cross staging/production.
- Passenger request → driver accepts/declines/expires → correct message/unread count.
- Cash fare and credits clear; cancel restores one credit and seats once.
- Both-role trip completion and star reviews; first review remains hidden; no premature aggregate.
- Custom-stop offered/not offered; correct fee, address privacy and driver decision; Android coordinate UX assessed.
- Message send/reply/read indicator; no bell if removed; no false push-alert claim.
- Optional profile photo, denied permission, cancel picker, replace/remove photo; no camera/microphone prompt.
- Boarding-code hiding after backgrounding, itinerary sharing/revocation, report/block/support.
- Airplane mode, network recovery, retry, expired sessions, keyboard, large text, VoiceOver/TalkBack and small phones.
- Live authorised account/booking/cancellation emails arrive; support is reachable.

Record phone model, OS, build number, language, backend, result and screenshots. Stop release for a booking/privacy/account-access failure. A local native-component mock or Hermes export cannot prove these device behaviors.
