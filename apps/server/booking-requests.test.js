import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from './index.js';
import {approveTestDriver,completeTestRiders,testDatabase} from '../../scripts/test-driver-fixture.mjs';
import {maintainBookingRequests} from '../../packages/core/booking-requests.js';
import {deliverAccountEmails} from '../../packages/core/account-emails.js';
import {departureTime} from '../../packages/core/cancellation.js';
async function fixture(t){
 const dbPath=testDatabase(t),server=createApp({dbPath});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port,cookies={};
 async function req(path,body,who='driver',status=200){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookies[who]?{Cookie:cookies[who]}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return data}
 for(const who of ['driver','rider','other'])await req('register',{name:who,email:who+'@example.com',password:'safe-test-password'},who);
 const db=new DatabaseSync(dbPath);t.after(()=>db.close());approveTestDriver(dbPath);completeTestRiders(dbPath);db.prepare("UPDATE users SET phone_verified=0,phone=NULL").run();
 const adapter={get:async(sql,...a)=>db.prepare(sql).get(...a),all:async(sql,...a)=>db.prepare(sql).all(...a),run:async(sql,...a)=>db.prepare(sql).run(...a)};
 const ride=(await req('rides',{from:'Montréal',to:'Ottawa',date:'2099-11-06',time:'09:00',arrival:'12:00',price:25,seats:1,licencePlate:'TEST123',plateProvince:'QC',vehicleColor:'Black',car:'Toyota',pickup:'Namur',destination:'St-Laurent'},'driver',201)).hosting[0];
 return {req,db,adapter,ride};
}
test('requests require acceptance; concurrent acceptance cannot overbook or double-debit; no pending boarding details',async t=>{
 const {req,db,ride}=await fixture(t);
 const a=await req('bookings',{rideId:ride.id,seats:1},'rider',201),b=await req('bookings',{rideId:ride.id,seats:1},'other',201);
 assert.equal(a.bookings.length,0);assert.equal(a.bookingCredits.balance,2);assert.equal(a.rides[0].seats,1);assert(!JSON.stringify(a.seatRequests).includes('TEST123'));assert.equal((await req('state',null,'guest')).seatRequests.length,0);
 const qa=a.seatRequests[0],qb=b.seatRequests[0];assert.equal(qa.expiresAt-qa.created,7200000);
 await req('bookings',{rideId:ride.id,seats:1},'rider',409);await req('booking-requests/decision',{id:qa.id,decision:'accept',availabilityConfirmed:true},'other',404);await req('booking-requests/decision',{id:qa.id,decision:'accept'},'driver',400);
 const decisions=await Promise.allSettled([qa,qb].map(q=>req('booking-requests/decision',{id:q.id,decision:'accept',availabilityConfirmed:true},'driver')));assert.equal(decisions.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE cancelled=0').get().n,1);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM promo_credit_ledger WHERE kind='booking'").get().n,1);
 const winner=db.prepare("SELECT * FROM booking_requests WHERE status='accepted'").get();assert(winner.booking_id);await req('booking-requests/decision',{id:winner.id,decision:'accept',availabilityConfirmed:true},'driver',409);
 const state=await req('state',null,winner.user_id===db.prepare("SELECT id FROM users WHERE email='rider@example.com'").get().id?'rider':'other');assert.equal(state.bookingCredits.balance,1);assert.equal(state.bookings.length,1);
});
test('withdrawal, expiry, reminders and ride cancellation are idempotent and consume no credit',async t=>{
 const {req,db,adapter,ride}=await fixture(t);let state=await req('bookings',{rideId:ride.id,seats:1},'rider',201),q=state.seatRequests[0];
 await maintainBookingRequests(adapter,q.created+3600001);await maintainBookingRequests(adapter,q.created+3600002);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM account_email_outbox WHERE kind='request_reminder'").get().n,1);
 await req('booking-requests/withdraw',{id:q.id},'other',404);await req('booking-requests/withdraw',{id:q.id},'rider');await req('booking-requests/withdraw',{id:q.id},'rider',409);
 state=await req('bookings',{rideId:ride.id,seats:1},'rider',201);q=state.seatRequests.find(q=>q.status==='pending');await maintainBookingRequests(adapter,q.expiresAt);await req('booking-requests/decision',{id:q.id,decision:'accept',availabilityConfirmed:true},'driver',409);
 state=await req('bookings',{rideId:ride.id,seats:1},'rider',201);q=state.seatRequests.find(q=>q.status==='pending');await req('rides/cancel',{id:ride.id},'driver');assert.equal(db.prepare('SELECT status FROM booking_requests WHERE id=?').get(q.id).status,'declined');assert.equal((await req('state',null,'rider')).bookingCredits.balance,2);
});
test('acceptance rechecks credit, fare and eligibility, and booking emails use the shared brand and correct links',async t=>{
 const {req,db,adapter,ride}=await fixture(t);const state=await req('bookings',{rideId:ride.id,seats:1},'rider',201),q=state.seatRequests[0];
 db.prepare('UPDATE rides SET price=2600 WHERE id=?').run(ride.id);await req('booking-requests/decision',{id:q.id,decision:'accept',availabilityConfirmed:true},'driver',409);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n,0);db.prepare('UPDATE rides SET price=2500 WHERE id=?').run(ride.id);
 db.prepare("UPDATE driver_checks SET insurance_status='pending'").run();await req('booking-requests/decision',{id:q.id,decision:'accept',availabilityConfirmed:true},'driver',403);db.prepare("UPDATE driver_checks SET insurance_status='approved'").run();
 const sent=[],original=globalThis.fetch;globalThis.fetch=async(url,options)=>{if(String(url).includes('api.resend.com')){sent.push(JSON.parse(options.body));return Response.json({id:'email-'+sent.length})}return original(url,options)};t.after(()=>{globalThis.fetch=original});
 const env={RESEND_API_KEY:'fake',EMAIL_FROM:'Ridely <no-reply@ridely.ca>',RIDELY_PUBLIC_URL:'https://ridely.ca'};await deliverAccountEmails(adapter,env,{limit:50});assert(sent.some(s=>s.subject==='Seat request sent'&&s.html.includes('/my-trips')));assert(sent.some(s=>s.subject==='New seat request'&&s.html.includes('/my-listings')));
 await req('booking-requests/decision',{id:q.id,decision:'accept',availabilityConfirmed:true},'driver');await deliverAccountEmails(adapter,env,{limit:50});assert(sent.some(s=>s.subject==='Booking confirmed'&&s.html.includes('ridely-logo.png')));assert(sent.some(s=>s.subject==='Booking accepted'));
});
test('request deadline is the earlier of two hours or an hour before Eastern departure',async t=>{
 const {req,db,ride}=await fixture(t),later=new Date(Date.now()+150*60000),parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(later).split(' ');
 db.prepare('UPDATE rides SET date=?,time=? WHERE id=?').run(parts[0],parts[1],ride.id);const q=(await req('bookings',{rideId:ride.id,seats:1},'rider',201)).seatRequests[0];assert.equal(q.expiresAt,departureTime(parts[0],parts[1])-3600000);assert(q.expiresAt-q.created<7200000);
 const near=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(Date.now()+30*60000)).split(' ');db.prepare('UPDATE rides SET date=?,time=? WHERE id=?').run(near[0],near[1],ride.id);await req('bookings',{rideId:ride.id,seats:1},'other',409);
});
