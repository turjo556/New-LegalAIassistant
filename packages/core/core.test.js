import test from 'node:test';
import assert from 'node:assert/strict';
import {rides,searchRides,fare} from './index.js';
test('search respects route, date, capacity, and drop-off preference',()=>{const q={from:'Montréal',to:'Québec City',date:'2026-11-06',seats:2,home:true};assert.deepEqual(searchRides(rides,q).map(r=>r.id),['r1','r3']);assert.equal(searchRides(rides,{...q,seats:4}).length,0);assert.equal(searchRides(rides,{...q,date:'2026-11-07'}).length,0);assert.equal(searchRides(rides,{...q,from:'Québec City',to:'Montréal'}).length,0)});
test('fare adds home supplement for every passenger and rejects unsupported mode',()=>{assert.equal(fare(rides[0],'meeting',2),70);assert.equal(fare(rides[0],'home',2),86);assert.throws(()=>fare(rides[1],'home'),/unavailable/)});
