import {point} from './pickup.js';
import {roadRoute,serviceBudget} from './providers.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export async function quoteStop(b,user,db,env){
 const request=await db.get('SELECT * FROM stop_requests WHERE id=?',String(b.id||''));if(!request)fail(404,'Request not found.');const ride=await db.get('SELECT * FROM rides WHERE id=?',request.ride_id);if(ride.owner!==user.id)fail(404,'Request not found.');const booking=await db.get('SELECT cancelled FROM bookings WHERE id=?',request.booking_id);if(request.status!=='pending'||ride.cancelled||booking.cancelled)fail(409,'Request is no longer pending.');
 if([ride.pickup_lat,ride.pickup_lng,ride.dropoff_lat,ride.dropoff_lng].some(n=>!Number.isFinite(n)))fail(409,'This older listing needs both standard location pins. Repost it with pickup and drop-off pins to use road routing.');
 await serviceBudget(db,'routing:'+user.id,20,600000);const origin=point(ride.pickup_lat,ride.pickup_lng),destination=point(ride.dropoff_lat,ride.dropoff_lng);const approved=await db.all("SELECT s.* FROM stop_requests s JOIN bookings b ON b.id=s.booking_id WHERE s.ride_id=? AND s.status='approved' AND b.cancelled=0 ORDER BY s.rowid",ride.id);
 const points=stops=>[origin,...stops.filter(s=>s.kind==='pickup').map(s=>point(s.lat,s.lng)),destination,...stops.filter(s=>s.kind==='dropoff').map(s=>point(s.lat,s.lng))];
 const [baseline,previous,candidate]=await Promise.all([roadRoute(env,[origin,destination]),approved.length?roadRoute(env,points(approved)):roadRoute(env,[origin,destination]),roadRoute(env,points([...approved,request]))]);
 for(const route of [baseline,previous,candidate])if(!Number.isFinite(route.duration)||route.duration<0)fail(502,'Routing service returned invalid travel times.');
 const seconds=Math.max(0,candidate.duration-baseline.duration)+120*(approved.length+1);const totalMinutes=Math.ceil(seconds/60);if(seconds>900)fail(409,'This full route would add more than 15 minutes, including two minutes for each custom stop.');
 const current=approved.reduce((n,s)=>n+s.minutes,0),minutes=Math.max(1,totalMinutes-current);if(current+minutes>15)fail(409,'This stop exceeds the remaining shared detour allowance.');const id=crypto.randomUUID(),expires=Date.now()+300000;
 await db.run('DELETE FROM route_quotes WHERE expires<?',Date.now());await db.run('INSERT INTO route_quotes VALUES(?,?,?,?,?,?,?,?,?)',id,request.id,ride.id,ride.route_version,Math.ceil(seconds),minutes,JSON.stringify(candidate.geometry),Date.now(),expires);
 return {id,totalMinutes:current+minutes,roadDetourMinutes:totalMinutes,addedMinutes:minutes,detourSeconds:Math.ceil(seconds),expires,geometry:candidate.geometry,routeMinutes:Math.ceil(candidate.duration/60),boardingMinutes:2*(approved.length+1),previousRouteMinutes:Math.ceil(previous.duration/60)};
}
