import {maximumSeatPrice} from './fare-policy.js';
import {departureTime} from './cancellation.js';
import {driverBookable} from './driver-verification.js';
import {requireRider} from './rider-profile.js';
import {serviceBudget} from './providers.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export async function maintainBookingRequests(db,now=Date.now()){
 await db.run("UPDATE booking_requests SET status='expired',decided_at=? WHERE status='pending' AND expires_at<=?",now,now);
 // Mark and enqueue in one statement through the reminder trigger.
 await db.run("UPDATE booking_requests SET reminded=1 WHERE status='pending' AND reminded=0 AND remind_at<=? AND expires_at>?",now,now);
}
export async function bookingRequestState(db,user){
 await maintainBookingRequests(db);if(!user)return [];
 const rows=await db.all(`SELECT q.id,q.user_id AS passengerId,q.ride_id AS rideId,q.seats,q.status,q.created,q.expires_at AS expiresAt,q.booking_id AS bookingId,
 EXISTS(SELECT 1 FROM bookings b WHERE b.ride_id=q.ride_id AND b.user_id=q.user_id AND b.cancelled=0) AS identityVisible,r.owner AS driverId,r.origin AS origin,r.destination_city AS destination,r.date,r.time,r.pickup,r.destination AS dropoff,q.price/100.0 AS price,u.name AS passenger,d.name AS driver
 FROM booking_requests q JOIN rides r ON r.id=q.ride_id JOIN users u ON u.id=q.user_id JOIN users d ON d.id=r.owner
 WHERE q.user_id=? OR r.owner=? ORDER BY q.created DESC LIMIT 100`,user.id,user.id);
 return rows.map(({identityVisible,...row})=>({...row,driver:row.driverId===user.id||identityVisible?row.driver:'Driver'}));
}
export async function bookingRequestApi(path,b,user,db){
 if(!['/api/bookings','/api/booking-requests/decision','/api/booking-requests/withdraw'].includes(path))return null;
 if(!user)fail(401,'Sign in to continue.');await maintainBookingRequests(db);await serviceBudget(db,'seat-requests:'+user.id,60,3600000);
 if(path==='/api/bookings'){
  await requireRider(db,user);const seats=b.seats;if(!Number.isSafeInteger(seats)||seats<1||seats>4)fail(400,'Choose a seat count between 1 and 4.');
  const ride=await db.get('SELECT * FROM rides WHERE id=?',String(b.rideId||''));if(!ride||ride.cancelled)fail(404,'This ride is unavailable.');if(ride.completed_at)fail(409,'This trip has already been completed.');if(b.expectedEditVersion!==undefined&&b.expectedEditVersion!==ride.edit_version||b.expectedPrice!==undefined&&b.expectedPrice!==ride.price/100)fail(409,'Ride details changed. Return to the ride and review the latest fare before requesting.');if(ride.owner===user.id)fail(400,'You cannot book your own ride.');
  if((b.mode&&b.mode!=='meeting')||(b.pickupMode&&b.pickupMode!=='standard'))fail(400,'Book the standard ride first, then request custom stops from My trips.');
  if(ride.price>maximumSeatPrice*100||ride.price%100!==0)fail(409,'The driver must update this listing to a whole-dollar fare of $30 or less before new reservations.');
  if(!driverBookable(await db.get('SELECT * FROM driver_checks WHERE user_id=?',ride.owner),ride.date,ride.car))fail(403,'This driver is awaiting identity, licence, or insurance approval for this trip.');
  if(await db.get('SELECT 1 FROM blocks WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)',user.id,ride.owner,ride.owner,user.id))fail(403,'Booking between these accounts is blocked.');
  const now=Date.now(),deadline=Math.min(now+7200000,departureTime(ride.date,ride.time)-3600000);if(deadline<=now)fail(409,'Seat requests close one hour before departure.');
  if(await db.get('SELECT id FROM bookings WHERE user_id=? AND ride_id=? AND cancelled=0',user.id,ride.id))fail(409,'You already booked this ride.');
  const used=await db.get('SELECT COALESCE(SUM(seats),0) AS n FROM bookings WHERE ride_id=? AND cancelled=0',ride.id);if(used.n+seats>ride.capacity)fail(409,'Not enough seats left. Refresh and choose another ride.');
  const balance=await db.get('SELECT COALESCE(SUM(amount),0) AS n FROM promo_credit_ledger WHERE user_id=?',user.id);if(balance.n<1)fail(409,'You need a booking credit before requesting seats. No credit is used until acceptance.');
  if(await db.get("SELECT id FROM booking_requests WHERE user_id=? AND ride_id=? AND status='pending'",user.id,ride.id))fail(409,'You already have a pending request for this ride.');
  try{await db.run('INSERT INTO booking_requests(id,user_id,ride_id,seats,price,created,expires_at,remind_at) VALUES(?,?,?,?,?,?,?,?)',crypto.randomUUID(),user.id,ride.id,seats,ride.price,now,deadline,now+3600000)}catch(e){if(String(e).includes('UNIQUE'))fail(409,'You already have a pending request for this ride.');throw e}return {refresh:true};
 }
 const q=await db.get('SELECT q.*,r.owner,r.date,r.time,r.car,r.cancelled AS ride_cancelled FROM booking_requests q JOIN rides r ON r.id=q.ride_id WHERE q.id=?',String(b.id||''));
 if(!q||(path.endsWith('/withdraw')?q.user_id!==user.id:q.owner!==user.id))fail(404,'Seat request not found.');
 if(q.status!=='pending')fail(409,'This request is no longer pending. Refresh your trips.');
 let status='withdrawn';if(path.endsWith('/decision')){
  if(!['accept','decline'].includes(b.decision))fail(400,'Choose accept or decline.');status=b.decision==='accept'?'accepted':'declined';
  if(status==='accepted'){
   if(b.availabilityConfirmed!==true)fail(400,'Confirm that these seats are available across all your listings.');
   if(!user.email_verified||!driverBookable(await db.get('SELECT * FROM driver_checks WHERE user_id=?',user.id),q.date,q.car))fail(403,'All driver checks must still be current.');
   if(q.ride_cancelled||departureTime(q.date,q.time)-Date.now()<=3600000)fail(409,'The response deadline has passed.');
   if(await db.get('SELECT 1 FROM blocks WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)',q.user_id,q.owner,q.owner,q.user_id))fail(403,'Booking between these accounts is blocked.');
   await requireRider(db,await db.get('SELECT * FROM users WHERE id=?',q.user_id));
  }
 }
 try{const result=await db.run("UPDATE booking_requests SET status=?,decided_at=? WHERE id=? AND status='pending' AND expires_at>?",status,Date.now(),q.id,Date.now());if(!(result.changes??result.meta?.changes))fail(409,'The response deadline has passed.');}
 catch(e){if(/booking_credit_required|insufficient_promo_credit/.test(String(e)))fail(409,'The passenger no longer has a booking credit. Ask them to add one before accepting.');if(/capacity_exceeded/.test(String(e)))fail(409,'Not enough seats remain. This request has not been accepted.');if(/request_expired|ride_changed|already_booked|driver_not_approved|rider_profile_required/.test(String(e)))fail(409,'The ride or eligibility changed. Refresh before accepting.');throw e}
 return {refresh:true};
}
