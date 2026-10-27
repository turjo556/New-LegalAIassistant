import {driverBookable} from './driver-verification.js';
import {capabilities,serviceBudget} from './providers.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export async function driverApprovalReference(driver){
 const value=JSON.stringify([driver.reviewed_at,driver.session_id||driver.attempt,driver.eligibility_consent_at,driver.licence_province,driver.authority_source,driver.authority_checked_at,driver.licence_class_confirmed,driver.restrictions_confirmed,driver.licence_expires,driver.insurance_expires,driver.vehicle]);
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');
}
export async function queueDriverApprovalEmail(b,user,db,env){
 if(!capabilities(env).email)fail(503,'Email delivery is not configured. Check Email delivery in the operator dashboard.');
 if(typeof b.id!=='string'||b.id.length>80)fail(400,'Choose a driver.');
 const driver=await db.get('SELECT d.*,u.email_verified FROM driver_checks d JOIN users u ON u.id=d.user_id WHERE d.user_id=?',b.id);
 if(!driver)fail(404,'Driver application not found.');
 if(!driver.email_verified||!driver.vehicle.trim()||!driverBookable(driver,new Date().toISOString().slice(0,10),driver.vehicle))fail(409,'This driver is not currently approved to post rides. Complete the live identity, driving-privilege and vehicle-insurance checks first.');
 await serviceBudget(db,'driver-approval-email:'+user.id+':'+b.id,10,3600000);
 const reference=await driverApprovalReference(driver),now=Date.now();
 const previous=await db.get("SELECT event_key,status FROM account_email_outbox WHERE user_id=? AND kind='driver_approved' AND reference=? AND created>? AND status<>'skipped' ORDER BY created DESC LIMIT 1",b.id,reference,now-86400000);
 if(previous)return {queued:previous.status==='pending'||previous.status==='sending',status:previous.status,alreadyQueued:true};
 const id='driver-approved:'+b.id+':'+reference+':'+Math.floor(now/86400000);
 const inserted=await db.run("INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created) VALUES(?,?,'driver_approved',?,?)",id,b.id,reference,now);
 let changed=Number(inserted.changes??inserted.meta?.changes??0);
 if(!changed){const revived=await db.run("UPDATE account_email_outbox SET status='pending',attempts=0,next_attempt_at=0,locked_until=0,last_error=NULL,created=? WHERE event_key=? AND status='skipped'",now,id);changed=Number(revived.changes??revived.meta?.changes??0)}
 if(changed)await db.run('INSERT INTO account_email_retry_log VALUES(?,?,?,?)',crypto.randomUUID(),id,user.id,now);
 const row=await db.get('SELECT status FROM account_email_outbox WHERE event_key=?',id);return {queued:row.status==='pending'||row.status==='sending',status:row.status,alreadyQueued:!changed};
}
