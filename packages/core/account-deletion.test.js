import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {accountDeletionApi,accountDeletionState,deletionPage} from './account-deletion.js';
test('account deletion requires authenticated current password, scopes identity and enqueues once without erasing trips',async()=>{
 const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE auth_attempts(key TEXT PRIMARY KEY,attempts INTEGER,expires INTEGER);CREATE TABLE account_deletion_requests(user_id TEXT PRIMARY KEY,requested_at INTEGER,status TEXT);CREATE TABLE support_tickets(id TEXT PRIMARY KEY,user_id TEXT,email TEXT,subject TEXT,body TEXT,created INTEGER,status TEXT);');
 const db={get:async(q,...a)=>sql.prepare(q).get(...a),run:async(q,...a)=>sql.prepare(q).run(...a)},user={id:'one',email:'one@example.test'},path='/api/account/deletion/request',verify=async p=>p==='current-password';
 assert.equal(await accountDeletionApi('/api/other',{},null,db,verify),null);
 await assert.rejects(accountDeletionApi(path,{confirmation:'DELETE',password:'current-password'},null,db,verify),{status:401});
 await assert.rejects(accountDeletionApi(path,{confirmation:'DELETE',password:'wrong'},user,db,verify),{status:401});
 await assert.rejects(accountDeletionApi(path,{confirmation:'yes',password:'current-password'},user,db,verify),{status:400});
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM account_deletion_requests').get().n,0);
 for(let i=0;i<2;i++)await accountDeletionApi(path,{confirmation:'DELETE',password:'current-password',userId:'victim'},user,db,verify);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM support_tickets').get().n,1);assert.equal(sql.prepare('SELECT user_id FROM support_tickets').get().user_id,'one');
 const state=await accountDeletionState(db,user);assert.equal(state.status,'pending');assert.ok(state.requestedAt);assert.equal(await accountDeletionState(db,{id:'victim'}),null);assert.equal(await accountDeletionState(db,null),null);
 assert.ok(!JSON.stringify(sql.prepare('SELECT * FROM support_tickets').get()).includes('current-password'));
 for(let i=0;i<2;i++)await accountDeletionApi(path,{confirmation:'DELETE',password:'current-password'},user,db,verify);
 await assert.rejects(accountDeletionApi(path,{confirmation:'DELETE',password:'current-password'},user,db,verify),{status:429});
 for(const fr of [true,false]){const page=deletionPage(fr);assert.ok(page.includes('support@ridely.ca'));assert.ok(page.includes('/account?section=deletion'));}
 sql.close();
});
