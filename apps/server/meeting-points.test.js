import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from './index.js';
import {testDatabase} from '../../scripts/test-driver-fixture.mjs';
import {meetingPoints} from '../../packages/core/meeting-points.js';
import {cities} from '../../packages/core/index.js';
test('pilot posting accepts four cities, canonical preset names and exact owner links; rejects mismatched preset cities',async t=>{
 const server=createApp({dbPath:testDatabase(t)});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 const signup=await fetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Driver',email:'driver@example.com',password:'safe-fixture-password'})});const cookie=signup.headers.get('set-cookie').split(';')[0];
 const payload={from:'Gatineau',to:'Longueuil',pickupLocationId:'gatineau-walmart-st-joseph',dropoffLocationId:'longueuil-taxi',pickup:'Overridden',destination:'Overridden',date:'2099-11-06',time:'09:00',arrival:'12:00',price:35,seats:3,licencePlate:'TEST123',plateProvince:'QC',vehicleColor:'Blue',car:'Toyota'};
 async function post(body){const response=await fetch(base+'/api/rides',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});return {status:response.status,data:await response.json()}}
 assert.deepEqual(cities,['Montréal','Longueuil','Ottawa','Gatineau']);assert.equal(meetingPoints.length,6);assert(!meetingPoints.some(p=>/mcdonald/i.test(p.label)));
 const published=await post(payload);assert.equal(published.status,201);const ride=published.data.hosting[0];assert.equal(ride.pickup,'Walmart · Saint-Joseph');assert.equal(ride.destination,'Longueuil station · Taxi stand');assert.equal(ride.pickupLocation.mapsUrl,'https://maps.app.goo.gl/kPUexbdGHV6fFe3e6');assert.equal(ride.dropoffLocation.mapsUrl,'https://maps.app.goo.gl/TWf7T1ReeFxm7Ynj9');assert.equal(ride.pickupLat,null);assert.equal(ride.dropoffLat,null);
 assert.equal((await post({...payload,pickupLocationId:'namur-burger-king'})).status,400);assert.equal((await post({...payload,dropoffLocationId:'unknown'})).status,400);
 for(const city of ['Toronto','Québec City'])assert.equal((await post({...payload,from:city,pickupLocationId:undefined})).status,400);
 for(const city of cities){const target=city==='Ottawa'?'Montréal':'Ottawa';assert.equal((await post({...payload,from:city,to:target,pickupLocationId:meetingPoints.find(p=>p.city===city).id,dropoffLocationId:meetingPoints.find(p=>p.city===target).id})).status,201)}
});
