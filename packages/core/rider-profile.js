import {serviceBudget} from './providers.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const encode=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export function profileAvailable(env){try{return atob(env.LICENCE_ENCRYPTION_KEY||'').length===32}catch{return false}}
async function key(env){if(!profileAvailable(env))fail(503,'Private profile storage is awaiting activation. No private details were saved.');return crypto.subtle.importKey('raw',decode(env.LICENCE_ENCRYPTION_KEY),'AES-GCM',false,['encrypt','decrypt'])}
const aad=id=>new TextEncoder().encode('ridely-rider-profile-v1:'+id);
export async function expireRiderProfiles(db){await db.run('UPDATE rider_private_profiles SET ciphertext=NULL,iv=NULL,adult_declared=0 WHERE expires_at<=? AND ciphertext IS NOT NULL',Date.now())}
export async function riderState(db,user,env){await expireRiderProfiles(db);const p=user?await db.get('SELECT adult_declared,expires_at,ciphertext IS NOT NULL AS stored FROM rider_private_profiles WHERE user_id=?',user.id):null;const details=!!(p?.stored&&p.adult_declared&&p.expires_at>Date.now());return {available:profileAvailable(env),detailsComplete:details,emailVerified:!!user?.email_verified,phoneVerified:!!user?.phone_verified,ready:!!(details&&user?.email_verified),minimumAge:18}}
export async function requireRider(db,user){if(!(await riderState(db,user,{})).ready)fail(403,'Complete your private rider profile and verify your email before booking.');}
const localToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export async function riderApi(path,b,user,db,env,reauth){
 if(!['/api/rider/profile','/api/rider/profile/save','/api/rider/profile/delete','/api/admin/rider/incident-profile'].includes(path))return null;
 if(!user)fail(401,'Sign in to continue.');
 if(!env.LICENCE_REQUEST_SECURE)fail(400,'Use HTTPS for private profile access.');
 if(path==='/api/admin/rider/incident-profile'){
 if(!user.email_verified||!env.RIDELY_ADMIN_EMAIL||user.email!==env.RIDELY_ADMIN_EMAIL.toLowerCase())fail(403,'Verified operator access is required.');
 await serviceBudget(db,'rider-incident:'+user.id,10,600000);
 if(!['accident','safety_report','lawful_request'].includes(b.purpose)||b.confirmed!==true)fail(400,'Confirm the incident purpose and authority to access these records.');
 const booking=typeof b.bookingId==='string'?await db.get('SELECT id,user_id FROM bookings WHERE id=?',b.bookingId):null;if(!booking)fail(404,'Booking not found.');
 const related=typeof b.caseId==='string'?await db.get('SELECT id FROM support_tickets WHERE id=? AND user_id=? UNION SELECT id FROM reports WHERE id=? AND (user_id=? OR target_id=?)',b.caseId,booking.user_id,b.caseId,booking.user_id,booking.user_id):null;if(!related)fail(400,'Use a related support-ticket or member-report reference.');
 if(!reauth||typeof b.password!=='string'||b.password.length>128||!await reauth(b.password))fail(403,'Confirm your operator password for this incident access.');
 const profile=await readProfile(db,booking.user_id,env);const contact=await db.get('SELECT email,phone,email_verified,phone_verified FROM users WHERE id=?',booking.user_id);
 await db.run('INSERT INTO rider_incident_access_log VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),user.id,booking.user_id,booking.id,b.caseId,b.purpose,Date.now());return {profile,contact,hideAfterSeconds:60};
 }
 if(path==='/api/rider/profile')return {profile:await readProfile(db,user.id,env)};
 if(path.endsWith('/delete')){await db.run('DELETE FROM rider_private_profiles WHERE user_id=?',user.id);return {refresh:true}}
 if(b.consent!==true||b.adultPolicyAccepted!==true)fail(400,'Accept the private-profile notice and the 18+ rider policy.');
 const legalName=typeof b.legalName==='string'?b.legalName.trim().replace(/\s+/g,' '):'';if(legalName.length<2||legalName.length>100||/[\u0000-\u001f]/.test(legalName))fail(400,'Enter your full legal name.');
 const dob=b.dob,today=localToday();if(typeof dob!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(dob)||!Number.isFinite(Date.parse(dob+'T12:00:00Z'))||new Date(dob+'T12:00:00Z').toISOString().slice(0,10)!==dob||dob>today||Number(dob.slice(0,4))<Number(today.slice(0,4))-120)fail(400,'Enter a valid date of birth.');
 const cutoff=String(Number(today.slice(0,4))-18)+today.slice(4);if(dob>cutoff)fail(400,'Ridely’s pilot is for riders aged 18 and over.');
 await serviceBudget(db,'rider-profile:'+user.id,20,86400000);
 const iv=crypto.getRandomValues(new Uint8Array(12)),encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(user.id)},await key(env),new TextEncoder().encode(JSON.stringify({legalName,dob}))),now=Date.now();
 await db.run("INSERT INTO rider_private_profiles VALUES(?,?,?,1,'rider-18plus-v1',?,?) ON CONFLICT(user_id) DO UPDATE SET ciphertext=excluded.ciphertext,iv=excluded.iv,adult_declared=1,policy_version=excluded.policy_version,updated_at=excluded.updated_at,expires_at=excluded.expires_at",user.id,encode(encrypted),encode(iv),now,now+365*86400000);return {refresh:true};
}
async function readProfile(db,id,env){const p=await db.get('SELECT * FROM rider_private_profiles WHERE user_id=?',id);if(!p?.ciphertext||p.expires_at<=Date.now())return null;try{return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(p.iv),additionalData:aad(id)},await key(env),decode(p.ciphertext))))}catch{fail(503,'Private profile details cannot be opened. Contact support.')}}
