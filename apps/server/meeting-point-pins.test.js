import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from './index.js';
import {testDatabase,approveTestDriver} from '../../scripts/test-driver-fixture.mjs';
import {meetingPoints,applyMeetingPoints} from '../../packages/core/meeting-points.js';
import {googleMapsPin,resolveOwnerMapLink,resolveMissingMeetingPoints} from '../../packages/core/meeting-point-pins.js';
import {pickupCities} from '../../packages/core/pickup.js';
test('only explicit Google Maps place markers and exact coordinate queries become pins',()=>{
 assert.deepEqual(googleMapsPin('https://www.google.com/maps/place/Test/@1,2,10z/data=!8m2!3d45.5!4d-73.6'),{lat:45.5,lng:-73.6});
 assert.deepEqual(googleMapsPin('https://www.google.com/maps/search/?api=1&query=45.5%2C-73.6'),{lat:45.5,lng:-73.6});
 for(const url of ['https://www.google.com/maps/@45.5,-73.6,15z','https://maps.app.goo.gl/fixture','https://evil.example/maps?query=45.5,-73.6','http://www.google.com/maps?q=45.5,-73.6','https://www.google.com/maps/data=!3d45!4d-73!3d46!4d-74'])assert.equal(googleMapsPin(url),null,url);
});
test('saved-link resolver follows bounded Google redirects without fetching arbitrary destinations or camera centres',async()=>{
 const original=globalThis.fetch;try{
 let count=0;globalThis.fetch=async()=>{count++;return new Response(null,{status:302,headers:{location:'https://www.google.com/maps/place/Fixture/@1,2,10z/data=!8m2!3d45.5!4d-73.6'}})};
 assert.deepEqual(await resolveOwnerMapLink(meetingPoints[0]),{lat:45.5,lng:-73.6,sourceUrl:'https://www.google.com/maps/place/Fixture/@1,2,10z/data=!8m2!3d45.5!4d-73.6'});assert.equal(count,1);
 count=0;globalThis.fetch=async()=>{count++;return new Response(null,{status:302,headers:{location:'https://evil.example/private'}})};await assert.rejects(()=>resolveOwnerMapLink(meetingPoints[0]));assert.equal(count,1);
 globalThis.fetch=async()=>new Response('<a href="https://www.google.com/maps/@45.5,-73.6,15z">Camera only</a>');await assert.rejects(()=>resolveOwnerMapLink(meetingPoints[0]));
 globalThis.fetch=async()=>new Response('<a href="https://www.google.com/maps/place/Fixture/data=!8m2!3d45.5!4d-73.6">Place</a>');assert.equal((await resolveOwnerMapLink(meetingPoints[0])).lat,45.5);
 }finally{globalThis.fetch=original}
});
test('operator pin setup is restricted, audited, persistent and authoritative for new custom rides',async t=>{
 const dbPath=testDatabase(t),server=createApp({dbPath,env:{RIDELY_ADMIN_EMAIL:'operator@example.com'}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const db=new DatabaseSync(dbPath),base='http://127.0.0.1:'+server.address().port,cookies={};t.after(()=>{db.close();return new Promise(r=>server.close(r))});
 async function req(path,body,who='driver',status=200){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookies[who]||''},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,data.error);if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return data}
 for(const who of ['driver','operator'])await req('register',{name:who,email:who+'@example.com',password:'fixture-pin-password'},who);approveTestDriver(dbPath);
 await req('admin/meeting-points',{},'driver',403);await req('admin/meeting-points',{},'operator',403);db.prepare('UPDATE users SET email_verified=1').run();assert.equal((await req('admin/meeting-points',{},'operator')).meetingPoints.filter(p=>p.pin).length,0);
 const ride={from:'Gatineau',to:'Longueuil',pickupLocationId:'gatineau-walmart-st-joseph',dropoffLocationId:'longueuil-taxi',date:'2099-11-06',time:'09:00',arrival:'12:00',price:25,seats:3,car:'Toyota',vehicleColor:'Black',licencePlate:'TEST123',plateProvince:'QC',allowPickup:true,allowDropoff:true,pickupFee:5,dropoffFee:5,pickupLat:0,pickupLng:0,dropoffLat:0,dropoffLng:0};
 await req('rides',ride,'driver',400);
 for(const [id,lat,lng] of [['gatineau-walmart-st-joseph',45.48,-75.7],['longueuil-taxi',45.53,-73.52]]){const body={id,lat,lng,sourceUrl:'https://www.google.com/maps?q='+lat+','+lng,confirmed:true};await req('admin/meeting-points/save',{...body,confirmed:false},'operator',400);await req('admin/meeting-points/save',{...body,lat:0},'operator',400);await req('admin/meeting-points/save',body,'operator');}
 assert.equal(db.prepare('SELECT COUNT(*) n FROM meeting_point_pin_log').get().n,2);const published=await req('rides',ride,'driver',201),row=published.hosting[0];assert.equal(row.pickupLat,45.48);assert.equal(row.pickupLng,-75.7);assert.equal(row.dropoffLat,45.53);assert.equal(row.dropoffLng,-73.52);
 const points=(await req('state')).meetingPoints;const canonical=applyMeetingPoints({...ride,pickupLocationId:undefined,pickup:'Walmart · Saint-Joseph'},points);assert.equal(canonical.pickupLat,45.48);
 await req('admin/meeting-points/save',{id:'gatineau-walmart-st-joseph',lat:45.481,lng:-75.701,sourceUrl:'https://www.google.com/maps?q=45.481,-75.701',confirmed:true},'operator');assert.equal((await req('state')).hosting[0].pickupLat,45.48,'Existing rides must keep their zones');
});
test('automatic setup reuses all six original links, skips saved pins and throttles failures',async t=>{
 const dbPath=testDatabase(t),server=createApp({dbPath,env:{}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;await fetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Operator',email:'operator@example.com',password:'fixture-pin-password'})});await new Promise(r=>server.close(r));const db=new DatabaseSync(dbPath);t.after(()=>db.close());db.prepare('UPDATE users SET email_verified=1').run();const adapter={get:async(sql,...a)=>db.prepare(sql).get(...a),all:async(sql,...a)=>db.prepare(sql).all(...a),run:async(sql,...a)=>db.prepare(sql).run(...a)},env={RIDELY_ADMIN_EMAIL:'operator@example.com'},original=globalThis.fetch;let calls=[];
 try{globalThis.fetch=async url=>{calls.push(url);const selected=meetingPoints.find(p=>p.mapsUrl===url);assert.ok(selected);const [lat,lng]=pickupCities[selected.city];if(selected.city==='Gatineau')throw Error('Fixture network failure');return new Response(null,{status:302,headers:{location:`https://www.google.com/maps/place/Fixture/data=!8m2!3d${lat}!4d${lng}`}})};const result=await resolveMissingMeetingPoints(adapter,env);assert.equal(result.saved,5);assert.equal(result.unresolved.length,1);assert.equal(calls.length,6);calls=[];await resolveMissingMeetingPoints(adapter,env);assert.equal(calls.length,0);await resolveMissingMeetingPoints(adapter,env,{force:true});assert.equal(calls.length,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM meeting_point_pins').get().n,5);
 }finally{globalThis.fetch=original}
});
