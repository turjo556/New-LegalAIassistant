import {driverBookable} from './driver-verification.js';
import {departureTime} from './cancellation.js';
import {serviceBudget} from './providers.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export async function signupReferral(value,db){
 if(value===undefined||value===null||value==='')return null;
 if(typeof value!=='string'||value.length>30)fail(400,'Enter a valid referral code or leave it blank.');
 const code=value.trim().toUpperCase();if(!code)return null;
 if(!/^[A-Z0-9-]{3,20}$/.test(code))fail(400,'Enter a valid referral code or leave it blank.');
 const p=await db.get('SELECT * FROM referral_programs WHERE code=?',code);
 if(!p||!p.enabled||p.starts_at>Date.now()||(p.ends_at&&p.ends_at<=Date.now()))fail(400,'This referral code is not active. Check it or remove it to sign up.');return code;
}
const corridor=r=>['Montréal','Longueuil','Ottawa','Gatineau'].includes(r.origin)&&['Montréal','Longueuil','Ottawa','Gatineau'].includes(r.destination_city)&&r.origin!==r.destination_city;
export async function referralCandidates(db,p){
 const rows=await db.all(`SELECT r.*,u.name,u.email,u.email_verified,u.referred_at,d.* FROM rides r JOIN users u ON u.id=r.owner LEFT JOIN driver_checks d ON d.user_id=r.owner WHERE u.referral_code=? AND r.published_at>=u.referred_at AND r.published_at>=? AND r.cancelled=0 ORDER BY r.published_at,r.rowid`,p.code,p.starts_at),result=[],departures=new Set();
 const completedRides=new Set((await db.all('SELECT DISTINCT b.ride_id FROM bookings b JOIN rides r ON r.id=b.ride_id JOIN users owner ON owner.id=r.owner JOIN users passenger ON passenger.id=b.user_id WHERE owner.referral_code=? AND b.cancelled=0 AND b.user_id!=r.owner AND b.passenger_completed_at IS NOT NULL AND passenger.email_verified=1',p.code)).map(r=>r.ride_id));
 for(const r of rows){if(!corridor(r)||!r.email_verified||(p.ends_at&&r.published_at>=p.ends_at))continue;
  const departure=r.owner+':'+r.date+':'+r.time;if(departures.has(departure))continue;departures.add(departure);
  const completed=!!(r.completed_at&&r.completion_eligible&&completedRides.has(r.id));
  const base={userId:r.owner,name:r.name,email:r.email,rideId:r.id,from:r.origin,to:r.destination_city,date:r.date,time:r.time};
  if(completed||driverBookable(r,r.date,r.car))result.push({...base,key:'driver-posted:'+r.id,kind:'driver_posted',amount:500});
  if(completed&&(!p.ends_at||r.completed_at<p.ends_at))result.push({...base,key:'driver-completed:'+r.id,kind:'driver_completed',amount:500});
 }
 // One passenger event per referred account, bound to its first actual confirmed trip.
 const passengers=await db.all(`SELECT r.*,u.id AS passenger_id,u.name AS passenger_name,u.email AS passenger_email,u.referred_at FROM users u JOIN bookings b ON b.user_id=u.id JOIN rides r ON r.id=b.ride_id WHERE u.referral_code=? AND u.email_verified=1 AND b.user_id!=r.owner AND b.cancelled=0 AND r.cancelled=0 AND r.completion_eligible=1 AND r.completed_at IS NOT NULL AND b.passenger_completed_at IS NOT NULL ORDER BY u.id,r.date,r.time,r.id`,p.code),seen=new Set();
 for(const r of passengers){if(seen.has(r.passenger_id))continue;seen.add(r.passenger_id);
  if(!corridor(r)||r.completed_at<r.referred_at||r.completed_at<p.starts_at||(p.ends_at&&r.completed_at>=p.ends_at))continue;
  result.push({key:'passenger-first:'+r.passenger_id,kind:'passenger_first_trip',amount:300,userId:r.passenger_id,name:r.passenger_name,email:r.passenger_email,rideId:r.id,from:r.origin,to:r.destination_city,date:r.date,time:r.time});
 }return result;
}
export async function referralReport(db,code='ABA01'){
 const program=await db.get('SELECT * FROM referral_programs WHERE code=?',code);if(!program)fail(404,'Referral programme not found.');
 const candidates=await referralCandidates(db,program),recorded=await db.all('SELECT a.*,u.name,u.email,r.origin AS "from",r.destination_city AS "to",r.date,r.time FROM referral_rewards a JOIN users u ON u.id=a.user_id JOIN rides r ON r.id=a.ride_id WHERE a.code=? ORDER BY a.created DESC',code);
 const rewards=candidates.map(c=>{const saved=recorded.find(r=>r.event_key===c.key);return {...c,status:'pending',qualifies:!saved||saved.ride_id===c.rideId,...saved}});
 for(const r of recorded)if(!candidates.some(c=>c.key===r.event_key))rewards.push({...r,key:r.event_key,userId:r.user_id,rideId:r.ride_id,qualifies:false});
 const totals={pending:0,approved:0,paid:0,rejected:0};for(const r of rewards)totals[r.status]+=r.amount;
 return {program,totals,rewards,signups:await db.all('SELECT id,name,email,email_verified AS emailVerified,referred_at AS referredAt FROM users WHERE referral_code=? ORDER BY referred_at DESC',code)};
}
export async function referralApi(path,b,user,db,env={}){
 if(!['/api/admin/referrals','/api/admin/referrals/settings','/api/admin/referrals/decision'].includes(path))return null;
 if(!user?.email_verified||!env.RIDELY_ADMIN_EMAIL||user.email!==env.RIDELY_ADMIN_EMAIL.toLowerCase())fail(403,'Verified operator access is required.');await serviceBudget(db,'referrals:'+user.id,120,600000);
 const p=await db.get("SELECT * FROM referral_programs WHERE code='ABA01'");
 if(path.endsWith('/settings')){
  if(!Number.isSafeInteger(b.budget)||b.budget<0||b.budget>10000||typeof b.enabled!=='boolean')fail(400,'Enter a bonus budget from $0 to $10,000 CAD and a programme status.');
  let end=null;if(b.endDate){if(typeof b.endDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.endDate)||!Number.isFinite(Date.parse(b.endDate+'T12:00:00Z'))||new Date(b.endDate+'T12:00:00Z').toISOString().slice(0,10)!==b.endDate)fail(400,'Enter a valid end date.');end=departureTime(b.endDate,'23:59')+60000;if(end<=p.starts_at)fail(400,'End date must be after tracking began.');}
  try{await db.run('UPDATE referral_programs SET budget_cents=?,enabled=?,ends_at=?,updated=? WHERE code=?',b.budget*100,Number(b.enabled),end,Date.now(),p.code)}catch(e){if(String(e).includes('referral_budget_committed'))fail(409,'The budget cannot be lower than bonuses already approved or paid.');throw e}
  await db.run('INSERT INTO referral_audit VALUES(?,?,?,?,?,?)',crypto.randomUUID(),p.code,null,user.id,'settings_updated',Date.now());
 }
 if(path.endsWith('/decision')){
  if(!['approve','reject','paid'].includes(b.decision))fail(400,'Choose approve, reject or record payment.');
  const existing=await db.get('SELECT * FROM referral_rewards WHERE event_key=? AND code=?',String(b.key||''),p.code),candidate=(await referralCandidates(db,p)).find(c=>c.key===b.key);
  if(!existing&&!candidate)fail(409,'This result is not eligible. Refresh the report.');if(existing?.status==='paid'||existing?.status==='rejected')fail(409,'This result is already final.');
  const c=candidate||{key:existing.event_key,kind:existing.kind,userId:existing.user_id,rideId:existing.ride_id,amount:existing.amount};if(c.userId===user.id)fail(403,'Another operator must review your own referral result.');
  const note=typeof b.note==='string'?b.note.trim():'';if(note.length<10||note.length>500)fail(400,'Record a review note (10–500 characters).');
  if(b.decision!=='reject'&&(!candidate||(existing&&candidate.rideId!==existing.ride_id)||b.genuineReviewed!==true))fail(409,'Confirm genuine recruitment and travel evidence. This result must still qualify.');
  const status={approve:'approved',reject:'rejected',paid:'paid'}[b.decision];let reference=null;
  if(status==='paid'){if(existing?.status!=='approved'||b.paymentSent!==true)fail(409,'Approve the bonus and pay it separately before recording payment.');reference=typeof b.reference==='string'?b.reference.trim():'';if(reference.length<4||reference.length>80)fail(400,'Enter a payroll or payment reference (4–80 characters), without banking credentials.');}
  if(status==='approved'&&existing?.status==='approved')fail(409,'This bonus is already approved.');
  try{if(existing){const changed=await db.run('UPDATE referral_rewards SET status=?,note=?,actor=?,updated=?,payment_reference=?,paid_at=? WHERE event_key=? AND status=?',status,note,user.id,Date.now(),reference,status==='paid'?Date.now():null,c.key,existing.status);if(!(changed.changes??changed.meta?.changes))fail(409,'This result changed. Refresh before continuing.');}
   else await db.run('INSERT INTO referral_rewards(event_key,code,kind,user_id,ride_id,amount,status,created,updated,actor,note) VALUES(?,?,?,?,?,?,?,?,?,?,?)',c.key,p.code,c.kind,c.userId,c.rideId,c.amount,status,Date.now(),Date.now(),user.id,note);
  }catch(e){if(String(e).includes('referral_budget_exhausted'))fail(409,'Set or increase the programme bonus budget before approving this result.');if(String(e).includes('UNIQUE'))fail(409,'This result has already been reviewed. Refresh.');throw e}
  await db.run('INSERT INTO referral_audit VALUES(?,?,?,?,?,?)',crypto.randomUUID(),p.code,c.key,user.id,status,Date.now());
 }
 return referralReport(db,p.code);
}
