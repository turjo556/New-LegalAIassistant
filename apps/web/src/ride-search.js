import {cities,searchRides} from '../../../packages/core/index.js';
export function easternClock(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);const value=key=>parts.find(p=>p.type===key).value;return {date:`${value('year')}-${value('month')}-${value('day')}`,time:`${value('hour')}:${value('minute')}`};
}
export function validSearchDay(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value}
export function readRideSearch(params=new URLSearchParams(),now=new Date()){
 const today=easternClock(now).date,value=params.get('date');return {from:cities.includes(params.get('from'))?params.get('from'):'',to:cities.includes(params.get('to'))?params.get('to'):'',date:validSearchDay(value)&&value>=today?value:today,seats:[1,2,3,4].includes(Number(params.get('seats')))?Number(params.get('seats')):1,home:false};
}
export function rideSearchRange(date,now=new Date()){
 const today=easternClock(now).date,start=validSearchDay(date)&&date>=today?date:today,end=new Date(start+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+7);return {start,end:end.toISOString().slice(0,10)};
}
export function upcomingRides(list,query,sort='time',now=new Date()){
 const clock=easternClock(now),range=rideSearchRange(query.date,now);const chronological=(a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||String(a.id).localeCompare(String(b.id));
 return searchRides(list,{...query,date:range.start,daysAhead:7}).filter(r=>cities.includes(r.from)&&cities.includes(r.to)&&r.from!==r.to&&!r.cancelled&&(r.date>clock.date||r.time>clock.time)).sort((a,b)=>sort==='price'?a.price-b.price||chronological(a,b):chronological(a,b));
}
