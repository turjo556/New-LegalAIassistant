import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sitePages,SITE_ORIGIN} from '../packages/core/site-pages.js';
const dist=resolve(dirname(fileURLToPath(import.meta.url)),'../apps/web/dist');
const sitemap=readFileSync(resolve(dist,'sitemap.xml'),'utf8');
assert.equal((sitemap.match(/<loc>/g)||[]).length,sitePages.length);
for(const page of sitePages){const html=readFileSync(resolve(dist,page.path==='/'?'index.html':page.path.slice(1)+'.html'),'utf8');assert.match(html,new RegExp('<html lang="'+page.lang+'"'));assert.ok(html.includes('<h1>'));assert.ok(html.includes('href="'+SITE_ORIGIN+page.path+'"'));assert.ok(html.includes('href="'+SITE_ORIGIN+page.alternate+'"'));assert.equal((html.match(/<title>/g)||[]).length,1);assert.equal((html.match(/name="description"/g)||[]).length,1);assert.ok(sitemap.includes('<loc>'+SITE_ORIGIN+page.path+'</loc>'));const graph=JSON.parse(html.match(/id="ridely-schema">(.*?)<\/script>/)[1]);assert.equal(graph['@graph'][2].url,SITE_ORIGIN+page.path);if(page.kind!=='home')assert.ok(!/<script[^>]+type="module"/.test(html),'Guides should work without application JS');for(const asset of [...html.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g)].map(m=>m[1]))assert.ok(existsSync(dist+asset),'Missing asset '+asset);}
assert.ok(readFileSync(resolve(dist,'robots.txt'),'utf8').includes('Sitemap: https://ridely.ca/sitemap.xml'));
console.log('All '+sitePages.length+' built public pages have readable HTML, canonical/language metadata, valid JSON-LD and working local assets.');
