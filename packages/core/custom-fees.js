export const customStopFees=Object.freeze([5,6,7,8,9,10]);
export const validCustomFeeCents=value=>Number.isSafeInteger(value)&&value>=500&&value<=1000&&value%100===0;
export function customFeeCents(value){if(typeof value!=='number'||!customStopFees.includes(value))throw Object.assign(new Error('Custom pickup and drop-off fees must be $5–$10 CAD per option, per passenger, in $1 increments.'),{status:400});return value*100}
export async function updateCustomFees(path,b,user,db){
 if(path!=='/api/rides/custom-fees')return false;
 const ride=await db.get('SELECT * FROM rides WHERE id=? AND owner=? AND cancelled=0 AND completed_at IS NULL',String(b.id||''),user.id);
 if(!ride)throw Object.assign(new Error('Active listing not found.'),{status:404});
 const pickup=ride.allow_pickup?customFeeCents(b.pickupFee):ride.pickup_fee,dropoff=ride.allow_dropoff?customFeeCents(b.dropoffFee):ride.dropoff_fee;
 const result=await db.run('UPDATE rides SET pickup_fee=?,dropoff_fee=? WHERE id=? AND owner=? AND cancelled=0 AND completed_at IS NULL',pickup,dropoff,ride.id,user.id);
 if(!(result.changes??result.meta?.changes))throw Object.assign(new Error('The listing changed. Refresh before continuing.'),{status:409});return true;
}
