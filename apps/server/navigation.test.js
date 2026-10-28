import test from 'node:test';
import assert from 'node:assert/strict';
import {withoutDriverReturn} from '../web/src/navigation.js';
test('leaving Stripe return keeps language/search and hash but removes every verification return marker',()=>{
 assert.equal(withoutDriverReturn('https://ridely.ca/?driver-verification=return'),'/');
 assert.equal(withoutDriverReturn('/fr?driver-verification=return&lang=fr#draft'),'/fr?lang=fr#draft');
 assert.equal(withoutDriverReturn('/search?from=Montr%C3%A9al&to=Ottawa&driver-verification=return&driver-verification=again'),'/search?from=Montr%C3%A9al&to=Ottawa');
 assert.equal(withoutDriverReturn('/my-listings'),'/my-listings');
});

test('section URLs round-trip and authentication returns stay within known Ridely pages',async()=>{
 const {readSection,sectionUrl,safeSectionReturn}=await import('../web/src/navigation.js');
 for(const [modal,path] of [['offer','/offer-a-ride'],['driver-onboarding','/driver-verification'],['account','/account'],['rider-profile','/profile'],['messages','/messages']]){assert.equal(sectionUrl(modal),path);assert.equal(readSection(path).modal,modal);assert.equal(safeSectionReturn(path),path);}
 for(const [community,path] of [['support','/help'],['policies','/policies'],['notifications','/notifications'],['admin','/operator']]){assert.equal(sectionUrl('community',{community}),path);assert.equal(readSection(path).community,community);}
 const message=sectionUrl('messages',{thread:'00000000-0000-4000-8000-000000000001'});assert.equal(readSection(message).thread,'00000000-0000-4000-8000-000000000001');
 assert.equal(readSection('/?driver-verification=return').modal,'driver-onboarding');assert.equal(readSection('/?policy=policies').community,'policies');assert.equal(readSection('/my-listings').view,'hosting');assert.equal(readSection('/join').authMode,'register');
 for(const value of ['https://evil.example','//evil.example','/login','/join','/not-a-page','javascript:alert(1)'])assert.equal(safeSectionReturn(value),null);
});

test('all dedicated app sections are routed before Cloudflare assets and remain non-indexable app routes',async()=>{
 const {readFileSync}=await import('node:fs');const {appPaths}=await import('../../packages/core/site-response.js');const {sectionPaths,communityPaths}=await import('../web/src/navigation.js');const config=JSON.parse(readFileSync(new URL('../../wrangler.json',import.meta.url)));
 for(const path of [...Object.values(sectionPaths),...Object.values(communityPaths)]){assert.ok(appPaths.has(path),path+' must serve the app shell');assert.ok(config.assets.run_worker_first.includes(path),path+' must reach the Worker');}
});

test('ride detail links survive reloads and auth returns and serve a noindex app shell',async()=>{
 const {readSection,safeSectionReturn}=await import('../web/src/navigation.js');
 const {siteResponse}=await import('../../packages/core/site-response.js');
 const path='/ride/00000000-0000-4000-8000-000000000001';
 assert.equal(readSection(path).view,'ride');assert.equal(readSection(path).rideId,'00000000-0000-4000-8000-000000000001');assert.equal(safeSectionReturn(path+'?lang=fr'),path+'?lang=fr');
 let requested;const response=await siteResponse(new Request('https://ridely.ca'+path),{fetch:async request=>{requested=new URL(request.url).pathname;return new Response('<html><meta name="robots" content="index,follow"/><!--seo-start-->Home<!--seo-end--></html>')}});
 assert.equal(requested,'/');assert.equal(response.status,200);assert.match(response.headers.get('X-Robots-Tag'),/noindex/);assert(!((await response.text()).includes('Home')));
 assert.equal(safeSectionReturn('/ride/bad/extra'),null);assert.equal(readSection('/rides/montreal-ottawa').rideId,null);
});

test('seat request review URLs serve a private app page and remain valid auth return targets',async()=>{
 const {readSection,safeSectionReturn}=await import('../web/src/navigation.js');const {siteResponse}=await import('../../packages/core/site-response.js');
 const path='/ride/test-ride/request?seats=2&lang=fr';assert.equal(readSection(path).view,'request');assert.equal(readSection(path).rideId,'test-ride');assert.equal(safeSectionReturn(path),path);assert.equal(safeSectionReturn('/ride/test-ride/request/other'),null);
 const response=await siteResponse(new Request('https://ridely.ca'+path),{fetch:async request=>{assert.equal(new URL(request.url).pathname,'/');return new Response('<html><meta name="robots" content="index,follow"/></html>')}});assert.equal(response.status,200);assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
});
