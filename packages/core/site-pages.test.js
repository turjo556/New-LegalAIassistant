import test from 'node:test';
import assert from 'node:assert/strict';
import {sitePages,sitePage,pageHead,renderPageBody,structuredData,searchLink} from './site-pages.js';
import {siteResponse} from './site-response.js';
test('public discovery pages have reciprocal language pairs, honest route content and valid schema',()=>{
 assert.equal(sitePages.length,18);assert.equal(new Set(sitePages.map(p=>p.path)).size,18);assert.equal(new Set(sitePages.map(p=>p.title)).size,18);
 for(const page of sitePages){assert.equal(sitePage(page.alternate).alternate,page.path);assert.notEqual(sitePage(page.alternate).lang,page.lang);const head=pageHead(page);assert.ok(head.includes('href="https://ridely.ca'+page.path+'"'));assert.ok(head.includes('hreflang="fr-CA"'));assert.ok(head.includes('hreflang="en-CA"'));assert.equal((head.match(/<title>/g)||[]).length,1);const schema=JSON.parse(head.match(/id="ridely-schema">(.*?)<\/script>/)[1]);assert.deepEqual(schema,structuredData(page));assert.ok(!JSON.stringify(schema).includes('aggregateRating'));assert.ok(!JSON.stringify(schema).includes('streetAddress'));const body=renderPageBody(page);assert.ok(body.includes('<h1>'));assert.ok(body.includes('href="/search?'));if(page.kind==='route'){const link=new URL(searchLink(page),'https://ridely.ca');assert.equal(link.searchParams.get('from'),page.route.from);assert.equal(link.searchParams.get('to'),page.route.to);assert.ok(body.includes('maps.app.goo.gl'));assert.ok(body.includes(page.lang==='fr'?'Départ':'Pickup'));assert.ok(body.includes('$3.99')||body.includes('3,99 $'));}}
});
test('site routing preserves app pages while stopping soft-404s and staging indexing',async()=>{
 const calls=[];const assets={async fetch(req){calls.push(new URL(req.url).pathname);return new Response('<html><head><title>Ridely</title><meta name="robots" content="index,follow"/><link rel="canonical" href="https://ridely.ca/"/><script type="application/ld+json" id="ridely-schema">{}</script></head><body><div id="root"><!--seo-start--><main>Public content</main><!--seo-end--></div><script src="/app.js"></script></body></html>',{headers:{'Content-Type':'text/html'}})}};
 const get=path=>siteResponse(new Request('https://ridely.ca'+path),assets);
 let r=await get('/rides/montreal-ottawa');assert.equal(r.status,200);assert.equal(r.headers.get('X-Robots-Tag'),null);assert.equal(calls.at(-1),'/rides/montreal-ottawa');
 r=await get('/my-trips');assert.equal(r.status,200);assert.match(r.headers.get('X-Robots-Tag'),/noindex/);let body=await r.text();assert.ok(!body.includes('Public content'));assert.ok(body.includes('/app.js'));assert.ok(!body.includes('application/ld+json'));assert.ok(!body.includes('rel="canonical"'));
 r=await get('/this-page-does-not-exist');assert.equal(r.status,404);assert.equal(calls.at(-1),'/404.html');
 r=await get('/?policy=policies');assert.match(r.headers.get('X-Robots-Tag'),/noindex/);
 r=await get('/?lang=fr');assert.equal(r.status,308);assert.equal(r.headers.get('Location'),'https://ridely.ca/fr');
 r=await get('/fr?lang=en');assert.equal(r.headers.get('Location'),'https://ridely.ca/');
 r=await get('/rides/montreal-ottawa/');assert.equal(r.headers.get('Location'),'https://ridely.ca/rides/montreal-ottawa');
 r=await siteResponse(new Request('https://www.ridely.ca/fr'),assets);assert.equal(r.headers.get('Location'),'https://ridely.ca/fr');
 r=await siteResponse(new Request('https://ridely-app-test.bonjour-847.workers.dev/robots.txt'),assets);assert.ok((await r.text()).includes('Disallow: /'));
 r=await siteResponse(new Request('https://ridely-app-test.bonjour-847.workers.dev/sitemap.xml'),assets);assert.equal(r.status,404);
 r=await siteResponse(new Request('https://ridely-app-test.bonjour-847.workers.dev/'),assets);assert.match(r.headers.get('X-Robots-Tag'),/noindex/);
 r=await siteResponse(new Request('https://ridely.ca/safety',{method:'HEAD'}),assets);assert.equal(await r.text(),'');
});
