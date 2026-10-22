import {serviceBudget} from './providers.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const encode=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
function decode(s){try{return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}catch{fail(503,'Secure licence storage needs operator setup.')}}
async function keyFor(env){const bytes=decode(env.LICENCE_ENCRYPTION_KEY||'');if(bytes.length!==32)fail(503,'Secure licence storage needs operator setup.');return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt'])}
export function vaultAvailable(env){try{return !!env.LICENCE_ENCRYPTION_KEY&&atob(env.LICENCE_ENCRYPTION_KEY).length===32}catch{return false}}
const aad=row=>new TextEncoder().encode('ridely-licence-v1:'+row.user_id+':'+row.id+':'+row.province);
export async function expireLicences(db){await db.run("UPDATE licence_submissions SET ciphertext=NULL,iv=NULL,status='expired' WHERE ciphertext IS NOT NULL AND expires_at<=?",Date.now())}
export async function licenceMetadata(db,id){const row=await db.get('SELECT id,status,submitted_at,expires_at FROM licence_submissions WHERE user_id=?',id);return row?{id:row.id,status:row.status==='pending'&&row.expires_at<=Date.now()?'expired':row.status,submittedAt:row.submitted_at,expiresAt:row.expires_at}:null}
async function audit(db,row,actor,action){await db.run('INSERT INTO licence_access_log VALUES(?,?,?,?,?,?)',crypto.randomUUID(),row.user_id,actor.id,action,row.id,Date.now())}
export async function licenceApi(path,b,user,db,env,reauth){
 if(!['/api/driver/licence/submit','/api/driver/licence/delete','/api/admin/licence/reveal','/api/admin/licence/delete','/api/admin/licence/unlock','/api/admin/licence/lock','/api/admin/licence/status'].includes(path))return null;
 if(!user)fail(401,'Sign in to continue.');
 if(!env.LICENCE_REQUEST_SECURE)fail(400,'Use HTTPS for licence submissions and access.');
 if(!user.email_verified)fail(403,'Verify your email before accessing licence submissions.');
 const admin=path.startsWith('/api/admin/');
 if(admin&&(!env.RIDELY_ADMIN_EMAIL||user.email!==env.RIDELY_ADMIN_EMAIL.toLowerCase()))fail(403,'Verified operator access is required.');
 const currentSession=async()=>env.LICENCE_SESSION_TOKEN?await db.get('SELECT s.expires,g.unlocked_until AS licence_unlocked_until FROM sessions s LEFT JOIN licence_review_sessions g ON g.token=s.token AND g.user_id=s.user_id WHERE s.token=? AND s.user_id=? AND s.expires>?',env.LICENCE_SESSION_TOKEN,user.id,Date.now()):null;
 async function unlock(){
 await serviceBudget(db,'licence-unlock:'+user.id,5,600000);
 if(!reauth||typeof b.password!=='string'||b.password.length>128||!await reauth(b.password))fail(403,'Confirm your operator password to unlock licence access.');
 const session=await currentSession();if(!session)return 0;
 const until=Math.min(Date.now()+600000,session.expires);
 const result=await db.run('INSERT INTO licence_review_sessions(token,user_id,unlocked_until) SELECT token,user_id,? FROM sessions WHERE token=? AND user_id=? AND expires>? ON CONFLICT(token) DO UPDATE SET unlocked_until=excluded.unlocked_until',until,env.LICENCE_SESSION_TOKEN,user.id,Date.now());if(!(result.changes??result.meta?.changes))fail(401,'Sign in again before unlocking licence access.');
 await db.run('INSERT INTO licence_session_log VALUES(?,?,?,?,?)',crypto.randomUUID(),user.id,'unlocked',Date.now(),until);return until;
 }
 if(path==='/api/admin/licence/status'){const session=await currentSession();return {unlockedUntil:session?.licence_unlocked_until>Date.now()?session.licence_unlocked_until:0}}
 if(path==='/api/admin/licence/unlock'){
 if(b.purpose!=='authority_check'||b.confirmed!==true)fail(400,'Confirm the authorised review purpose.');
 const until=await unlock();if(!until)fail(401,'Sign in again before unlocking licence access.');return {unlockedUntil:until};
 }
 if(path==='/api/admin/licence/lock'){
 await db.run('DELETE FROM licence_review_sessions WHERE token=? AND user_id=?',env.LICENCE_SESSION_TOKEN||'',user.id);
 await db.run('INSERT INTO licence_session_log VALUES(?,?,?,?,?)',crypto.randomUUID(),user.id,'locked',Date.now(),0);return {unlockedUntil:0};
 }
 const id=admin?b.id:user.id;
 if(typeof id!=='string'||id.length>80)fail(400,'Choose a driver.');
 if(admin&&id===user.id)fail(403,'You cannot access your own driver application as an operator.');
 await serviceBudget(db,'licence:'+path+':'+user.id,admin?200:10,600000);
 const d=await db.get('SELECT * FROM driver_checks WHERE user_id=?',id);if(!d)fail(404,'Driver application not found.');
 if(path.endsWith('/submit')){
 if(!vaultAvailable(env))fail(503,'Secure licence submission is awaiting activation. No number has been saved.');
 if(b.consent!==true||!d.eligibility_consent_at)fail(400,'Authorise the driving-eligibility review and secure number submission first.');
 if(typeof b.number!=='string'||b.number.length>30)fail(400,'Enter a valid licence number.');
 const number=b.number.replace(/[\s-]/g,'').toUpperCase();
 if(!(d.licence_province==='QC'?/^[A-Z]\d{12}$/:d.licence_province==='ON'?/^[A-Z]\d{14}$/:/$a/).test(number))fail(400,'Check the licence number: Québec uses one letter and 12 digits; Ontario uses one letter and 14 digits.');
 const row={user_id:id,id:crypto.randomUUID(),province:d.licence_province},now=Date.now(),iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(row)},await keyFor(env),new TextEncoder().encode(number));
 await db.run("INSERT INTO licence_submissions(user_id,id,province,ciphertext,iv,consented_at,submitted_at,expires_at,status) VALUES(?,?,?,?,?,?,?,?,'pending') ON CONFLICT(user_id) DO UPDATE SET id=excluded.id,province=excluded.province,ciphertext=excluded.ciphertext,iv=excluded.iv,consented_at=excluded.consented_at,submitted_at=excluded.submitted_at,expires_at=excluded.expires_at,status='pending'",id,row.id,row.province,encode(encrypted),encode(iv),now,now,now+30*86400000);
 await audit(db,row,user,'submitted');return {refresh:true};
 }
 const row=await db.get('SELECT * FROM licence_submissions WHERE user_id=?',id);if(!row)fail(404,'No licence submission found.');
 if(path.endsWith('/delete')){await audit(db,row,user,admin?'operator_deleted':'withdrawn');await db.run("UPDATE licence_submissions SET ciphertext=NULL,iv=NULL,status=? WHERE user_id=? AND id=?",admin?'deleted':'withdrawn',id,row.id);return {refresh:true}}
 if(!row.ciphertext||row.status!=='pending'||row.expires_at<=Date.now()){await expireLicences(db);fail(410,'This licence number is no longer available. Ask the driver to resubmit if needed.');}
 if(!d.eligibility_consent_at)fail(403,'The driver has not authorised this check.');
 if(b.purpose!=='authority_check'||b.confirmed!==true)fail(400,'Confirm use of the appropriate authorised issuing-authority service.');
 let unlockedUntil=0;const passwordProvided=typeof b.password==='string'&&b.password.length>0;
 if(passwordProvided)unlockedUntil=await unlock();else{const session=await currentSession();unlockedUntil=session?.licence_unlocked_until||0;if(unlockedUntil<=Date.now())fail(403,'Your licence review session is locked or expired. Unlock it again to continue.');}
 let number;try{number=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(row.iv),additionalData:aad(row)},await keyFor(env),decode(row.ciphertext)))}catch{fail(503,'This submission cannot be opened. Check encryption-key configuration.');}
 if(!await db.get("SELECT s.id FROM licence_submissions s JOIN driver_checks d ON d.user_id=s.user_id WHERE s.user_id=? AND s.id=? AND s.status='pending' AND s.ciphertext IS NOT NULL AND s.expires_at>? AND d.eligibility_consent_at IS NOT NULL",id,row.id,Date.now()))fail(409,'This submission changed or was withdrawn. Reload the driver review.');
 if(!passwordProvided){const session=await currentSession();if(!session||session.licence_unlocked_until<=Date.now())fail(403,'Your licence review session is locked or expired.');}
 await audit(db,row,user,'revealed_for_authority_check');
 return {number,submissionId:row.id,hideAfterSeconds:60,unlockedUntil};
}
