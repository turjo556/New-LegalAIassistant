import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from './index.js';
import {approveTestDriver,completeTestRiders,testDatabase} from '../../scripts/test-driver-fixture.mjs';
import {customFeeCents} from '../../packages/core/custom-fees.js';
test('custom fees allow only whole-dollar $5–$10 values',()=>{
 for(const fee of [5,6,7,8,9,10])assert.equal(customFeeCents(fee),fee*100);
 for(const fee of [undefined,null,'5',0,4,4.99,5.5,10.01,11,NaN,Infinity])assert.throws(()=>customFeeCents(fee),/\$5–\$10/);
});
test('published fees are validated; each option scales by passengers; edits preserve prior requests',async t=>{
 const dbPath=testDatabase(t),server=createApp({dbPath});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port,cookies={};
 async function req(path,body,who='driver',status=200){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookies[who]?{Cookie:cookies[who]}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return data}
 for(const who of ['driver','rider'])await req('register',{name:who,email:who+'@example.com',password:'fixture-password-2026'},who);approveTestDriver(dbPath);completeTestRiders(dbPath);const db=new DatabaseSync(dbPath);t.after(()=>db.close());
 const ride={from:'Montréal',to:'Ottawa',date:'2099-11-06',time:'09:00',arrival:'12:00',price:25,seats:4,licencePlate:'TEST123',plateProvince:'QC',vehicleColor:'Blue',car:'Toyota',pickup:'Station entrance',destination:'City station',allowPickup:true,allowDropoff:true,pickupFee:10,dropoffFee:5,pickupLat:45.5019,pickupLng:-73.5674,dropoffLat:45.4215,dropoffLng:-75.6972};
 for(const kind of ['pickupFee','dropoffFee'])for(const fee of [0,4,5.5,11])await req('rides',{...ride,[kind]:fee},'driver',400);
 const posted=(await req('rides',ride,'driver',201)).hosting[0],pending=await req('bookings',{rideId:posted.id,seats:2},'rider',201);await req('booking-requests/decision',{id:pending.seatRequests[0].id,decision:'accept',availabilityConfirmed:true});const booking=(await req('state',null,'rider')).bookings[0];
 await req('stops/request',{bookingId:booking.id,kind:'pickup',address:'123 Test Pickup',lat:45.502,lng:-73.568,expectedFee:5},'rider',409);
 await req('stops/request',{bookingId:booking.id,kind:'pickup',address:'123 Test Pickup',lat:45.502,lng:-73.568,fee:1},'rider');await req('stops/request',{bookingId:booking.id,kind:'dropoff',address:'456 Test Dropoff',lat:45.422,lng:-75.697,fee:1},'rider');
 let stops=(await req('state',null,'rider')).bookings[0].requests;assert.equal(stops.find(s=>s.kind==='pickup').fee,2000);assert.equal(stops.find(s=>s.kind==='dropoff').fee,1000);
 await req('rides/custom-fees',{id:posted.id,pickupFee:5,dropoffFee:10},'rider',404);await req('rides/custom-fees',{id:posted.id,pickupFee:5.5,dropoffFee:10},'driver',400);await req('rides/custom-fees',{id:posted.id,pickupFee:5,dropoffFee:10});
 stops=(await req('state',null,'rider')).bookings[0].requests;assert.equal(stops.find(s=>s.kind==='pickup').fee,2000);
 for(const stop of stops)await req('stops/decision',{id:stop.id,decision:'approve',minutes:3});assert.equal((await req('state',null,'rider')).bookings[0].total,80);
 db.prepare('UPDATE rides SET pickup_fee=300 WHERE id=?').run(posted.id);const old=(await req('state')).hosting[0];assert.equal(old.allowPickup,false);assert.equal(old.offeredPickup,true);
 await req('rides/custom-fees',{id:posted.id,pickupFee:6,dropoffFee:10});assert.equal((await req('state')).hosting[0].allowPickup,true);assert.equal((await req('state',null,'rider')).bookings[0].total,80);
});
