import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from './index.js';
import {testDatabase} from '../../scripts/test-driver-fixture.mjs';
const realFetch=globalThis.fetch;
test('verification emails follow the chosen French or English interface without changing code validation',async t=>{
 const server=createApp({dbPath:testDatabase(t),env:{RESEND_API_KEY:'re_fixture',EMAIL_FROM:'Ridely <no-reply@example.com>'}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port,mails=[];
 globalThis.fetch=async(url,options)=>{if(String(url).startsWith(base))return realFetch(url,options);assert.equal(String(url),'https://api.resend.com/emails');mails.push(JSON.parse(options.body));return Response.json({id:'fixture'})};t.after(()=>{globalThis.fetch=realFetch});
 for(const language of ['fr','en']){const registration=await realFetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Rider',email:language+'@example.com',password:'fixture-password-2026'})});assert.equal(registration.status,200);const headers={'Content-Type':'application/json',Cookie:registration.headers.get('set-cookie').split(';')[0],'Accept-Language':language};const sent=await realFetch(base+'/api/verification/send',{method:'POST',headers,body:JSON.stringify({kind:'email'})});assert.equal(sent.status,200);const mail=mails.at(-1);assert.equal(mail.subject,language==='fr'?'Votre code de confirmation Ridely':'Your Ridely verification code');const code=mail.html.match(/<strong>(\d{6})<\/strong>/)[1];const confirmed=await realFetch(base+'/api/verification/confirm',{method:'POST',headers,body:JSON.stringify({kind:'email',code})});assert.equal(confirmed.status,200);const state=await (await realFetch(base+'/api/state',{headers})).json();assert.equal(state.user.emailVerified,true)}
});
