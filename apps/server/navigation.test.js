import test from 'node:test';
import assert from 'node:assert/strict';
import {withoutDriverReturn} from '../web/src/navigation.js';
test('leaving Stripe return keeps language/search and hash but removes every verification return marker',()=>{
 assert.equal(withoutDriverReturn('https://ridely.ca/?driver-verification=return'),'/');
 assert.equal(withoutDriverReturn('/fr?driver-verification=return&lang=fr#draft'),'/fr?lang=fr#draft');
 assert.equal(withoutDriverReturn('/search?from=Montr%C3%A9al&to=Ottawa&driver-verification=return&driver-verification=again'),'/search?from=Montr%C3%A9al&to=Ottawa');
 assert.equal(withoutDriverReturn('/my-listings'),'/my-listings');
});
