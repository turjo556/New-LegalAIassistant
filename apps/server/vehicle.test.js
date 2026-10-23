import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from './index.js';
import {testDatabase,approveTestDriver,completeTestRiders} from '../../scripts/test-driver-fixture.mjs';
test('vehicle identification is required, private to booked riders, owner editable and changes notify passengers',async t=>{
 const dbPath=testDatabase(t),server=createApp({dbPath});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port,cookies={};
 async function req(path,body,who='guest',status=200){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookies[who]?{Cookie:cookies[who]}:{})},body:body?JSON.stringify(body):undefined});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return d}
 for(const who of ['driver','rider','other'])await req('register',{name:who,email:who+'@example.com',password:'safe-fixture-password'},who);
 approveTestDriver(dbPath);completeTestRiders(dbPath);
 const body={from:'Montréal',to:'Ottawa',date:'2099-11-06',time:'09:00',arrival:'12:00',price:35,seats:3,car:'Toyota',pickup:'Main station',destination:'City station',licencePlate:'ab c-123',plateProvince:'QC',vehicleColor:'Blue'};
 for(const bad of [{licencePlate:''},{licencePlate:'<script>'},{plateProvince:'XX'},{vehicleColor:''}])await req('rides',{...body,...bad},'driver',400);
 let d=await req('rides',body,'driver',201);const id=d.hosting[0].id;assert.equal(d.hosting[0].vehicleDetails.licencePlate,'ABC123');
 const checkPublic=async who=>{const state=await req('state',null,who);assert.equal(state.rides[0].vehicleColor,'Blue');assert(!JSON.stringify(state).includes('ABC123'));assert.equal(state.rides[0].plateProvince,undefined)};
 await checkPublic('guest');await checkPublic('other');
 d=await req('bookings',{rideId:id,seats:1},'rider',201);const bookingId=d.bookings[0].id;assert.equal(d.bookings[0].ride.vehicleDetails.licencePlate,'ABC123');assert.equal(d.rides[0].vehicleDetails,undefined);
 const change={id,licencePlate:'NEW987',plateProvince:'ON',vehicleColor:'Red'};
 await req('rides/vehicle',change,'other',404);await req('rides/vehicle',{...change,vehicleColor:'Pink'},'driver',400);
 d=await req('rides/vehicle',change,'driver');assert.equal(d.hosting[0].vehicleDetails.licencePlate,'NEW987');assert.equal(d.hosting[0].car,'Toyota');
 d=await req('state',null,'rider');assert.equal(d.bookings[0].ride.vehicleDetails.licencePlate,'NEW987');assert(d.notifications.some(n=>n.title.includes('updated vehicle identification')));
 await req('bookings/cancel',{id:bookingId},'rider');d=await req('state',null,'rider');assert(!JSON.stringify(d).includes('NEW987'));assert.equal(d.rides[0].vehicleColor,'Red');
});
