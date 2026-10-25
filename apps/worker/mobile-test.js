// Separate app-testing entry point. Never used by wrangler.json / production.
import app from './index.js';
export const TEST_MARKER='ridely-mobile-test-v1';
export function testEnvironment(env,origin){return {DB:env.DB,ASSETS:env.ASSETS,LICENCE_ENCRYPTION_KEY:env.LICENCE_ENCRYPTION_KEY,RIDELY_PUBLIC_URL:origin,SUPPORT_EMAIL:'support@ridely.ca',PILOT_SUPPORT_24_7:'false',CREDITS_PAYMENTS_ENABLED:'false'};}
const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Ridely-Environment':'isolated-test','X-Robots-Tag':'noindex, nofollow'}});
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(env.RIDELY_TEST_ENVIRONMENT!==TEST_MARKER)return json(503,{error:'Test environment is not activated.'});
 try{const row=await env.DB.prepare('SELECT label FROM ridely_test_marker WHERE label=?').bind(TEST_MARKER).first();if(!row)return json(503,{error:'A separate test database is required.'});}catch{return json(503,{error:'A separate test database is required.'});}
 if(url.pathname==='/api/health')return json(200,{status:'ok',environment:'isolated-test',simulatedChecks:true});
 // Only the two synthetic accounts are allowed to sign in. No real signups,
 // provider messages, identity sessions, purchased credits or operator actions.
 if(['/api/register','/api/driver/licence/submit','/api/rider/profile/save'].includes(url.pathname)||url.pathname.startsWith('/api/admin/')||url.pathname.startsWith('/api/verification/')||url.pathname.startsWith('/api/driver/identity/')||url.pathname.startsWith('/api/credits/'))return json(403,{error:'This isolated preview uses synthetic test accounts. Real signups, provider verification and purchases are disabled.'});
 if(url.pathname==='/api/login'){
  let body;try{body=await request.clone().json();}catch{return json(400,{error:'Enter the test account email and password.'});}
  if(!['driver@ridely.test','rider@ridely.test'].includes(String(body.email||'').toLowerCase().trim()))return json(403,{error:'Use one of the synthetic test accounts saved by the setup command.'});
 }
 const response=await app.fetch(request,testEnvironment(env,url.origin));
 const headers=new Headers(response.headers);headers.set('X-Ridely-Environment','isolated-test');headers.set('X-Robots-Tag','noindex, nofollow');headers.set('Cache-Control','no-store');
 if(response.ok&&headers.get('Content-Type')?.includes('application/json')){const data=await response.json();if(Array.isArray(data.rides))data.testing={isolated:true,simulatedChecks:true};return new Response(JSON.stringify(data),{status:response.status,headers});}
 if(headers.get('Content-Type')?.includes('text/html')){const html=await response.text();headers.delete('Content-Length');headers.delete('Content-Encoding');headers.delete('ETag');return new Response(html.replace(/<body[^>]*>/i,match=>match+'<aside style="background:#c5ff28;color:#11120f;padding:12px;font:700 14px system-ui;text-align:center;position:relative;z-index:99999">RIDELY TEST ENVIRONMENT · Synthetic accounts and simulated approvals · No real trips or payments</aside>'),{status:response.status,headers});}
 return new Response(response.body,{status:response.status,headers});
}};
