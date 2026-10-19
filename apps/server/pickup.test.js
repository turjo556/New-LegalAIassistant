import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from './index.js';
test('custom pickups: radius, private details, two-passenger quota, approvals, and decline fallback',async()=>{
 const server=createApp({dbPath:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,cookies={};
 async function req(path,body,who='guest',status=200){const res=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookies[who]||''},body:body?JSON.stringify(body):undefined});const data=await res.json();assert.equal(res.status,status,JSON.stringify(data));if(res.headers.get('set-cookie'))cookies[who]=res.headers.get('set-cookie').split(';')[0];return data}
 try{for(const name of ['driver','first','second','third'])await req('register',{name,email:name+'@example.com',password:'safe-password-for-tests'},name);
 const ride={from:'Montréal',to:'Québec City',date:'2099-11-06',time:'09:00',arrival:'12:00',price:30,seats:4,car:'Toyota',pickup:'Station entrance',destination:'City station',customLimit:2,pickupFee:5,pickupLat:45.5019,pickupLng:-73.5674};
 await req('rides',{...ride,customLimit:3},'driver',400);await req('rides',{...ride,pickupLat:null},'driver',400);
 const published=await req('rides',ride,'driver',201);const id=published.hosting[0].id;const request={rideId:id,seats:2,pickupMode:'custom',pickupAddress:'123 Example Street',pickupLat:45.505,pickupLng:-73.56};
 await req('bookings',{...request,pickupLat:46},'first',400);
 const booked=await req('bookings',request,'first',201);const booking=booked.bookings[0];assert.equal(booking.total,70);assert.equal(booking.pickupStatus,'pending');assert.equal(booked.rides[0].customLeft,0);
 assert.ok(!JSON.stringify(await req('state')).includes('123 Example Street'));
 await req('bookings',{...request,seats:1},'second',409);
 await req('pickup/decision',{id:booking.id,decision:'approve'},'second',404);
 await req('pickup/decision',{id:booking.id,decision:'approve'},'driver');assert.equal((await req('state',null,'first')).bookings[0].pickupStatus,'approved');
 await req('pickup/decision',{id:booking.id,decision:'decline'},'driver',409);
 await req('bookings/cancel',{id:booking.id},'first');assert.equal((await req('state')).rides[0].customLeft,2);
 const again=await req('bookings',{...request,seats:1},'first',201);await req('pickup/decision',{id:again.bookings[0].id,decision:'decline'},'driver');const declined=(await req('state',null,'first')).bookings[0];assert.equal(declined.pickupStatus,'declined');assert.equal(declined.total,30);assert.equal((await req('state')).rides[0].seats,3);assert.equal((await req('state')).rides[0].customLeft,2);
 const race=await Promise.all(['second','third'].map(async who=>{const res=await fetch(base+'/api/bookings',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookies[who]},body:JSON.stringify(request)});return res.status}));assert.deepEqual(race.sort(),[201,409]);
 }finally{await new Promise(r=>server.close(r))}
});
