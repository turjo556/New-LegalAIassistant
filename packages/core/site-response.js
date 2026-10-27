import {sitePage} from './site-pages.js';
export const appPaths=new Set(['/search','/my-trips','/my-listings','/saved','/cart','/join','/login','/trip-share','/offer-a-ride','/driver-verification','/account','/profile','/help','/policies','/notifications','/messages','/operator']);
const prod=host=>['ridely.ca','www.ridely.ca'].includes(host);
const robots=(text)=>new Response(text,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
export async function siteResponse(req,assets){
 const url=new URL(req.url),production=prod(url.hostname);
 if(!['GET','HEAD'].includes(req.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD','X-Robots-Tag':'noindex'}});
 const redirect=(path)=>{const target=new URL(path,url);if(production){target.protocol='https:';target.hostname='ridely.ca';target.port='';}return Response.redirect(target.href,308);};
 if(production&&(url.hostname==='www.ridely.ca'||url.protocol!=='https:'))return redirect(url.pathname+url.search);
 if(url.pathname==='/robots.txt'&&!production)return robots('User-agent: *\nDisallow: /\n');
 if(url.pathname==='/sitemap.xml'&&!production)return new Response('Not found',{status:404,headers:{'X-Robots-Tag':'noindex'}});
 if(['/','/fr'].includes(url.pathname)&&['en','fr'].includes(url.searchParams.get('lang'))){const next=url.searchParams.get('lang')==='fr'?'/fr':'/';url.searchParams.delete('lang');return redirect(next+(url.searchParams.size?'?'+url.searchParams:''));}
 const path=url.pathname;
 if(path.endsWith('/')&&path!=='/'&&(sitePage(path.slice(0,-1))||appPaths.has(path.slice(0,-1))))return redirect(path.slice(0,-1)+url.search);
 if(path.endsWith('.html')&&sitePage(path.slice(0,-5)))return redirect(path.slice(0,-5)+url.search);
 const page=sitePage(path),app=appPaths.has(path),file=/\.[a-zA-Z0-9]+$/.test(path);
 const known=!!page||app||file;
 const assetUrl=new URL(req.url);assetUrl.pathname=app?'/':known?path:'/404.html';assetUrl.search='';
 const response=await assets.fetch(new Request(assetUrl,{method:'GET',headers:req.headers}));
 const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');
 const sensitiveQuery=[...url.searchParams.keys()].some(k=>!k.startsWith('utm_')&&!['gclid','fbclid'].includes(k));
 if(!production||app||!known||sensitiveQuery||response.status===404)headers.set('X-Robots-Tag','noindex, follow');
 const status=!known?404:response.status;
 if(app&&response.ok){let html=await response.text();html=html.replace(/<!--seo-start-->[\s\S]*?<!--seo-end-->/,'').replace(/<script[^>]+id="ridely-schema"[^>]*>[\s\S]*?<\/script>/,'').replace(/<link[^>]+rel="(?:canonical|alternate)"[^>]*>/g,'').replace(/<meta name="robots"[^>]*>/,'<meta name="robots" content="noindex,follow"/>');headers.delete('Content-Length');headers.delete('Content-Encoding');headers.delete('ETag');headers.set('Cache-Control','no-store');return new Response(req.method==='HEAD'?null:html,{status,headers});}
 return new Response(req.method==='HEAD'?null:response.body,{status,headers});
}
