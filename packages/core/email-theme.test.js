import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {accountEmailTemplate,accountEmailKinds} from './account-emails.js';
import {emailPalette,verificationEmail,tripUpdateEmail,ridelyEmail} from './email-theme.js';
test('all account, document, verification-code and trip emails share the Ridely palette, logo and wordmark',()=>{
 const templates=[];for(const locale of ['en','fr']){for(const kind of accountEmailKinds)templates.push(accountEmailTemplate(kind,locale));templates.push(verificationEmail('012345',locale),tripUpdateEmail('Your reservation was cancelled.',locale));}
 for(const email of templates){assert.match(email.html,/data-ridely-email="v1"/);for(const color of [emailPalette.lime,emailPalette.ink,emailPalette.paper])assert.ok(email.html.includes(color));assert.ok(email.html.includes('https://ridely.ca/images/ridely-logo.png'));assert.ok(email.html.includes('alt="Ridely logo"'));assert.match(email.html,/>ridely<span/);assert.ok(email.text);assert.ok(email.html.includes('support@ridely.ca'));assert.equal(email.html.includes('<script'),false)}
 const logo=readFileSync(new URL('../../apps/web/public/images/ridely-logo.png',import.meta.url));assert.equal(logo.readUInt32BE(16),128);assert.equal(logo.readUInt32BE(20),128);
});
test('verification codes remain selectable, preserve leading zeroes and expire after ten minutes',()=>{
 const en=verificationEmail('012345','en'),fr=verificationEmail('012345','fr');assert.match(en.html,/<strong>012345<\/strong>/);assert.ok(en.text.includes('012345'));assert.ok(en.text.includes('10 minutes'));assert.ok(fr.text.includes('10 minutes'));assert.ok(fr.html.includes('lang="fr"'));assert.throws(()=>verificationEmail('<img>','en'));
});
test('theme escapes message content and falls back to safe brand URLs',()=>{
 const email=ridelyEmail({subject:'<script>alert(1)</script>',body:'<img src=x onerror=alert(1)>',footer:'<iframe>',env:{RIDELY_PUBLIC_URL:'javascript:alert(1)'}});assert.ok(email.html.includes('&lt;script&gt;'));assert.equal(email.html.includes('<script>'),false);assert.equal(email.html.includes('<img src=x'),false);assert.ok(email.html.includes('https://ridely.ca/images/ridely-logo.png'));
 const fr=tripUpdateEmail('Your custom stop request is now approved. Open My trips for details.','fr');assert.ok(fr.text.includes('approuvée'));assert.ok(fr.text.includes('/notifications?lang=fr'));assert.ok(fr.text.includes('/account?lang=fr'));
});
