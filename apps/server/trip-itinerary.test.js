import test from 'node:test';
import assert from 'node:assert/strict';
import {publicStops} from '../../packages/core/custom-stops.js';
import {tripStops} from '../web/src/trip-itinerary.js';
test('shared itinerary preserves route order and exposes exact addresses only from authorised private requests',()=>{
 const ride={id:'ride',pickup:'Berri-UQAM',destination:'Rideau Centre',time:'09:00',arrival:'11:20',pickupLat:45.5,pickupLng:-73.5,dropoffLat:45.4,dropoffLng:-75.7};
 const rows=[{id:'sam',ride_id:'ride',kind:'pickup',status:'approved',minutes:4,address:'Private Sam address',lat:45.51,lng:-73.51},{id:'pending',ride_id:'ride',kind:'pickup',status:'pending',minutes:0},{id:'other',ride_id:'ride',kind:'dropoff',status:'approved',minutes:3,address:'Private other address',lat:45.41,lng:-75.71},{id:'cancelled',ride_id:'ride',kind:'dropoff',status:'cancelled',minutes:2}];
 const publicData=publicStops(rows,ride);assert.equal(publicData.detourMinutes,7);assert.deepEqual(publicData.itinerary.map(s=>s.kind),['pickup','custom pickup','dropoff','custom drop-off']);assert(!JSON.stringify(publicData).includes('Private'));assert(!JSON.stringify(publicData).includes('45.51'));
 const passenger=tripStops({...ride,...publicData},[rows[0]]);assert.equal(passenger[1].label,'Private Sam address');assert.equal(passenger[1].lat,45.51);assert.equal(passenger[3].label,'Near Rideau Centre');assert.equal(passenger[3].lat,ride.dropoffLat);assert.equal(passenger[3].own,false);assert.equal(passenger[1].time,null);
 const driver=tripStops({...ride,...publicData},rows);assert.equal(driver[3].label,'Private other address');assert.equal(driver[3].lng,-75.71);
});
