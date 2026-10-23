import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {createApp} from './index.js';
import {testDatabase} from '../../scripts/test-driver-fixture.mjs';
test('licence reviews use normal verified operator login without an extra key, password or unlock grant',async t=>{
 const dbPath=testDatabase(t),server=createApp({dbPath,env:{LICENCE_ENCRYPTION_KEY:randomBytes(32).toString('base64'),RIDELY_ADMIN_EMAIL:'operator@example.com'}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,db=new DatabaseSync(dbPath),cookies={},password='operator-test-password';
 async function req(path,b,who='operator',status=200){const r=await fetch(base+'/api/'+path,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookies[who]||''},body:b?JSON.stringify(b):undefined});const data=await r.json();assert.equal(r.status,status,data.error||'Unexpected response');if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return data}
 try{
 for(const name of ['operator','first','second'])await req('register',{name,email:name+'@example.com',password},name);
 db.prepare('UPDATE users SET email_verified=1').run();
 const ids={};for(const name of ['first','second']){await req('driver/enrol',{licenceProvince:'QC',eligibilityConsent:true},name);await req('driver/licence/submit',{number:'A000000000000',consent:true},name);ids[name]=(await req('state',null,name)).user.id}
 const reveal=id=>({id,purpose:'authority_check',confirmed:true});
 await req('admin/licence/reveal',reveal(ids.first),'guest',401);await req('admin/licence/reveal',reveal(ids.first),'second',403);
 db.prepare("UPDATE users SET email_verified=0 WHERE email='operator@example.com'").run();await req('admin/licence/reveal',reveal(ids.first),'operator',403);db.prepare("UPDATE users SET email_verified=1 WHERE email='operator@example.com'").run();
 assert.equal((await req('admin/licence/reveal',reveal(ids.first))).number,'A000000000000');assert.equal((await req('admin/licence/reveal',reveal(ids.second))).number,'A000000000000');
 assert.equal(db.prepare('SELECT COUNT(*) n FROM licence_review_sessions').get().n,0);
 await req('admin/licence/unlock',{},'operator',410);await req('admin/licence/status',{},'operator',410);await req('admin/licence/lock',{},'operator',410);
 await req('login',{email:'operator@example.com',password},'otherLogin');assert.equal((await req('admin/licence/reveal',reveal(ids.first),'otherLogin')).number,'A000000000000');
 await req('logout',{});await req('admin/licence/reveal',reveal(ids.first),'operator',401);
 db.prepare('UPDATE sessions SET expires=0').run();await req('admin/licence/reveal',reveal(ids.first),'otherLogin',401);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM licence_access_log WHERE action='revealed_for_authority_check'").get().n,3);
 }finally{await new Promise(r=>server.close(r));db.close()}
});
