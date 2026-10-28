const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export async function saveRideEdit(db,user,b,values,now){
 const ride=await db.get('SELECT id,edit_version,cancelled,completed_at,date,time FROM rides WHERE id=? AND owner=?',String(b.id||''),user.id);
 if(!ride)fail(404,'Listing not found.');
 if(ride.cancelled||ride.completed_at||ride.date+'T'+ride.time<=now)fail(409,'Only upcoming active rides can be edited.');
 if(!Number.isSafeInteger(b.editVersion)||b.editVersion!==ride.edit_version)fail(409,'This ride has changed. Reopen the editor before saving.');
 const fields=['origin','destination_city','date','time','arrival','price','capacity','car','pickup','destination','custom_limit','pickup_lat','pickup_lng','pickup_fee','allow_pickup','allow_dropoff','dropoff_lat','dropoff_lng','dropoff_fee','luggage','vehicle_notes','cancellation_policy','licence_plate','plate_province','vehicle_color'];
 const result=await db.run(`UPDATE rides SET ${fields.map(k=>k+'=?').join(',')},edit_version=edit_version+1 WHERE id=? AND owner=? AND edit_version=? AND cancelled=0 AND completed_at IS NULL AND date||'T'||time>? AND NOT EXISTS(SELECT 1 FROM bookings WHERE ride_id=rides.id AND cancelled=0)`,...values,ride.id,user.id,b.editVersion,now);
 if(!(result.changes??result.meta?.changes))fail(409,'This ride changed or now has booked seats. Refresh your listings. Contact support to change a ride with passengers.');
 return true;
}
