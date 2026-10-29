import test from 'node:test';
import assert from 'node:assert/strict';
import {requestDeadline,requestCutoffMs} from './booking-policy.js';
import {departureTime} from './cancellation.js';
test('seat requests stay open until exactly ten minutes before Eastern departure',()=>{
 for(const date of ['2026-07-10','2026-12-10']){
  const departure=departureTime(date,'09:00'),cutoff=departure-requestCutoffMs;
  assert.equal(requestDeadline(date,'09:00',departure-30*60000),cutoff);
  assert.equal(requestDeadline(date,'09:00',cutoff-1),cutoff);
  assert.equal(requestDeadline(date,'09:00',cutoff),cutoff);
  assert.equal(requestDeadline(date,'09:00',cutoff+1)<cutoff+1,true);
  const early=departure-4*3600000;assert.equal(requestDeadline(date,'09:00',early),early+2*3600000);
 }
});
