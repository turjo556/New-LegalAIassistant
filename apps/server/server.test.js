import {approveTestDriver,completeTestRiders} from '../../scripts/test-driver-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from './index.js';
test('accounts, ownership, shared inventory, cancellation and restart persistence',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'rmw-test-'));let server;
 async function start(){server=createApp({dbPath:join(dir,'test.sqlite')});await new Promise(r=>server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+server.address().port}
 let base=await start();const cookies={};async function req(path,body,who='guest',expected=200,origin){const response=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookies[who]?{Cookie:cookies[who]}:{}),...(origin?{Origin:origin}:{})},body:body?JSON.stringify(body):undefined});const data=await response.json();assert.equal(response.status,expected,JSON.stringify(data));if(response.headers.get('set-cookie'))cookies[who]=response.headers.get('set-cookie').split(';')[0];return data}
 try{
 await req('rides',{},'guest',401);
 for(const who of ['driver','passenger','other'])await req('register',{name:who,email:who+'@example.com',password:'safe-test-password'},who);
 await req('login',{email:'driver@example.com',password:'wrong-password'},'guest',401);
 approveTestDriver(join(dir,'test.sqlite'));completeTestRiders(join(dir,'test.sqlite'));
 const payload={from:'Montréal',to:'Québec City',date:'2099-11-06',time:'09:00',arrival:'12:00',price:35,seats:2,car:'Toyota',pickup:'Main station',destination:'City station'};
 await req('rides',{...payload,seats:-1},'driver',400);await req('rides',{...payload,date:'2099-02-30'},'driver',400);
 const published=await req('rides',payload,'driver',201);const id=published.rides[0].id;
 assert.equal((await req('state')).rides.length,1);
 await req('bookings',{rideId:id,seats:1},'driver',400);
 await req('bookings',{rideId:id,seats:1,mode:'home'},'passenger',400);
 await req('favorites',{id},'passenger');assert.deepEqual((await req('state',null,'passenger')).saved,[id]);
 const races=await Promise.all(['passenger','other'].map(async who=>{const r=await fetch(base+'/api/bookings',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookies[who]},body:JSON.stringify({rideId:id,seats:2})});return {who,status:r.status,data:await r.json()}}));
 assert.deepEqual(races.map(r=>r.status).sort(),[201,409]);const winner=races.find(r=>r.status===201),loser=races.find(r=>r.status===409);
 const booking=winner.data.bookings[0];assert.equal(booking.total,70);assert.equal((await req('state')).rides[0].seats,0);
 await req('messages/send',{id:booking.id,message:'Meet at the station entrance.'},winner.who);
 const thread=await req('messages',{id:booking.id},'driver');assert.equal(thread.messages[0].body,'Meet at the station entrance.');
 await req('messages',{id:booking.id},loser.who,404);
 await req('messages/send',{id:booking.id,message:'See you there!'},'driver');
 await req('bookings/cancel',{id:booking.id},loser.who,404);await req('rides/cancel',{id},loser.who,404);
 await req('favorites',{id},winner.who,403,'https://evil.example');
 await new Promise(r=>server.close(r));base=await start();assert.equal((await req('state',null,winner.who)).bookings[0].id,booking.id);
 await req('bookings/cancel',{id:booking.id},winner.who);assert.equal((await req('state')).rides[0].seats,2);
 await req('bookings',{rideId:id,seats:1},winner.who,201);const host=await req('state',null,'driver');assert.equal(host.hosting[0].passengers.length,1);assert.equal(host.hosting[0].passengers[0].name,winner.who);
 await req('rides/cancel',{id},'driver');assert.equal((await req('state')).rides.length,0);assert.equal((await req('state',null,winner.who)).bookings[0].ride.cancelled,true);
 await req('logout',{},winner.who);assert.equal((await req('state',null,winner.who)).user,null);
 }finally{if(server.listening)await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true})}
});
