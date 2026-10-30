import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from './index.js';
import {testDatabase} from '../../scripts/test-driver-fixture.mjs';
test('deletion request verifies password, survives refresh and reaches operator support queue without deleting account',async t=>{
 const dbPath=testDatabase(t),server=createApp({dbPath,env:{RIDELY_ADMIN_EMAIL:'operator@example.test'}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port,password='test-deletion-password';let cookie='';
 async function req(path,body,status=200,auth=true){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:auth?cookie:''},body:body?JSON.stringify(body):undefined});const result=await r.json();assert.equal(r.status,status,result.error);if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return result;}
 const initial=await req('register',{name:'Delete me',email:'member@example.test',password});assert.equal(initial.accountDeletion,null);
 await req('account/deletion/request',{confirmation:'DELETE',password},401,false);
 await req('account/deletion/request',{confirmation:'DELETE',password:'wrong'},401);
 let state=await req('account/deletion/request',{confirmation:'DELETE',password,userId:'someone-else'});assert.equal(state.accountDeletion.status,'pending');assert.equal(state.user.id,initial.user.id);
 await req('account/deletion/request',{confirmation:'DELETE',password});state=await req('state');assert.equal(state.accountDeletion.status,'pending');
 const db=new DatabaseSync(dbPath);t.after(()=>db.close());assert.equal(db.prepare('SELECT COUNT(*) n FROM support_tickets').get().n,1);assert.equal(db.prepare('SELECT user_id FROM support_tickets').get().user_id,initial.user.id);assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n,1);
 const page=await fetch(base+'/delete-account');assert.equal(page.status,200);assert.match(await page.text(),/Request account deletion/);
});
