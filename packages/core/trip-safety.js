import {serviceBudget} from './providers.js';
import {departureTime} from './cancellation.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
async function booking(db,user,id){const b=await db.get('SELECT b.id,b.user_id,b.ride_id,b.cancelled AS booking_cancelled,b.passenger_completed_at,r.owner,r.cancelled,r.completed_at,r.date,r.time,r.arrival FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE b.id=?',String(id||''));if(!b||![b.user_id,b.owner].includes(user.id))fail(404,'Booking not found.');return b}
function active(b){if(b.cancelled||b.booking_cancelled)fail(409,'This reservation is cancelled.');if(b.completed_at)fail(409,'This trip has already been completed.');}
async function notifyOperator(db,env){if(!env.RIDELY_ADMIN_EMAIL)return;const admin=await db.get('SELECT id FROM users WHERE email=? AND email_verified=1',env.RIDELY_ADMIN_EMAIL.toLowerCase());if(admin)await db.run('INSERT INTO notifications(id,user_id,title,created) VALUES(?,?,?,?)',crypto.randomUUID(),admin.id,'New confidential safety report. Open the support queue to review.',Date.now())}
export async function safetyApi(path,b,user,db,env={}){
 if(!path.startsWith('/api/safety/'))return null;
 if(path==='/api/safety/share/view'){
 if(typeof b.token!=='string'||!/^[a-f0-9]{64}$/.test(b.token))fail(404,'This trip link is unavailable or has expired.');
 const link=await db.get('SELECT * FROM trip_share_links WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?',await hash(b.token),Date.now());if(!link)fail(404,'This trip link is unavailable or has expired.');
 const r=await db.get('SELECT r.*,u.name AS driver FROM rides r JOIN users u ON u.id=r.owner WHERE r.id=?',link.ride_id);if(!r||r.cancelled)fail(404,'This trip link is unavailable or has expired.');
 if(link.booking_id&&!await db.get('SELECT id FROM bookings WHERE id=? AND cancelled=0',link.booking_id))fail(404,'This trip link is unavailable or has expired.');
 const stops=await db.all("SELECT s.kind,s.minutes FROM stop_requests s JOIN bookings b ON b.id=s.booking_id WHERE s.ride_id=? AND s.status='approved' AND b.cancelled=0 ORDER BY CASE s.kind WHEN 'pickup' THEN 0 ELSE 1 END,s.rowid",r.id);
 const check=link.booking_id?await db.get('SELECT confirmed_at FROM boarding_checks WHERE booking_id=?',link.booking_id):null;
 return {sharedTrip:{from:r.origin,to:r.destination_city,pickup:r.pickup,destination:r.destination,date:r.date,time:r.time,arrival:r.arrival,driver:r.driver,car:r.car,vehicleColor:r.vehicle_color,licencePlate:r.licence_plate,plateProvince:r.plate_province,stops:stops.map(s=>({kind:s.kind,city:s.kind==='pickup'?r.origin:r.destination_city,addedMinutes:s.minutes})),status:r.completed_at?'completed':'scheduled',boardingConfirmedAt:check?.confirmed_at||null,expiresAt:link.expires_at,liveTracking:false}};
 }
 if(!user)fail(401,'Sign in to continue.');
 if(!user.email_verified)fail(403,'Verify your email before using trip safety tools.');
 await serviceBudget(db,'trip-safety:'+user.id,120,600000);
 if(path==='/api/safety/status'){
 let rideId;let mine=null;if(b.bookingId){mine=await booking(db,user,b.bookingId);rideId=mine.ride_id}else{const r=await db.get('SELECT id FROM rides WHERE id=? AND owner=?',String(b.rideId||''),user.id);if(!r)fail(404,'Ride not found.');rideId=r.id}
 const boarding=mine?await db.get('SELECT issued_at,confirmed_at FROM boarding_checks WHERE booking_id=?',mine.id):null;
 const checks=await db.all('SELECT c.booking_id,c.confirmed_at FROM boarding_checks c JOIN bookings b ON b.id=c.booking_id JOIN rides r ON r.id=b.ride_id WHERE r.id=? AND r.owner=? AND b.cancelled=0',rideId,user.id);
 const feedback=mine&&mine.user_id===user.id?await db.get('SELECT created,report_id FROM trip_safety_feedback WHERE booking_id=? AND user_id=?',mine.id,user.id):null;
 return {boarding:boarding||null,passengerChecks:checks,feedback:feedback?{submittedAt:feedback.created,reportReference:feedback.report_id}:null,shareLinks:await db.all('SELECT id,expires_at AS expiresAt FROM trip_share_links WHERE user_id=? AND ride_id=? AND revoked_at IS NULL AND expires_at>?',user.id,rideId,Date.now())};
 }
 if(path==='/api/safety/boarding/code'){
 const item=await booking(db,user,b.bookingId);active(item);if(item.user_id!==user.id)fail(403,'Only the passenger can request their private boarding code.');
 await serviceBudget(db,'boarding-code:'+item.id,10,600000);const old=await db.get('SELECT confirmed_at FROM boarding_checks WHERE booking_id=?',item.id);if(old?.confirmed_at)fail(409,'Boarding was already confirmed for this reservation.');
 const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0'),digest=await hash(item.id+':'+code);
 const saved=await db.run('INSERT INTO boarding_checks(booking_id,code_digest,issued_at) VALUES(?,?,?) ON CONFLICT(booking_id) DO UPDATE SET code_digest=excluded.code_digest,issued_at=excluded.issued_at WHERE boarding_checks.confirmed_at IS NULL',item.id,digest,Date.now());if(!(saved.changes??saved.meta?.changes))fail(409,'Boarding was already confirmed for this reservation.');return {code,hideAfterSeconds:120,expiresAt:Date.now()+15*60000};
 }
 if(path==='/api/safety/boarding/confirm'){
 const item=await booking(db,user,b.bookingId);active(item);if(item.owner!==user.id)fail(403,'Only the driver can confirm this boarding code.');
 await serviceBudget(db,'boarding-attempt:'+item.id,5,600000);if(typeof b.code!=='string'||!/^\d{6}$/.test(b.code))fail(400,'Enter the six-digit code shown to your passenger.');
 const result=await db.run("UPDATE boarding_checks SET confirmed_at=?,code_digest='' WHERE booking_id=? AND code_digest=? AND confirmed_at IS NULL AND issued_at>? AND EXISTS(SELECT 1 FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE b.id=boarding_checks.booking_id AND b.cancelled=0 AND r.cancelled=0 AND r.completed_at IS NULL AND r.owner=?)",Date.now(),item.id,await hash(item.id+':'+b.code),Date.now()-15*60000,user.id);
 if(!(result.changes??result.meta?.changes))fail(400,'The code is incorrect, has changed, or was already confirmed.');return {confirmed:true};
 }
 if(path==='/api/safety/share/create'){
 if(b.consent!==true)fail(400,'Confirm what the trip link shares before creating it.');let rideId;let bookingId=null;
 if(b.bookingId){const item=await booking(db,user,b.bookingId);active(item);if(item.user_id!==user.id)fail(403,'Share your own reservation or your own driver listing.');rideId=item.ride_id;bookingId=item.id}else{const r=await db.get('SELECT id,cancelled,completed_at FROM rides WHERE id=? AND owner=?',String(b.rideId||''),user.id);if(!r)fail(404,'Ride not found.');if(r.cancelled||r.completed_at)fail(409,'This ride is no longer available to share.');rideId=r.id}
 await serviceBudget(db,'trip-share:'+user.id,10,3600000);const ride=await db.get('SELECT date,arrival FROM rides WHERE id=?',rideId);const expiresAt=Math.min(Date.now()+86400000,departureTime(ride.date,ride.arrival)+4*3600000);if(expiresAt<=Date.now())fail(409,'This trip is too old to share.');const token=randomToken(),id=crypto.randomUUID();await db.run('INSERT INTO trip_share_links(id,token_hash,user_id,ride_id,booking_id,expires_at,created) VALUES(?,?,?,?,?,?,?)',id,await hash(token),user.id,rideId,bookingId,expiresAt,Date.now());return {url:'/trip-share#'+token,id,expiresAt};
 }
 if(path==='/api/safety/share/revoke'){
 await db.run('UPDATE trip_share_links SET revoked_at=? WHERE id=? AND user_id=? AND revoked_at IS NULL',Date.now(),String(b.id||''),user.id);return {revoked:true};
 }
 if(path==='/api/safety/report'){
 const item=await booking(db,user,b.bookingId);if(!['vehicle_mismatch','unwanted_contact','unsafe_driving','other_safety'].includes(b.category))fail(400,'Choose the type of safety concern.');if(typeof b.details!=='string'||b.details.trim().length<10||b.details.length>2000)fail(400,'Describe the concern using 10–2,000 characters.');await serviceBudget(db,'safety-report:'+user.id,10,86400000);
 const id=crypto.randomUUID(),target=item.user_id===user.id?item.owner:item.user_id;await db.run('INSERT INTO reports(id,user_id,target_id,reason,created,booking_id,category,urgent) VALUES(?,?,?,?,?,?,?,1)',id,user.id,target,b.details.trim(),Date.now(),item.id,b.category);await notifyOperator(db,env);return {reportId:id};
 }
 if(path==='/api/safety/feedback'){
 const item=await booking(db,user,b.bookingId);if(item.user_id!==user.id)fail(403,'Only the passenger can submit this post-trip feedback.');if(!item.completed_at&&!item.passenger_completed_at)fail(409,'Post-trip feedback opens after the journey is marked complete. You can report a concern at any time.');
 if(![b.comfortable,b.vehicleMatched,b.conductConcern].every(v=>typeof v==='boolean'))fail(400,'Answer all three safety questions.');const details=typeof b.details==='string'?b.details.trim():'';if(details.length>2000)fail(400,'Keep feedback within 2,000 characters.');if(await db.get('SELECT booking_id FROM trip_safety_feedback WHERE booking_id=?',item.id))fail(409,'Feedback was already submitted. Contact support to add information.');const concern=!b.comfortable||!b.vehicleMatched||b.conductConcern,reportId=concern?crypto.randomUUID():null;
 const saved=await db.run('INSERT INTO trip_safety_feedback(booking_id,user_id,comfortable,vehicle_matched,conduct_concern,details,report_id,created) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(booking_id) DO NOTHING',item.id,user.id,Number(b.comfortable),Number(b.vehicleMatched),Number(b.conductConcern),details,reportId,Date.now());if(!(saved.changes??saved.meta?.changes))fail(409,'Feedback was already submitted. Contact support to add information.');if(concern)await notifyOperator(db,env);return {submitted:true,reportId};
 }
 fail(404,'Safety tool not found.');
}
