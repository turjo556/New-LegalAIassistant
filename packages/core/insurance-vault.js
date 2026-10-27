import jpeg from 'jpeg-js';
import {vaultAvailable} from './licence-vault.js';
import {serviceBudget} from './providers.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const encode=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)};
const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const aad=row=>new TextEncoder().encode('ridely-insurance-v1:'+row.user_id+':'+row.id+':'+row.vehicle);
async function key(env){if(!vaultAvailable(env))fail(503,'Secure insurance submission is awaiting activation.');return crypto.subtle.importKey('raw',decode(env.LICENCE_ENCRYPTION_KEY),'AES-GCM',false,['encrypt','decrypt'])}
export async function expireInsurance(db){await db.run("UPDATE insurance_submissions SET ciphertext=NULL,iv=NULL,status='expired' WHERE ciphertext IS NOT NULL AND expires_at<=?",Date.now())}
export async function insuranceMetadata(db,id){const row=await db.get('SELECT id,vehicle,page_count,submitted_at,expires_at,status FROM insurance_submissions WHERE user_id=?',id);return row?{id:row.id,vehicle:row.vehicle,pages:row.page_count,submittedAt:row.submitted_at,expiresAt:row.expires_at,status:row.status==='pending'&&row.expires_at<=Date.now()?'expired':row.status}:null}
async function audit(db,row,user,action){await db.run('INSERT INTO insurance_access_log VALUES(?,?,?,?,?,?)',crypto.randomUUID(),row.user_id,user.id,action,row.id,Date.now())}
function cleanPhoto(photo){if(typeof photo!=='string'||photo.length>270000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))fail(400,'Upload a readable JPEG insurance image under 200 KB per page.');try{const bytes=decode(photo.split(',')[1]);if(bytes.length>200000)fail(400,'Insurance image is too large.');const image=jpeg.decode(bytes,{useTArray:true,maxResolutionInMP:1.5,maxMemoryUsageInMB:48});if(image.width<100||image.height<100||image.width>1600||image.height>1600)fail(400,'Choose a clear insurance image between 100 and 1600 pixels on each side.');const clean=jpeg.encode({width:image.width,height:image.height,data:image.data},80).data;if(clean.length>200000)fail(400,'Insurance image is too large. Try a smaller image.');return 'data:image/jpeg;base64,'+encode(clean)}catch(e){if(e.status)throw e;fail(400,'This insurance image could not be read. Choose a JPG or PNG photo.')}}
export async function insuranceApi(path,b,user,db,env){
 if(!['/api/driver/insurance/submit','/api/driver/insurance/delete','/api/admin/insurance/reveal','/api/admin/insurance/delete'].includes(path))return null;
 if(!user)fail(401,'Sign in to continue.');if(!env.LICENCE_REQUEST_SECURE)fail(400,'Use HTTPS for insurance submissions and access.');if(!user.email_verified)fail(403,'Verify your email before submitting or reviewing insurance.');
 const admin=path.startsWith('/api/admin/');if(admin&&(!env.RIDELY_ADMIN_EMAIL||user.email!==env.RIDELY_ADMIN_EMAIL.toLowerCase()))fail(403,'Verified operator access is required.');
 const id=admin?b.id:user.id;if(typeof id!=='string'||id.length>80)fail(400,'Choose a driver.');if(admin&&id===user.id)fail(403,'You cannot review your own driver application.');
 await serviceBudget(db,'insurance:'+path+':'+user.id,admin?100:10,600000);await expireInsurance(db);
 const driver=await db.get('SELECT * FROM driver_checks WHERE user_id=?',id);if(!driver)fail(404,'Start driver setup before submitting insurance.');
 if(path.endsWith('/submit')){
 if(!vaultAvailable(env))fail(503,'Secure insurance submission is awaiting activation. No document has been saved.');
 if(!driver.eligibility_consent_at||b.consent!==true)fail(400,'Authorise the insurance review and private document submission first.');
 if(typeof b.vehicle!=='string'||b.vehicle.trim().length<2||b.vehicle.length>60)fail(400,'Enter the vehicle description exactly as listed in your ride.');
 if(!Array.isArray(b.pages)||b.pages.length<1||b.pages.length>2)fail(400,'Upload one insurance certificate image and, optionally, one coverage-confirmation image.');
 const pages=b.pages.map(cleanPhoto),row={id:crypto.randomUUID(),user_id:id,vehicle:b.vehicle.trim()},now=Date.now(),iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(row)},await key(env),new TextEncoder().encode(JSON.stringify(pages)));
 await db.run("INSERT INTO insurance_submissions VALUES(?,?,?,?,?,?,?,?,?,'pending') ON CONFLICT(user_id) DO UPDATE SET id=excluded.id,vehicle=excluded.vehicle,ciphertext=excluded.ciphertext,iv=excluded.iv,page_count=excluded.page_count,consented_at=excluded.consented_at,submitted_at=excluded.submitted_at,expires_at=excluded.expires_at,status='pending'",id,row.id,row.vehicle,encode(new Uint8Array(encrypted)),encode(iv),pages.length,now,now,now+30*86400000);
 await db.run("UPDATE driver_checks SET insurance_status='pending' WHERE user_id=?",id);await audit(db,row,user,'submitted');return {refresh:true};
 }
 const row=await db.get('SELECT * FROM insurance_submissions WHERE user_id=?',id);if(!row)fail(404,'No insurance document submitted.');
 if(path.endsWith('/delete')){await audit(db,row,user,admin?'operator_deleted':'withdrawn');await db.run("UPDATE insurance_submissions SET ciphertext=NULL,iv=NULL,status=? WHERE user_id=? AND id=?",admin?'deleted':'withdrawn',id,row.id);if(!admin)await db.run("UPDATE driver_checks SET insurance_status='pending' WHERE user_id=?",id);return {refresh:true}}
 if(b.purpose!=='insurance_review'||b.confirmed!==true||!driver.eligibility_consent_at)fail(400,'Confirm this access is for the authorised insurance review.');
 const session=()=>env.LICENCE_SESSION_TOKEN?db.get('SELECT expires FROM sessions WHERE token=? AND user_id=? AND expires>?',env.LICENCE_SESSION_TOKEN,user.id,Date.now()):null;
 if(!await session())fail(401,'Sign in to your operator account to review insurance.');if(row.status!=='pending'||!row.ciphertext||row.expires_at<=Date.now())fail(410,'This document is no longer available. Ask the driver to resubmit.');
 let pages;try{pages=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(row.iv),additionalData:aad(row)},await key(env),decode(row.ciphertext))))}catch{fail(503,'This insurance document cannot be opened. Check encryption-key configuration.')}
 if(!await db.get("SELECT s.id FROM insurance_submissions s JOIN driver_checks d ON d.user_id=s.user_id WHERE s.user_id=? AND s.id=? AND s.status='pending' AND s.ciphertext IS NOT NULL AND s.expires_at>? AND d.eligibility_consent_at IS NOT NULL",id,row.id,Date.now()))fail(409,'The document changed or was withdrawn. Reload this review.');if(!await session())fail(401,'Your login expired. Sign in again.');await audit(db,row,user,'revealed_for_insurance_review');return {pages,submissionId:row.id,vehicle:row.vehicle,hideAfterSeconds:60};
}
