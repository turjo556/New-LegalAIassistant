import test from 'node:test';
import assert from 'node:assert/strict';
import {offerReadiness} from '../web/src/offer-readiness.js';
const user={emailVerified:true},verification={approved:true,vehicle:'Toyota Corolla',licenceExpires:'2099-11-10',insuranceExpires:'2099-11-08'},form={car:'Toyota Corolla',date:'2099-11-06'};
test('offer readiness requires approved matching vehicle and coverage through selected trip date',()=>{
 assert.equal(offerReadiness(user,verification,form).ready,true);
 assert.equal(offerReadiness(user,verification,{...form,car:' Toyota Corolla '}).ready,true);
 assert.equal(offerReadiness(user,verification,{...form,car:'Honda Civic'}).ready,false);
 assert.match(offerReadiness(user,verification,{...form,car:'Honda Civic'}).reason,/vehicle needs an insurance review/);
 assert.equal(offerReadiness(user,verification,{...form,date:'2099-11-08'}).ready,true);
 assert.equal(offerReadiness(user,verification,{...form,date:'2099-11-09'}).ready,false);
 assert.equal(offerReadiness(user,{...verification,licenceExpires:'2099-11-05'},form).ready,false);
});
test('offer readiness never permits missing approval, email, expiry or selected trip details',()=>{
 for(const [u,v,f] of [[null,verification,form],[{emailVerified:false},verification,form],[user,null,form],[user,{...verification,approved:false},form],[user,{...verification,insuranceExpires:null},form],[user,verification,{...form,date:''}],[user,verification,{...form,car:''}]])assert.equal(offerReadiness(u,v,f).ready,false);
});
