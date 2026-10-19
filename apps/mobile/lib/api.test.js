import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../../server/index.js';
import {createApi} from './api.js';
test('native client authenticates, persists session, publishes, books, messages, and signs out',async()=>{
 const server=createApp({dbPath:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));const baseUrl='http://127.0.0.1:'+server.address().port;
 const make=()=>{const map=new Map();return {getItem:async k=>map.get(k)||null,setItem:async(k,v)=>map.set(k,v),deleteItem:async k=>map.delete(k)}};
 try{const driverStorage=make(),riderStorage=make();let driver=createApi({baseUrl,storage:driverStorage});const rider=createApi({baseUrl,storage:riderStorage});
 await driver.request('register',{name:'Driver',email:'driver@example.com',password:'mobile-test-password'});driver=createApi({baseUrl,storage:driverStorage});assert.equal((await driver.request('state')).user.name,'Driver');
 const posted=await driver.request('rides',{from:'Montréal',to:'Québec City',date:'2099-11-06',time:'09:00',arrival:'12:00',price:30,seats:4,car:'Toyota',pickup:'Main station',destination:'City station',allowPickup:true,pickupFee:5,pickupLat:45.5019,pickupLng:-73.5674});const id=posted.hosting[0].id;
 await rider.request('register',{name:'Rider',email:'rider@example.com',password:'mobile-test-password'});await assert.rejects(()=>rider.request('bookings',{rideId:id,seats:5}),/seat count/);const booked=await rider.request('bookings',{rideId:id,seats:2,pickupMode:'standard'});const booking=booked.bookings[0];assert.equal(booking.total,60);
 await rider.request('stops/request',{bookingId:booking.id,kind:'pickup',address:'123 Test Street',lat:45.505,lng:-73.56});const request=(await driver.request('state')).hosting[0].passengers[0].requests[0];await driver.request('stops/decision',{id:request.id,decision:'approve',minutes:5});assert.equal((await rider.request('state')).bookings[0].total,70);
 await rider.request('messages/send',{id:booking.id,message:'Meet at the entrance.'});assert.equal((await driver.request('messages',{id:booking.id})).messages[0].body,'Meet at the entrance.');
 await rider.request('bookings/cancel',{id:booking.id});await rider.request('logout',{});assert.equal((await createApi({baseUrl,storage:riderStorage}).request('state')).user,null);await rider.request('login',{email:'rider@example.com',password:'mobile-test-password'});assert.equal((await rider.request('state')).user.name,'Rider');
 }finally{await new Promise(r=>server.close(r))}
});
test('native client rejects insecure remote URLs',()=>{assert.throws(()=>createApi({baseUrl:'http://example.com',storage:{}}),/HTTPS/)});
