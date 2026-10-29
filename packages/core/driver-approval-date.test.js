import test from 'node:test';
import assert from 'node:assert/strict';
import {driverState} from './driver-verification.js';
test('driver account approval uses Eastern expiry day, not the next UTC day',async t=>{
 const now=Date.parse('2026-10-29T01:00:00Z');t.mock.timers.enable({apis:['Date'],now});
 const d={eligibility_consent_at:now-1000,licence_province:'QC',authority_source:'saaq',authority_checked_at:now-1000,licence_class_confirmed:1,restrictions_confirmed:1,identity_status:'verified',licence_status:'approved',insurance_status:'approved',licence_expires:'2026-10-28',insurance_expires:'2026-10-28',vehicle:'Toyota',reviewed_at:now-1000};
 const db={get:async sql=>sql.includes('FROM driver_checks')?d:null,run:async()=>({changes:0})};
 assert.equal((await driverState(db,{id:'driver'},{})).approved,true);
 t.mock.timers.tick(4*3600000);assert.equal((await driverState(db,{id:'driver'},{})).approved,false);
});
