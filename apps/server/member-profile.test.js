import test from 'node:test';
import assert from 'node:assert/strict';
import jpeg from 'jpeg-js';
import {createApp} from './index.js';
import {testDatabase,approveTestDriver,completeTestRiders} from '../../scripts/test-driver-fixture.mjs';
test('optional photos are reencoded, owner-only mutable, visible on trips and removable; drafts are private and cannot bypass approval',async t=>{
 const dbPath=testDatabase(t),server=createApp({dbPath});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port,cookies={};
 async function req(path,b,who='driver',status=200){const r=await fetch(base+'/api/'+path,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',...(cookies[who]?{Cookie:cookies[who]}:{})},body:b?JSON.stringify(b):undefined});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return d}
 for(const who of ['driver','rider']){const d=await req('register',{name:who,email:who+'@example.com',password:'fixture-password-2026'},who);assert.equal(d.user.photoUrl,null)}
 const photo='data:image/jpeg;base64,'+jpeg.encode({width:64,height:64,data:Buffer.alloc(64*64*4,180)},90).data.toString('base64');
 await req('profile/photo',{photo,publicConsent:true},'guest',401);await req('profile/photo',{photo},'driver',400);await req('profile/photo',{photo:'data:image/svg+xml,<svg/>',publicConsent:true},'driver',400);await req('profile/photo',{photo:'data:image/jpeg;base64,AAAA',publicConsent:true},'driver',400);
 let d=await req('profile/photo',{photo,publicConsent:true});const url=d.user.photoUrl;assert(url);const r=await fetch(base+url);assert.equal(r.headers.get('content-type'),'image/jpeg');assert.equal(r.headers.get('cache-control'),'no-store');const decoded=jpeg.decode(Buffer.from(await r.arrayBuffer()));assert.equal(decoded.width,64);
 assert.equal((await req('state',null,'rider')).user.photoUrl,null);
 const draft={from:'Montréal',to:'Ottawa',date:'2099-11-06',time:'09:00',arrival:'12:00',price:35,seats:3,car:'Toyota',vehicleColor:'Blue',licencePlate:'TEST123',plateProvince:'QC',pickup:'Main station',destination:'City station'};
 d=await req('rides/draft',{draft:{...draft,owner:'forged',approved:true}});assert.equal(d.rideDraft.car,'Toyota');assert.equal(d.rideDraft.approved,undefined);assert.equal(d.rides.length,0);assert.equal((await req('state',null,'rider')).rideDraft,null);assert.equal((await req('state',null,'guest')).rideDraft,null);
 await req('rides',draft,'driver',403);assert.equal((await req('state')).rides.length,0);
 approveTestDriver(dbPath);completeTestRiders(dbPath);d=await req('rides',draft,'driver',201);assert.equal(d.rideDraft,null);assert.equal(d.rides[0].driverPhoto,url);const id=d.rides[0].id;
 d=await req('profile/photo',{photo,publicConsent:true},'rider');const riderPhoto=d.user.photoUrl;await req('bookings',{rideId:id,seats:1},'rider',201);d=await req('state');assert.equal(d.hosting[0].passengers[0].photoUrl,riderPhoto);
 await req('profile/photo',{photo:null},'rider');assert.equal((await req('state')).hosting[0].passengers[0].photoUrl,null);await req('profile/photo',{photo:null});assert.equal((await fetch(base+url)).status,404);
 await req('rides/draft',{draft});await req('rides/draft/delete',{});assert.equal((await req('state')).rideDraft,null);
});
