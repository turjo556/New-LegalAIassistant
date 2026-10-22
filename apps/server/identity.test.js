import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from './index.js';
import {testDatabase} from '../../scripts/test-driver-fixture.mjs';
const realFetch=globalThis.fetch;
test('Stripe identity is server retrieved, private, idempotent, and separate from audited driver approval',async t=>{
 const dbPath=testDatabase(t);const env={STRIPE_SECRET_KEY:'sk_live_fixture',RIDELY_PUBLIC_URL:'https://ridely.ca',RIDELY_ADMIN_EMAIL:'operator@example.com'};
 const server=createApp({dbPath,env});await new Promise(r=>server.listen(0,'127.0.0.1',r));const db=new DatabaseSync(dbPath),base='http://127.0.0.1:'+server.address().port,cookies={};let stripeUser,status='requires_input',creates=0,foreign=false,live=true;const calls=[];
 globalThis.fetch=async(url,opts)=>{if(String(url).startsWith(base))return realFetch(url,opts);assert.ok(String(url).startsWith('https://api.stripe.com/v1/identity/verification_sessions'));calls.push({url:String(url),opts});if(opts.method==='POST'){creates++;const body=new URLSearchParams(opts.body);stripeUser=body.get('metadata[ridely_user_id]');assert.equal(body.get('options[document][allowed_types][]'),'driving_license');assert.equal(body.get('options[document][require_matching_selfie]'),'true');assert.equal(body.get('options[document][require_live_capture]'),'true');assert.equal(body.get('return_url'),'https://ridely.ca/?driver-verification=return');assert.ok(opts.headers['Idempotency-Key'])}return Response.json({id:'vs_fixture',type:'document',livemode:live,status,metadata:{ridely_user_id:foreign?'someone-else':stripeUser},url:'https://verify.stripe.com/start/fixture'})};
 async function req(path,b,who='driver',expected=200){const r=await realFetch(base+'/api/'+path,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookies[who]||''},body:b?JSON.stringify(b):undefined});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));if(r.headers.get('set-cookie'))cookies[who]=r.headers.get('set-cookie').split(';')[0];return data}
 try{
 await req('driver/enrol',{},'guest',401);
 for(const name of ['driver','rider','operator'])await req('register',{name,email:name+'@example.com',password:'identity-test-password'},name);
 const driver=db.prepare("SELECT id FROM users WHERE email='driver@example.com'").get();
 await req('driver/identity/start',{consent:true},'driver',403);assert.equal(calls.length,0);
 db.prepare('UPDATE users SET email_verified=1').run();
 await req('driver/identity/start',{},'driver',400);
 const link=await req('driver/identity/start',{consent:true});assert.match(link.url,/^https:\/\/verify.stripe.com/);assert.equal(creates,1);
 await req('driver/identity/start',{consent:true});assert.equal(creates,1);
 await req('driver/identity/refresh',{status:'verified',sessionId:'vs_forged'});assert.equal((await req('state')).driverVerification.identity,'requires_input');
 const rideData={from:'Montréal',to:'Ottawa',date:'2099-11-06',time:'09:00',arrival:'12:00',price:30,seats:4,car:'Toyota',pickup:'Main station',destination:'City station'};
 const ride=(await req('rides',rideData,'driver',201)).hosting[0];assert.equal(ride.bookable,false);
 await req('bookings',{rideId:ride.id,seats:1},'rider',403);
 status='verified';foreign=true;await req('driver/identity/refresh',{},'driver',502);assert.equal((await req('state')).driverVerification.identity,'requires_input');foreign=false;live=false;await req('driver/identity/refresh',{},'driver',502);live=true;
 await req('driver/identity/refresh',{});assert.equal((await req('state')).driverVerification.identity,'verified');
 await req('bookings',{rideId:ride.id,seats:1},'rider',403);
 const review={id:driver.id,licence:'approved',insurance:'approved',licenceExpires:'2099-12-31',insuranceExpires:'2099-12-31',vehicle:'Toyota',evidence:'secure-case-123',confirmed:true};
 await req('admin/driver-review',review,'driver',403);await req('admin/drivers',{},'rider',403);
 await req('admin/driver-review',{...review,confirmed:false},'operator',400);await req('admin/driver-review',{...review,licenceExpires:'2099-02-30'},'operator',400);
 await req('admin/driver-review',review,'operator');assert.equal(db.prepare('SELECT COUNT(*) n FROM driver_review_log').get().n,1);
 assert.equal((await req('state')).hosting[0].bookable,true);
 await req('bookings',{rideId:ride.id,seats:1},'rider',201);
 const publicState=await req('state',null,'guest');assert.equal(publicState.rides[0].identityVerified,true);assert.ok(!JSON.stringify(publicState).includes('vs_fixture'));assert.ok(!JSON.stringify(publicState).includes('secure-case-123'));
 await req('admin/driver-review',{...review,insurance:'rejected'},'operator');assert.equal((await req('state')).hosting[0].bookable,false);
 await req('bookings/cancel',{id:(await req('state',null,'rider')).bookings[0].id},'rider');await req('bookings',{rideId:ride.id,seats:1},'rider',403);
 assert.throws(()=>db.prepare('INSERT INTO bookings(id,user_id,ride_id,seats,total) VALUES(?,?,?,?,?)').run('bypass',driver.id,ride.id,1,3000),/driver_not_approved/);
 await req('admin/driver-review',review,'operator');db.prepare('UPDATE driver_checks SET reviewed_at=0').run();await req('bookings',{rideId:ride.id,seats:1},'rider',403);
 await req('admin/driver-review',{...review,insuranceExpires:'2099-11-05'},'operator');await req('bookings',{rideId:ride.id,seats:1},'rider',403);
 await req('admin/driver-review',{...review,vehicle:'Honda'},'operator');await req('bookings',{rideId:ride.id,seats:1},'rider',403);
 }finally{globalThis.fetch=realFetch;await new Promise(r=>server.close(r));db.close()}
});
test('missing Identity setup leaves checks unavailable and rejects client approval flags',async t=>{
 const server=createApp({dbPath:testDatabase(t),env:{}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{const r=await realFetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Driver',email:'driver@example.com',password:'identity-test-password',identityVerified:true})});const data=await r.json();assert.equal(data.driverVerification.available,false);assert.equal(data.driverVerification.approved,false);const v=await realFetch(base+'/api/driver/identity/start',{method:'POST',headers:{'Content-Type':'application/json',Cookie:r.headers.get('set-cookie').split(';')[0]},body:JSON.stringify({consent:true,verified:true})});assert.equal(v.status,503)}finally{await new Promise(r=>server.close(r))}
});

test('a successful Stripe test session cannot unlock live bookings',async t=>{
 const {driverApi,driverBookable}=await import('../../packages/core/driver-verification.js');
 const dbPath=testDatabase(t),server=createApp({dbPath,env:{}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const db=new DatabaseSync(dbPath);
 try{db.prepare('INSERT INTO users(id,name,email,password,email_verified) VALUES(?,?,?,?,1)').run('driver-test','Driver','test@example.com','unused');db.prepare("INSERT INTO driver_checks(user_id,attempt,session_id,licence_status,insurance_status,licence_expires,insurance_expires,vehicle,reviewed_at) VALUES('driver-test','attempt','vs_test','approved','approved','2099-12-31','2099-12-31','Toyota',?)").run(Date.now());const user=db.prepare("SELECT * FROM users WHERE id='driver-test'").get();const adapter={get:async(sql,...a)=>db.prepare(sql).get(...a),run:async(sql,...a)=>db.prepare(sql).run(...a)};
 globalThis.fetch=async()=>Response.json({id:'vs_test',type:'document',livemode:false,status:'verified',metadata:{ridely_user_id:user.id}});
 await driverApi('/api/driver/identity/refresh',{},user,adapter,{STRIPE_SECRET_KEY:'sk_test_fixture',RIDELY_PUBLIC_URL:'https://ridely.ca'});
 const checks=db.prepare('SELECT * FROM driver_checks WHERE user_id=?').get(user.id);assert.equal(checks.identity_status,'test_verified');assert.equal(driverBookable(checks,'2099-11-06','Toyota'),false);
 }finally{globalThis.fetch=realFetch;await new Promise(r=>server.close(r));db.close()}
});
