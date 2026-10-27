import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkMobileRelease} from '../../../scripts/check-mobile-release.mjs';
const app=JSON.parse(readFileSync(new URL('../app.json',import.meta.url),'utf8')),eas=JSON.parse(readFileSync(new URL('../eas.json',import.meta.url),'utf8'));
test('store profiles keep test data separate and detect environment overrides or simulator uploads',()=>{
 for(const profile of ['preview','device-preview','beta','production'])assert.deepEqual(checkMobileRelease({app,eas,profile}),[]);
 assert(checkMobileRelease({app,eas,profile:'beta',runtime:{EXPO_PUBLIC_API_URL:'https://ridely.ca'}}).length);
 const invalid=structuredClone(eas);invalid.build.beta.ios.simulator=true;assert(checkMobileRelease({app,eas:invalid,profile:'beta'}).length);
 invalid.build.production.env.EXPO_PUBLIC_API_URL='https://ridely-app-test.bonjour-847.workers.dev';assert(checkMobileRelease({app,eas:invalid,profile:'production'}).length);
 assert.equal(eas.submit.beta.android.track,'internal');assert.equal(eas.submit.production.android.releaseStatus,'draft');
});
