import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {reviewApi,reviewState,reviewSummary,reviewSummaryIndex,maintainReviews} from '../../packages/core/trip-reviews.js';
const WINDOW=14*86400000;
function setup(t){
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());
 sqlite.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE users(id TEXT PRIMARY KEY);
 CREATE TABLE rides(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),origin TEXT,destination_city TEXT,date TEXT,cancelled INTEGER DEFAULT 0,completed_at INTEGER);
 CREATE TABLE bookings(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),ride_id TEXT REFERENCES rides(id),cancelled INTEGER DEFAULT 0,passenger_completed_at INTEGER);
 CREATE TABLE notifications(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),title TEXT,created INTEGER);
 INSERT INTO users VALUES('driver'),('rider'),('other');`);
 sqlite.exec(readFileSync(new URL('../../migrations/0028_trip_reviews.sql',import.meta.url),'utf8'));
 const now=Date.now();sqlite.prepare("INSERT INTO rides VALUES('r','driver','Montréal','Ottawa','2026-10-29',0,?)").run(now-10000);sqlite.prepare("INSERT INTO bookings VALUES('b','rider','r',0,?)").run(now-5000);
 const db={get:async(sql,...p)=>sqlite.prepare(sql).get(...p),all:async(sql,...p)=>sqlite.prepare(sql).all(...p),run:async(sql,...p)=>sqlite.prepare(sql).run(...p)};
 const user=id=>({id,email_verified:1});
 const body=(role='driver')=>({bookingId:'b',ratings:{punctuality:5,communication:4,respect:3,[role==='driver'?'driving':'preparedness']:4},comment:role==='driver'?'Private until release.':'Respectful passenger.'});
 const submit=(id,bodyValue=body(id==='rider'?'driver':'passenger'))=>reviewApi('/api/reviews/submit',bodyValue,user(id),db);
 return {sqlite,db,user,body,submit,now};
}
test('two-sided reviews stay private until reciprocal submission, publish once and expose role-specific aggregates only',async t=>{
 const {db,user,submit,sqlite}=setup(t);await submit('rider');
 let own=await reviewState(db,user('rider'));assert.equal(own.opportunities[0].submitted,true);assert.equal(own.opportunities[0].ownReview.published,false);assert.equal(own.opportunities[0].ownReview.ratings.driving,4);
 let driver=await reviewState(db,user('driver'));assert.equal(driver.opportunities[0].submitted,false);assert.equal(driver.opportunities[0].ownReview,null);assert.deepEqual(driver.received,[]);assert.equal(driver.summary.asDriver.count,0);assert(!JSON.stringify(driver).includes('Private until release.'));
 assert.deepEqual(await reviewSummary(db,'driver','driver'),{average:null,count:0,criteria:{}});assert.deepEqual(await reviewSummaryIndex(db),{});assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM notifications').get().n,0);
 await submit('driver');driver=await reviewState(db,user('driver'));assert.equal(driver.summary.asDriver.average,4);assert.equal(driver.summary.asDriver.count,1);assert.deepEqual(driver.summary.asDriver.criteria,{punctuality:5,communication:4,respect:3,driving:4});
 own=await reviewState(db,user('rider'));assert.equal(own.summary.asPassenger.count,1);assert.equal(own.summary.asPassenger.criteria.preparedness,4);assert.equal(own.received[0].comment,'Respectful passenger.');assert.equal(own.received[0].reviewer_id,undefined);assert.equal(own.received[0].reviewerId,undefined);
 assert.equal((await reviewSummary(db,'driver','passenger')).count,0);assert.equal((await reviewSummary(db,'driver','driver')).average,4);const index=await reviewSummaryIndex(db);assert.equal(index['driver:driver'].count,1);assert.equal(index['rider:passenger'].count,1);assert(!JSON.stringify(index).includes('Private until release.'));
 await maintainReviews(db);await reviewState(db,user('driver'));assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM notifications').get().n,2);
 await assert.rejects(submit('rider'),{status:409});assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM trip_reviews').get().n,2);
});
test('review guards reject outsiders, self-bookings, unfinished/cancelled trips, unverified accounts and invalid criteria',async t=>{
 const {sqlite,db,user,submit,body}=setup(t);
 await assert.rejects(reviewApi('/api/reviews/submit',body(),null,db),{status:401});await assert.rejects(reviewApi('/api/reviews/submit',body(),{id:'rider',email_verified:0},db),{status:403});await assert.rejects(submit('other'),{status:404});
 for(const change of ['UPDATE bookings SET cancelled=1','UPDATE rides SET cancelled=1','UPDATE rides SET completed_at=NULL','UPDATE bookings SET passenger_completed_at=NULL']){const ride=sqlite.prepare('SELECT * FROM rides').get(),booking=sqlite.prepare('SELECT * FROM bookings').get();sqlite.exec(change);await assert.rejects(submit('rider'),{status:409});sqlite.prepare('UPDATE rides SET cancelled=?,completed_at=?').run(ride.cancelled,ride.completed_at);sqlite.prepare('UPDATE bookings SET cancelled=?,passenger_completed_at=?').run(booking.cancelled,booking.passenger_completed_at);}
 sqlite.exec("UPDATE bookings SET user_id='driver'");await assert.rejects(submit('driver'),{status:404});sqlite.exec("UPDATE bookings SET user_id='rider'");
 for(const score of [0,6,1.5,'5',null])await assert.rejects(submit('rider',{...body(),ratings:{...body().ratings,driving:score}}),{status:400});
 await assert.rejects(submit('driver',body()),{status:400});await assert.rejects(submit('rider',{...body(),ratings:{...body().ratings,extra:5}}),{status:400});await assert.rejects(submit('rider',{...body(),comment:'x'.repeat(501)}),{status:400});assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM trip_reviews').get().n,0);
 assert.equal((await reviewState(db,null)).opportunities.length,0);assert.equal(await reviewApi('/api/other',{},null,db),null);
});
test('unilateral review publishes after fixed 14-day deadline and later submission cannot reopen it',async t=>{
 const {sqlite,db,user,submit,now}=setup(t);await submit('rider');const deadline=sqlite.prepare('SELECT deadline FROM trip_reviews').get().deadline;assert.equal(deadline,now-5000+WINDOW);
 await maintainReviews(db,deadline-1);assert.equal((await reviewSummary(db,'driver','driver')).count,0);
 await maintainReviews(db,deadline);assert.equal((await reviewSummary(db,'driver','driver')).count,1);await maintainReviews(db,deadline+1);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM notifications').get().n,1);
 sqlite.prepare('UPDATE rides SET completed_at=?').run(now-WINDOW-100);sqlite.prepare('UPDATE bookings SET passenger_completed_at=?').run(now-WINDOW-100);await assert.rejects(submit('driver'),{status:409});
 sqlite.exec('UPDATE bookings SET cancelled=1');assert.equal((await reviewSummary(db,'driver','driver')).count,0);assert.deepEqual((await reviewState(db,user('driver'))).received,[]);
});
test('review submission rechecks cancellation atomically before insert',async t=>{
 const {sqlite,db,user,body}=setup(t);const race={...db,run:async(sql,...p)=>{if(sql.startsWith('INSERT INTO trip_reviews'))sqlite.exec('UPDATE bookings SET cancelled=1');return db.run(sql,...p)}};
 await assert.rejects(reviewApi('/api/reviews/submit',body(),user('rider'),race),{status:409});assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM trip_reviews').get().n,0);
});

test('HTTP review flow keeps blind submissions private and attaches only published aggregate ratings to rides and confirmed passengers',async t=>{
 const {createApp}=await import('./index.js');
 const {testDatabase,approveTestDriver,completeTestRiders}=await import('../../scripts/test-driver-fixture.mjs');
 const dbPath=testDatabase(t),server=createApp({dbPath,env:{}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port,cookies={};
 async function req(path,body,who='rider',expected=200){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookies[who]?{Cookie:cookies[who]}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return data;}
 for(const who of ['driver','rider','other'])await req('register',{name:who,email:who+'@example.com',password:'review-test-password'},who);
 approveTestDriver(dbPath);completeTestRiders(dbPath);
 const ride=(await req('rides',{from:'Montréal',to:'Ottawa',date:'2099-11-06',time:'09:00',arrival:'12:00',price:25,seats:3,car:'Toyota',vehicleColor:'Black',licencePlate:'TEST123',plateProvince:'QC',luggage:'small',pickupLocationId:'namur-burger-king',dropoffLocationId:'st-laurent-starbucks'},'driver',201)).hosting[0];
 const pending=(await req('bookings',{rideId:ride.id,seats:1},'rider',201)).seatRequests.find(q=>q.status==='pending');await req('booking-requests/decision',{id:pending.id,decision:'accept',availabilityConfirmed:true},'driver');
 const booking=(await req('state')).bookings[0];
 const body={bookingId:booking.id,ratings:{punctuality:5,communication:4,respect:5,driving:4},comment:'Private driver review text.'};
 await req('reviews/submit',body,'guest',401);await req('reviews/submit',body,'other',404);await req('reviews/submit',body,'rider',409);
 const sqlite=new DatabaseSync(dbPath);t.after(()=>sqlite.close());sqlite.prepare("UPDATE rides SET date='2020-01-01' WHERE id=?").run(ride.id);
 await req('trips/complete',{rideId:ride.id,confirmed:true},'driver');await req('trips/confirm',{bookingId:booking.id,confirmed:true});
 const first=await req('reviews/submit',body);assert.equal(first.reviews.opportunities[0].submitted,true);assert.equal(first.reviews.opportunities[0].ownReview.published,false);
 const driverBlind=await req('state',null,'driver');assert.equal(driverBlind.reviews.summary.asDriver.count,0);assert.equal(driverBlind.reviews.received.length,0);assert(!JSON.stringify(driverBlind).includes(body.comment));
 const guestBlind=await req('state',null,'guest');assert.equal(guestBlind.reviews.opportunities.length,0);assert.equal(guestBlind.reviews.received.length,0);assert(!JSON.stringify(guestBlind).includes(body.comment));assert(!guestBlind.rides.find(r=>r.id===ride.id).driverReviews?.count);
 const driverBody={bookingId:booking.id,ratings:{punctuality:3,communication:4,respect:5,preparedness:4},comment:'Private passenger review text.'};
 const published=await req('reviews/submit',driverBody,'driver');assert.equal(published.reviews.summary.asDriver.count,1);assert.equal(published.reviews.summary.asDriver.average,4.5);assert.equal(published.hosting.find(r=>r.id===ride.id).passengers[0].passengerReviews.average,4);
 const rider=await req('state');assert.equal(rider.reviews.summary.asPassenger.average,4);assert.equal(rider.reviews.received[0].comment,driverBody.comment);assert.equal(rider.reviews.received[0].reviewerId,undefined);assert.equal(rider.bookings[0].ride.driverReviews.average,4.5);
 const guest=await req('state',null,'guest');assert.equal(guest.rides.find(r=>r.id===ride.id).driverReviews.average,4.5);assert.equal(guest.rides.find(r=>r.id===ride.id).driver,'Driver');assert.equal(guest.hosting.length,0);assert.equal(guest.reviews.received.length,0);assert(!JSON.stringify(guest).includes(body.comment));assert(!JSON.stringify(guest).includes(driverBody.comment));assert(!JSON.stringify(guest).includes('passengerReviews'));
 await req('reviews/submit',body,'rider',409);
 sqlite.prepare('UPDATE bookings SET cancelled=1 WHERE id=?').run(booking.id);const cancelled=await req('state',null,'driver');assert.equal(cancelled.reviews.summary.asDriver.count,0);assert.equal(cancelled.hosting.find(r=>r.id===ride.id).passengers.length,0);assert.equal((await req('state')).reviews.opportunities.length,0);
});
