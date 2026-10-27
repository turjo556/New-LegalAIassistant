import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createApp} from './index.js';
import stage,{testEnvironment,TEST_MARKER} from '../worker/mobile-test.js';
import {testConfig,fixtureSql} from '../../scripts/mobile-test-setup.mjs';
import {testDatabase} from '../../scripts/test-driver-fixture.mjs';
const production=JSON.parse(readFileSync(new URL('../../wrangler.json',import.meta.url)));
test('isolated mobile config cannot target the production database or inherit production routes/providers',()=>{
 assert.throws(()=>testConfig(production.d1_databases[0].database_id,production),/live database/);
 assert.throws(()=>testConfig('bad',production),/live database/);
 const c=testConfig('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',production);assert.equal(c.name,'ridely-app-test');assert.equal(c.routes,undefined);assert.deepEqual(c.triggers.crons,[]);assert.equal(c.main,'../apps/worker/mobile-test.js');
 const e=testEnvironment({DB:'db',STRIPE_SECRET_KEY:'live',RESEND_API_KEY:'live',TWILIO_AUTH_TOKEN:'live',CREDITS_PAYMENTS_ENABLED:'true',RIDELY_ADMIN_EMAIL:'owner@example.com'},'https://stage.example');
 assert.equal(e.STRIPE_SECRET_KEY,undefined);assert.equal(e.RESEND_API_KEY,undefined);assert.equal(e.TWILIO_AUTH_TOKEN,undefined);assert.equal(e.RIDELY_ADMIN_EMAIL,undefined);assert.equal(e.CREDITS_PAYMENTS_ENABLED,'false');
});
test('isolated worker uses synthetic accounts, preserves credits/session, and blocks real providers and signups',async t=>{
 const dbPath=testDatabase(t);const server=createApp({dbPath});const db=new DatabaseSync(dbPath);t.after(()=>db.close());
 const DB={prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){const result=db.prepare(sql).run(...args);return {meta:{changes:result.changes}};}};}};
 const env={DB,RIDELY_TEST_ENVIRONMENT:TEST_MARKER,LICENCE_ENCRYPTION_KEY:randomBytes(32).toString('base64')};
 const req=(path,body,cookie)=>new Request('https://ridely-app-test.example.workers.dev/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 assert.equal((await stage.fetch(req('health'),env)).status,503);db.exec(`CREATE TABLE ridely_test_marker(label TEXT PRIMARY KEY); INSERT INTO ridely_test_marker VALUES('${TEST_MARKER}');`);
 const privateData={encryptionKey:env.LICENCE_ENCRYPTION_KEY,driverPassword:'driver-test-password-123',riderPassword:'rider-test-password-123'};db.exec(fixtureSql(privateData));
 const call=async(path,body,cookie)=>{const r=await stage.fetch(req(path,body,cookie),env);return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 assert.equal((await call('health')).data.environment,'isolated-test');assert.equal((await call('register',{name:'Real user',email:'real@example.com',password:'test-password'})).status,403);assert.equal((await call('login',{email:'real@example.com',password:'test-password'})).status,403);
 const driver=await call('login',{email:'driver@ridely.test',password:privateData.driverPassword});assert.equal(driver.status,200);assert.ok(driver.cookie);assert.equal(driver.data.testing.simulatedChecks,true);assert.equal(driver.data.driverVerification.approved,true);assert.equal(driver.data.capabilities.email,false);assert.equal(driver.data.capabilities.sms,false);assert.equal(driver.data.bookingCredits.balance,2);
 const posted=await call('rides',{from:'Montréal',to:'Ottawa',date:'2099-11-06',time:'09:00',arrival:'12:00',price:25,seats:4,car:'Toyota',vehicleColor:'Blue',licencePlate:'TEST123',plateProvince:'QC',pickupLocationId:'namur-burger-king',dropoffLocationId:'st-laurent-starbucks'},driver.cookie);assert.equal(posted.status,201);assert.equal(posted.data.testing.isolated,true);
 const rider=await call('login',{email:'rider@ridely.test',password:privateData.riderPassword});assert.equal(rider.status,200);assert.ok(rider.data.riderProfile.ready);
 const booked=await call('bookings',{rideId:posted.data.hosting[0].id,seats:1,pickupMode:'standard'},rider.cookie);assert.equal(booked.status,201);assert.equal(booked.data.bookingCredits.balance,2);assert.equal(booked.data.bookings.length,0);const accepted=await call('booking-requests/decision',{id:booked.data.seatRequests[0].id,decision:'accept',availabilityConfirmed:true},driver.cookie);assert.equal(accepted.status,200);assert.equal((await call('state',undefined,rider.cookie)).data.bookingCredits.balance,1);
 for(const path of ['verification/send','driver/identity/start','credits/checkout','driver/licence/submit','rider/profile/save','admin/driver-review'])assert.equal((await call(path,{},rider.cookie)).status,403,path);
 db.exec(fixtureSql(privateData));assert.equal((await call('state',undefined,rider.cookie)).data.bookingCredits.balance,1,'rerunning setup must not mint more welcome credits');
 // The production worker never reads or enables this test marker.
 assert.equal((await stage.fetch(req('health'),{...env,RIDELY_TEST_ENVIRONMENT:''})).status,503);
 void server;
});
