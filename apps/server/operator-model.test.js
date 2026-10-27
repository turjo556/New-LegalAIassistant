import test from 'node:test';
import assert from 'node:assert/strict';
import {driverReviewState,filterDrivers,filterCases} from '../web/src/operator-model.js';
const now=Date.now(),current={id:'a',name:'Alice',email:'alice@example.com',identity_status:'verified',eligibility_consent_at:now,licence_status:'approved',insurance_status:'approved',licence_province:'QC',authority_source:'saaq',authority_checked_at:now-1000,reviewed_at:now,licence_class_confirmed:1,restrictions_confirmed:1,licence_expires:'2099-01-01',insurance_expires:'2099-01-01'};
test('operator queue distinguishes missing, sandbox and expired checks without granting approval',()=>{
 assert.equal(driverReviewState(current,now).key,'current');
 for(const patch of [{insurance_expires:null},{licence_expires:'2000-01-01'},{authority_checked_at:now+1000},{reviewed_at:now-31*86400000},{authority_source:'ontario'},{restrictions_confirmed:0}])assert.equal(driverReviewState({...current,...patch},now).key,'renewal');
 assert.equal(driverReviewState({...current,identity_status:'test_verified'},now).key,'identity');
 assert.equal(driverReviewState({...current,eligibility_consent_at:null},now).key,'consent');
 assert.equal(driverReviewState({...current,licence_status:'rejected'},now).key,'rejected');
});
test('operator search filters queues and prioritises urgent reports',()=>{
 const pending={...current,id:'b',name:'Bob',email:'bob@example.com',insurance_status:'pending',proposedVehicle:'Honda'};
 assert.deepEqual(filterDrivers([current,pending],'','attention',now).map(d=>d.id),['b']);
 assert.deepEqual(filterDrivers([current,pending],'honda','all',now).map(d=>d.id),['b']);
 assert.equal(filterDrivers([current,pending],'alice','review',now).length,0);
 const rows=[{id:'a',status:'open',created:20,urgent:0,body:'Late pickup'},{id:'b',status:'open',created:10,urgent:1,reason:'Safety'},{id:'c',status:'resolved',created:30}];
 assert.deepEqual(filterCases(rows).map(r=>r.id),['b','a']);assert.deepEqual(filterCases(rows,'pickup').map(r=>r.id),['a']);assert.equal(filterCases(rows,'','resolved')[0].id,'c');
});
