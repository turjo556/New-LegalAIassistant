# Utility app navigation and interface polish

Prepared locally for user review; not pushed or deployed.

## Mobile app

- Home presents “I’m a passenger” and “I’m a driver”, plus My trips, saved rides and booking credits.
- Five permanent tabs: Home, Search, Post, Cart, Profile. My trips and saved rides remain child destinations of Home.
- Removed the promotional BrandHero/photo content from the app; website photography is unchanged.
- Posting opens as a dedicated screen, with the entered draft retained when switching tabs. Signed-out Post resumes after login; cancelling sign-in clears that destination.
- Profile links to reviews and photo editing instead of rendering all those forms inline. Existing setup, messages, safety tools, notifications and reviews remain reachable.
- Cart uses existing booking-credit functionality. Ride fares remain cash to the driver; this does not activate credit purchases or add in-app payment processing.
- Added dependency-free utility icons and French labels; no native package/version changes.
- Larger supporting text and fields, clearer status/control spacing, and scoped custom-stop/review component polish.

## Website

Scoped account, review, ride-card/details and booking-review CSS improvements: clearer text contrast/hierarchy, larger phone controls and fields, readable supporting copy, visible focus, consistent surfaces. No business-rule changes.

## Validation

101 automated tests passed. Native flow tests cover five-tab navigation with no hero images, both home-role shortcuts, cancelled sign-in, Post returning after login, draft retention, signup, review/credit/account access, requests/acceptance, custom-stop controls, boarding/sharing and mutual reviews. iOS and Android Expo/Hermes JavaScript export succeeded.

Website asset build and SEO checks for 18 public pages passed. Local browser checks covered seven routes (search, ride, request, account, reviews, rider setup, driver setup) in English and French at 320/390/768/1440 pixels, with no document overflow or runtime errors; request quantity and review controls remained functional.

The app bundles and automated native flows were tested locally; the new navigation still needs a hands-on Expo Go check on the user's phone before store release. No production data, email or payment action occurred.
