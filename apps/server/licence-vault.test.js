import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createApp} from './index.js';
import {testDatabase} from '../../scripts/test-driver-fixture.mjs';
const number='A000000000000',password='secure-local-test-password';
test('licence vault encrypts, isolates, reauthenticates, audits, expires and deletes submissions',async t=>{
 const dbPath=testDatabase(t),env={LICENCE_ENCRYPTION_KEY:randomBytes(32).toString('base64'),RIDELY_ADMIN_EMAIL:'operator@example.com'},server=createApp({dbPath,env});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,db=new DatabaseSync(dbPath),cookies={};
 async function req(path,b,who='driver',expected=200){const r=await fetch(base+'/api/'+path,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookies[who]||''},body:b?JSON.stringify(b):undefined});const data=await r.json();assert.equal(r.status,expected,data.error||'Unexpected status');assert.equal(r.headers.get('cache-control'),'no-store');if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return data}
 try{
 for(const name of ['driver','other','operator'])await req('register',{name,email:name+'@example.com',password},name);
 await req('driver/enrol',{licenceProvince:'QC',eligibilityConsent:true});
 const id=db.prepare("SELECT id FROM users WHERE email='driver@example.com'").get().id;
 const submit={number,consent:true};
 await req('driver/licence/submit',submit,'guest',401);await req('driver/licence/submit',submit,'driver',403);db.prepare('UPDATE users SET email_verified=1').run();
 await req('driver/licence/submit',{...submit,consent:false},'driver',400);await req('driver/licence/submit',{...submit,number:'bad'},'driver',400);
 await req('driver/licence/submit',{...submit,number:'a0000-000000-00'});
 let stored=db.prepare('SELECT * FROM licence_submissions').get();assert.ok(stored.ciphertext);assert.notEqual(stored.ciphertext,number);assert.equal(JSON.stringify(stored).includes(number),false);assert.ok(stored.expires_at>Date.now()+29*86400000);
 const before=stored;await req('driver/licence/submit',submit);stored=db.prepare('SELECT * FROM licence_submissions').get();assert.notEqual(stored.iv,before.iv);assert.notEqual(stored.ciphertext,before.ciphertext);
 assert.ok(!JSON.stringify(await req('state')).includes(number));assert.ok(!JSON.stringify(await req('state',null,'guest')).includes('ciphertext'));assert.ok(!JSON.stringify(await req('admin/drivers',{},'operator')).includes(stored.ciphertext));
 const reveal={id,password,purpose:'authority_check',confirmed:true};await req('admin/licence/reveal',reveal,'other',403);await req('admin/licence/reveal',{...reveal,password:'wrong-password'},'operator',403);await req('admin/licence/reveal',{...reveal,confirmed:false},'operator',400);
 const opened=await req('admin/licence/reveal',reveal,'operator');assert.equal(opened.number,number);assert.equal(opened.submissionId,stored.id);
 const operator=db.prepare("SELECT id FROM users WHERE email='operator@example.com'").get();await req('admin/licence/reveal',{...reveal,id:operator.id},'operator',403);
 const audit=db.prepare('SELECT * FROM licence_access_log').all();assert.equal(audit.filter(x=>x.action==='revealed_for_authority_check').length,1);assert.ok(!JSON.stringify(audit).includes(number));
 const review={id,licence:'approved',insurance:'approved',licenceExpires:'2099-12-31',insuranceExpires:'2099-12-31',vehicle:'Toyota',evidence:'local-insurance-reference',confirmed:true,authoritySource:'saaq',authorityCheckedOn:new Date().toISOString().slice(0,10),authorityReference:'local-authority-reference',classConfirmed:true,restrictionsConfirmed:true,holderConfirmed:true,licenceSubmissionId:stored.id};
 await req('admin/driver-review',{...review,licenceSubmissionId:before.id},'operator',409);
 await req('admin/driver-review',{...review,holderConfirmed:false},'operator',400);
 await req('admin/driver-review',{...review,evidence:number},'operator',400);
 await req('admin/driver-review',review,'operator');assert.equal(db.prepare('SELECT ciphertext FROM licence_submissions').get().ciphertext,null);await req('admin/licence/reveal',reveal,'operator',410);
 await req('driver/licence/submit',submit);assert.equal(db.prepare('SELECT licence_status FROM driver_checks WHERE user_id=?').get(id).licence_status,'pending');
 db.prepare("UPDATE licence_submissions SET province='ON'").run();await req('admin/licence/reveal',reveal,'operator',503);
 await req('driver/licence/submit',submit);db.prepare('UPDATE licence_submissions SET expires_at=0').run();await req('state');assert.equal(db.prepare('SELECT ciphertext FROM licence_submissions').get().ciphertext,null);assert.equal((await req('state')).driverVerification.licenceSubmission.status,'expired');
 await req('driver/licence/submit',submit);await req('driver/licence/delete',{});assert.equal(db.prepare('SELECT ciphertext FROM licence_submissions').get().ciphertext,null);assert.equal(db.prepare('SELECT eligibility_consent_at FROM driver_checks WHERE user_id=?').get(id).eligibility_consent_at,null);
 await req('driver/licence/submit',submit,'driver',400);
 await req('driver/enrol',{licenceProvince:'QC',eligibilityConsent:true});await req('driver/licence/submit',submit);
 const {licenceApi}=await import('../../packages/core/licence-vault.js');const actor=db.prepare('SELECT * FROM users WHERE id=?').get(operator.id);const adapter={get:async(sql,...a)=>db.prepare(sql).get(...a),run:async(sql,...a)=>db.prepare(sql).run(...a)};
 await assert.rejects(()=>licenceApi('/api/admin/licence/reveal',reveal,actor,adapter,{...env,LICENCE_REQUEST_SECURE:true},async()=>{db.prepare("UPDATE licence_submissions SET status='withdrawn',ciphertext=NULL,iv=NULL WHERE user_id=?").run(id);return true}),e=>e.status===409);
 assert.equal(readFileSync(dbPath).includes(Buffer.from(number)),false);
 }finally{await new Promise(r=>server.close(r));db.close()}
});
test('unconfigured encryption never saves numbers',async t=>{
 const dbPath=testDatabase(t),server=createApp({dbPath,env:{}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;try{const r=await fetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Driver',email:'driver@example.com',password})});const state=await r.json();assert.equal(state.driverVerification.licenceSubmissionAvailable,false);const db=new DatabaseSync(dbPath);db.prepare('UPDATE users SET email_verified=1').run();const cookie=r.headers.get('set-cookie').split(';')[0];const headers={'Content-Type':'application/json',Cookie:cookie};await fetch(base+'/api/driver/enrol',{method:'POST',headers,body:JSON.stringify({licenceProvince:'QC',eligibilityConsent:true})});const submit=await fetch(base+'/api/driver/licence/submit',{method:'POST',headers,body:JSON.stringify({number,consent:true})});assert.equal(submit.status,503);assert.equal(db.prepare('SELECT COUNT(*) n FROM licence_submissions').get().n,0);db.close()}finally{await new Promise(r=>server.close(r))}
});
