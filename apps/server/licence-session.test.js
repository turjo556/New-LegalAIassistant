import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {createApp} from './index.js';
import {testDatabase} from '../../scripts/test-driver-fixture.mjs';
test('one password unlocks multiple licence reveals for ten minutes, bound to login, with expiry and manual lock',async t=>{
 const dbPath=testDatabase(t),server=createApp({dbPath,env:{LICENCE_ENCRYPTION_KEY:randomBytes(32).toString('base64'),RIDELY_ADMIN_EMAIL:'operator@example.com'}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,db=new DatabaseSync(dbPath),cookies={},password='operator-test-password';
 async function req(path,b,who='operator',status=200){const r=await fetch(base+'/api/'+path,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookies[who]||''},body:b?JSON.stringify(b):undefined});const data=await r.json();assert.equal(r.status,status,data.error||'Unexpected response');if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return data}
 try{
 for(const name of ['operator','first','second'])await req('register',{name,email:name+'@example.com',password},name);
 db.prepare('UPDATE users SET email_verified=1').run();
 const ids={};for(const name of ['first','second']){await req('driver/enrol',{licenceProvince:'QC',eligibilityConsent:true},name);await req('driver/licence/submit',{number:'A000000000000',consent:true},name);ids[name]=(await req('state',null,name)).user.id}
 const reveal=id=>({id,purpose:'authority_check',confirmed:true});
 await req('admin/licence/unlock',{password,purpose:'authority_check',confirmed:true},'first',403);
 await req('admin/licence/reveal',reveal(ids.first),'operator',403);
 await req('admin/licence/unlock',{password:'wrong-password',purpose:'authority_check',confirmed:true},'operator',403);
 const grant=await req('admin/licence/unlock',{password,purpose:'authority_check',confirmed:true});assert.ok(grant.unlockedUntil>Date.now()+590000);assert.ok(grant.unlockedUntil<=Date.now()+600000);
 assert.equal((await req('admin/licence/reveal',reveal(ids.first))).number,'A000000000000');assert.equal((await req('admin/licence/reveal',reveal(ids.second))).number,'A000000000000');
 assert.equal((await req('admin/licence/status',{})).unlockedUntil,grant.unlockedUntil);
 await req('login',{email:'operator@example.com',password},'otherLogin');await req('admin/licence/reveal',reveal(ids.first),'otherLogin',403);assert.equal((await req('admin/licence/status',{},'otherLogin')).unlockedUntil,0);
 await req('admin/licence/lock',{});await req('admin/licence/reveal',reveal(ids.first),'operator',403);
 await req('admin/licence/unlock',{password,purpose:'authority_check',confirmed:true});db.prepare('UPDATE licence_review_sessions SET unlocked_until=0').run();await req('admin/licence/reveal',{...reveal(ids.first),unlockedUntil:Date.now()+9999999},'operator',403);
 await req('admin/licence/unlock',{password,purpose:'authority_check',confirmed:true});await req('logout',{});assert.equal(db.prepare('SELECT COUNT(*) n FROM licence_review_sessions').get().n,0);await req('admin/licence/reveal',reveal(ids.first),'operator',401);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM licence_access_log WHERE action='revealed_for_authority_check'").get().n,2);assert.equal(db.prepare('SELECT COUNT(*) n FROM licence_session_log').get().n,4);
 }finally{await new Promise(r=>server.close(r));db.close()}
});
