import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sitePages,pageHead,renderPageBody,SITE_ORIGIN} from '../packages/core/site-pages.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dist=resolve(root,'apps/web/dist');
const template=readFileSync(resolve(dist,'index.html'),'utf8');
const css=[...template.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(m=>m[0]).join('');
for(const page of sitePages){
 const home=page.kind==='home';
 let html=home?template:`<!doctype html><html lang="${page.lang}"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="theme-color" content="#11120f"/><link rel="icon" type="image/svg+xml" href="/favicon.svg"/>${css}</head><body><div id="root"></div></body></html>`;
 html=html.replace(/<html lang="[^"]*"/,'<html lang="'+page.lang+'"').replace(/<title>[\s\S]*?<\/title>/g,'').replace(/<meta[^>]+(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/g,'').replace('</head>',pageHead(page)+'</head>');
 html=html.replace('<div id="root"></div>','<div id="root"><!--seo-start-->'+renderPageBody(page)+'<!--seo-end--></div>');
 const file=resolve(dist,page.path==='/'?'index.html':page.path.slice(1)+'.html');mkdirSync(dirname(file),{recursive:true});writeFileSync(file,html);
}
writeFileSync(resolve(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+sitePages.map(p=>`<url><loc>${SITE_ORIGIN+p.path}</loc><xhtml:link rel="alternate" hreflang="${p.lang==='fr'?'fr-CA':'en-CA'}" href="${SITE_ORIGIN+p.path}"/><xhtml:link rel="alternate" hreflang="${p.lang==='fr'?'en-CA':'fr-CA'}" href="${SITE_ORIGIN+p.alternate}"/></url>`).join('\n')+'\n</urlset>\n');
writeFileSync(resolve(dist,'robots.txt'),'User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: '+SITE_ORIGIN+'/sitemap.xml\n');
writeFileSync(resolve(dist,'404.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>Page not found | Ridely</title>'+css+'</head><body><main class="seo-page"><h1>Page not found / Page introuvable</h1><p><a href="/">Ridely home</a> · <a href="/fr">Accueil en français</a> · <a href="/search">Search rides</a></p></main></body></html>');
console.log(`Built ${sitePages.length} public English/French pages, sitemap, robots and 404 page.`);
