import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from './index.js';
import {approveTestDriver,completeTestRiders,testDatabase} from '../../scripts/test-driver-fixture.mjs';
test('bonus requires actual dated trips and passenger confirmation, operator review, private recipient and unique manual payment record',async t=>{
 const dbPath=testDatabase(t),server=createApp({dbPath,env:{RIDELY_ADMIN_EMAIL:'operator@example.com'}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port,cookies={};
 async function req(path,body,who='driver',status=200){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookies[who]?{Cookie:cookies[who]}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return data}
 for(const who of ['driver','rider','operator','other'])await req('register',{name:who,email:who+'@example.com',password:'safe-test-password'},who);
 const db=new DatabaseSync(dbPath);t.after(()=>db.close());approveTestDriver(dbPath);completeTestRiders(dbPath);
 // Real bookings are created through the API; only the clock/campaign is shifted
 // in this isolated fixture to test completed historical journeys without waiting.
 db.prepare('UPDATE bonus_campaign SET starts_at=?').run(Date.now()-10*86400000);
 const rides=[];for(let i=0;i<3;i++){
  const published=await req('rides',{from:'Montréal',to:'Ottawa',date:`2099-11-0${i+1}`,time:'09:00',arrival:'11:30',price:35,seats:3,car:'Toyota',pickup:'Berri-UQAM',destination:'Rideau Centre'},'driver',201);const ride=published.hosting.find(r=>!rides.includes(r.id));rides.push(ride.id);await req('bookings',{rideId:ride.id,seats:2},'rider',201);
  await req('trips/complete',{rideId:ride.id,confirmed:true},'driver',409);await req('trips/complete',{rideId:ride.id,confirmed:true},'other',404);
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto'}).format(new Date(Date.now()-(i+1)*86400000));db.prepare('UPDATE rides SET date=? WHERE id=?').run(date,ride.id);
  const booking=(await req('state',null,'rider')).bookings.find(b=>b.ride.id===ride.id);
  await req('trips/confirm',{bookingId:booking.id,confirmed:true},'rider',409);
  await req('trips/complete',{rideId:ride.id,confirmed:true});await req('trips/complete',{rideId:ride.id,confirmed:true});
  if(i===0)assert.equal((await req('state')).foundingBonus.qualifyingTrips.length,0);
  await req('trips/confirm',{bookingId:booking.id,confirmed:true},'other',404);await req('trips/confirm',{bookingId:booking.id,confirmed:true},'rider');
 }
 assert.equal((await req('state')).foundingBonus.qualifyingTrips.length,3);
 await req('bonus/claim',{recipientEmail:'recipient@example.net',termsAccepted:false},'driver',400);
 await req('bonus/claim',{recipientEmail:'recipient@example.net',termsAccepted:true});const claim=(await req('state')).foundingBonus.claim;assert.equal(claim.status,'pending');
 await req('bonus/claim',{recipientEmail:'other@example.net',termsAccepted:true},'driver',409);
 assert.equal((await req('state',null,'other')).foundingBonus.claim,null);assert(!JSON.stringify(await req('state',null,'guest')).includes('recipient@example.net'));
 await req('admin/bonus/queue',{},'rider',403);const queue=await req('admin/bonus/queue',{},'operator');assert.equal(queue.claims[0].trips.length,3);
 const body={id:claim.id,note:'Reviewed genuine trips and identity; no duplicates.',evidenceReviewed:true};
 await req('admin/bonus/decision',{...body,decision:'paid',reference:'BANK-123',transferSent:true},'operator',409);
 await req('admin/bonus/decision',{...body,decision:'approve',evidenceReviewed:false},'operator',400);
 db.prepare('UPDATE rides SET cancelled=1 WHERE id=?').run(rides[0]);await req('admin/bonus/decision',{...body,decision:'approve'},'operator',409);db.prepare('UPDATE rides SET cancelled=0 WHERE id=?').run(rides[0]);
 await req('admin/bonus/decision',{...body,decision:'approve'},'operator');assert.equal((await req('state')).foundingBonus.allocated,1);
 await req('admin/bonus/decision',{...body,decision:'paid',reference:'BANK-123',transferSent:false},'operator',400);
 await req('admin/bonus/decision',{...body,decision:'paid',reference:'BANK-123',transferSent:true},'operator');
 assert.equal((await req('state')).foundingBonus.claim.status,'paid');assert.equal(db.prepare('SELECT COUNT(*) n FROM bonus_audit').get().n,3);
 await req('admin/bonus/decision',{...body,decision:'paid',reference:'BANK-123',transferSent:true},'operator',409);
 assert.throws(()=>db.prepare("UPDATE bonus_claims SET status='pending' WHERE id=?").run(claim.id),/bonus_paid_immutable/);
 assert.throws(()=>db.prepare('DELETE FROM bonus_claims WHERE id=?').run(claim.id),/bonus_ledger_retained/);
});
test('database atomically caps approved and sent bonuses at 25 and keeps transfer references unique',async t=>{
 const dbPath=testDatabase(t),server=createApp({dbPath});server.close();const db=new DatabaseSync(dbPath);t.after(()=>db.close());
 for(let i=0;i<26;i++){db.prepare('INSERT INTO users(id,name,email,password) VALUES(?,?,?,?)').run('u'+i,'Test','u'+i+'@example.com','test-only');db.prepare('INSERT INTO bonus_claims(id,user_id,recipient_email,created,updated,terms_version) VALUES(?,?,?,?,?,?)').run('c'+i,'u'+i,'u'+i+'@example.com',Date.now(),Date.now(),'test');}
 for(let i=0;i<25;i++)db.prepare("UPDATE bonus_claims SET status='approved' WHERE id=?").run('c'+i);
 assert.throws(()=>db.prepare("UPDATE bonus_claims SET status='approved' WHERE id='c25'").run(),/bonus_budget_exhausted/);
 db.prepare("UPDATE bonus_claims SET status='paid',payment_reference='BANK-123',paid_at=? WHERE id='c0'").run(Date.now());
 assert.throws(()=>db.prepare("UPDATE bonus_claims SET status='paid',payment_reference='BANK-123' WHERE id='c1'").run(),/UNIQUE/);
 db.prepare("UPDATE bonus_claims SET status='rejected' WHERE id='c1'").run();db.prepare("UPDATE bonus_claims SET status='approved' WHERE id='c25'").run();assert.equal(db.prepare("SELECT COUNT(*) n FROM bonus_claims WHERE status IN ('approved','paid')").get().n,25);
});
