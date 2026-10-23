import {approveLocalDriver} from './local-worker-driver-fixture.mjs';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8788',cookies={};
 async function req(path,body,who='guest',status=200){const res=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookies[who]||''},body:body?JSON.stringify(body):undefined});const data=await res.json();assert.equal(res.status,status,JSON.stringify(data));if(res.headers.get('set-cookie'))cookies[who]=res.headers.get('set-cookie').split(';')[0];return data}

if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local test only.');
for(const name of ['driver','first','second','third'])await req('register',{name,email:name+'-'+Date.now()+'@example.com',password:'safe-password-for-tests'},name);
 const ride={from:'Montréal',to:'Ottawa',date:'2099-11-06',time:'09:00',arrival:'12:00',price:30,seats:4,licencePlate:'TEST123',plateProvince:'QC',vehicleColor:'Blue',car:'Toyota',pickup:'Station entrance',destination:'City station',allowPickup:true,allowDropoff:true,pickupFee:5,dropoffFee:5,pickupLat:45.5019,pickupLng:-73.5674,dropoffLat:45.4215,dropoffLng:-75.6972};
 approveLocalDriver((await req('state',null,'driver')).user.id,'Toyota');
 await req('rides',{...ride,pickupLat:null},'driver',400);
 const id=(await req('rides',ride,'driver',201)).hosting[0].id;
 await req('bookings',{rideId:id,seats:2,pickupMode:'custom'},'first',400);
 await req('stops/request',{bookingId:'missing',kind:'pickup',address:'123 Private Street',lat:45.505,lng:-73.56},'first',404);
 const booking=(await req('bookings',{rideId:id,seats:2},'first',201)).bookings[0];assert.equal(booking.total,60);
 const pickup={bookingId:booking.id,kind:'pickup',address:'123 Private Street',lat:45.505,lng:-73.56};
 await req('stops/request',{...pickup,lat:46},'first',400);await req('stops/request',pickup,'second',404);
 await req('stops/request',pickup,'first');await req('stops/request',{bookingId:booking.id,kind:'dropoff',address:'456 Private Street',lat:45.423,lng:-75.69},'first');
 let own=await req('state',null,'first');assert.equal(own.bookings[0].requests.length,2);assert.equal(own.bookings[0].total,60);assert.ok(!JSON.stringify(await req('state')).includes('Private Street'));
 const requests=own.bookings[0].requests;
 await req('stops/decision',{id:requests[0].id,decision:'approve',minutes:10},'second',404);
 await req('stops/decision',{id:requests[0].id,decision:'approve',minutes:0},'driver',400);
 const race=await Promise.all(requests.map(async s=>{const res=await fetch(base+'/api/stops/decision',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookies.driver},body:JSON.stringify({id:s.id,decision:'approve',minutes:10})});return res.status}));assert.deepEqual(race.sort(),[200,409]);
 own=await req('state',null,'first');const pending=own.bookings[0].requests.find(s=>s.status==='pending');await req('stops/decision',{id:pending.id,decision:'approve',minutes:5},'driver');
 own=await req('state',null,'first');assert.equal(own.bookings[0].total,80);const publicState=await req('state');assert.equal(publicState.rides.find(r=>r.id===id).detourMinutes,15);assert.equal(publicState.rides.find(r=>r.id===id).itinerary.length,4);assert.ok(!JSON.stringify(publicState).includes('Private Street'));
 const other=(await req('bookings',{rideId:id,seats:2},'second',201)).bookings[0];await req('stops/request',{...pickup,bookingId:other.id},'second');const otherRequest=(await req('state',null,'second')).bookings[0].requests[0];await req('stops/decision',{id:otherRequest.id,decision:'approve',minutes:1},'driver',409);
 await req('bookings/cancel',{id:booking.id},'first');await req('stops/decision',{id:otherRequest.id,decision:'decline'},'driver');assert.equal((await req('state',null,'second')).bookings[0].total,60);
 const standardId=(await req('rides',{...ride,allowPickup:false,allowDropoff:false},'driver',201)).hosting.find(r=>r.id!==id).id;const standardBooking=(await req('bookings',{rideId:standardId,seats:1},'third',201)).bookings[0];await req('stops/request',{...pickup,bookingId:standardBooking.id},'third',400);await req('stops/request',{...pickup,bookingId:standardBooking.id,kind:'dropoff'},'third',400);

console.log('PASS: Cloudflare D1 booking-first custom stops, permissions, privacy, fees, and concurrent 15-minute budget.');
