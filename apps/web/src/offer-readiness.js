// Mirror the publish preconditions that depend on the current form. The server
// remains authoritative and rechecks approval, expiry and vehicle at submit time.
export function offerReadiness(user,verification,form){
 if(!user?.emailVerified)return {ready:false,reason:'Confirm your email before publishing this ride.'};
 if(!verification?.approved)return {ready:false,reason:'Complete your driver checks before publishing this ride.'};
 const vehicle=String(form?.car||'').trim();
 if(!vehicle||vehicle!==String(verification.vehicle||'').trim())return {ready:false,reason:'This vehicle needs an insurance review before you can publish it.'};
 const date=form?.date;
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!verification.licenceExpires||!verification.insuranceExpires||date>verification.licenceExpires||date>verification.insuranceExpires)return {ready:false,reason:'Your licence and insurance checks must cover the selected trip date.'};
 return {ready:true,reason:''};
}
