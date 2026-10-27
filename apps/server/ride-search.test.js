import test from 'node:test';
import assert from 'node:assert/strict';
import {searchRides} from '../../packages/core/index.js';
import {easternClock,readRideSearch,rideSearchRange,upcomingRides} from '../web/src/ride-search.js';
const now=new Date('2026-10-27T16:00:00Z'),ride=(id,date,time='19:30',overrides={})=>({id,date,time,from:'Ottawa',to:'Montréal',seats:3,price:25,...overrides});
test('search defaults to all routes from the Eastern calendar day through seven more days',()=>{
 const query=readRideSearch(new URLSearchParams(),now);assert.equal(query.from,'');assert.equal(query.to,'');assert.equal(query.date,'2026-10-27');assert.deepEqual(rideSearchRange(query.date,now),{start:'2026-10-27',end:'2026-11-03'});
 const list=[ride('yesterday','2026-10-26'),ride('departed','2026-10-27','11:45'),ride('now','2026-10-27','12:00'),ride('today','2026-10-27','12:15'),ride('other-route','2026-10-28','09:00',{from:'Gatineau',to:'Longueuil'}),ride('last-day','2026-11-03'),ride('too-late','2026-11-04'),ride('full','2026-10-29','09:00',{seats:0}),ride('cancelled','2026-10-30','09:00',{cancelled:true}),ride('outside-pilot','2026-10-28','09:00',{to:'Toronto'})];
 assert.deepEqual(upcomingRides(list,query,'time',now).map(r=>r.id),['today','other-route','last-day']);
});
test('chosen dates, city filters, seats and price sorting work across the entire window',()=>{
 const query=readRideSearch(new URLSearchParams('from=Ottawa&date=2026-11-01&seats=2'),now),list=[ride('last','2026-11-08','19:00',{price:20}),ride('first','2026-11-01','20:00'),ride('early-next-day','2026-11-02','08:00'),ride('wrong-city','2026-11-01','09:00',{from:'Longueuil'}),ride('too-small','2026-11-02','12:00',{seats:1}),ride('outside','2026-11-09')];
 assert.deepEqual(upcomingRides(list,query,'time',now).map(r=>r.id),['first','early-next-day','last']);assert.deepEqual(upcomingRides(list,query,'price',now).map(r=>r.id),['last','first','early-next-day']);assert.equal(upcomingRides(list,{...query,to:'Gatineau'},'time',now).length,0);
 assert.equal(searchRides(list,{...query,daysAhead:0}).length,1,'Existing exact-day searches remain supported');
});
test('date windows remain calendar based across daylight saving, leap days and year boundaries',()=>{
 assert.deepEqual(easternClock(new Date('2026-10-28T02:00:00Z')),{date:'2026-10-27',time:'22:00'});
 assert.deepEqual(rideSearchRange('2026-10-27',now),{start:'2026-10-27',end:'2026-11-03'});
 assert.deepEqual(rideSearchRange('2026-12-29',now),{start:'2026-12-29',end:'2027-01-05'});
 assert.deepEqual(rideSearchRange('2028-02-27',now),{start:'2028-02-27',end:'2028-03-05'});
 assert.equal(readRideSearch(new URLSearchParams('date=2026-02-30&from=Toronto&seats=99'),now).date,'2026-10-27');assert.equal(readRideSearch(new URLSearchParams('date=2026-10-01'),now).date,'2026-10-27');assert.equal(readRideSearch(new URLSearchParams('from=Toronto'),now).from,'');
 assert.equal(searchRides([],{date:'2026-02-30',daysAhead:7}).length,0);
});
