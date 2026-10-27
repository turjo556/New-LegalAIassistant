// Local test fixtures only. Never imported by application code.
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
export function testDatabase(t){const dir=mkdtempSync(join(tmpdir(),'ridely-driver-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return join(dir,'test.sqlite')}
export function approveTestDriver(dbPath,email='driver@example.com'){const db=new DatabaseSync(dbPath);try{const user=db.prepare('SELECT id FROM users WHERE email=?').get(email);db.prepare('UPDATE users SET email_verified=1 WHERE id=?').run(user.id);db.prepare("INSERT INTO driver_checks(user_id,attempt,identity_status,licence_status,insurance_status,licence_expires,insurance_expires,vehicle,reviewed_at) VALUES(?,?,'verified','approved','approved','2099-12-31','2099-12-31','Toyota',?) ON CONFLICT(user_id) DO UPDATE SET identity_status='verified',licence_status='approved',insurance_status='approved',licence_expires='2099-12-31',insurance_expires='2099-12-31',vehicle='Toyota',reviewed_at=excluded.reviewed_at").run(user.id,crypto.randomUUID(),Date.now());db.prepare("UPDATE driver_checks SET licence_province='QC',eligibility_consent_at=?,authority_source='saaq',authority_checked_at=?,licence_class_confirmed=1,restrictions_confirmed=1 WHERE user_id=?").run(Date.now(),Date.now()-1000,user.id)}finally{db.close()}}
export function completeTestRiders(dbPath){const db=new DatabaseSync(dbPath);try{db.prepare('UPDATE users SET email_verified=1,phone_verified=1,phone=?').run('+15145550000');db.prepare("INSERT INTO rider_private_profiles SELECT id,'test-only-ciphertext','test-only-iv',1,'test-fixture',?,? FROM users WHERE 1 ON CONFLICT(user_id) DO UPDATE SET adult_declared=1,ciphertext=excluded.ciphertext,expires_at=excluded.expires_at").run(Date.now(),Date.now()+365*86400000)}finally{db.close()}}

// Existing cancellation/safety/payment tests need a confirmed reservation fixture.
// Perform the real driver acceptance through the API instead of bypassing it in SQL.
export async function acceptRequestedBooking(base,state,rideId,cookies,fetcher=fetch){
 const q=state.seatRequests.find(q=>q.rideId===rideId&&q.status==='pending'&&q.passengerId===state.user.id);
 if(!q)throw Error('Expected a pending seat request in the reservation fixture.');
 let driverCookie;
 for(const cookie of Object.values(cookies)){
  const response=await fetcher(base+'/api/state',{headers:{Cookie:cookie}}),data=await response.json();
  if(data.user?.id===q.driverId){driverCookie=cookie;break}
 }
 if(!driverCookie)throw Error('Sign in the test driver before accepting the fixture request.');
 const response=await fetcher(base+'/api/booking-requests/decision',{method:'POST',headers:{'Content-Type':'application/json',Cookie:driverCookie},body:JSON.stringify({id:q.id,decision:'accept',availabilityConfirmed:true})});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Fixture driver acceptance failed.');
 const passengerCookie=await (async()=>{for(const cookie of Object.values(cookies)){const r=await fetcher(base+'/api/state',{headers:{Cookie:cookie}}),data=await r.json();if(data.user?.id===state.user.id)return cookie}})();
 return (await fetcher(base+'/api/state',{headers:{Cookie:passengerCookie}})).json();
}
