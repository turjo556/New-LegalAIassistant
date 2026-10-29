const WINDOW=14*86400000;
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export const reviewCriteria={driver:['punctuality','communication','respect','driving'],passenger:['punctuality','communication','respect','preparedness']};
const round=n=>Math.round(n*100)/100;
const ratings=row=>({punctuality:row.punctuality,communication:row.communication,respect:row.respect,[row.target_role==='driver'?'driving':'preparedness']:row.specific});
const overall=row=>round((row.punctuality+row.communication+row.respect+row.specific)/4);
export async function maintainReviews(db,now=Date.now()){
 // One update publishes a pair together. The trigger inserts each recipient's
 // notice exactly once; repeated state requests do not duplicate notifications.
 await db.run(`UPDATE trip_reviews SET published_at=? WHERE published_at IS NULL
 AND EXISTS(SELECT 1 FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE b.id=trip_reviews.booking_id AND b.cancelled=0 AND r.cancelled=0 AND r.completed_at IS NOT NULL AND b.passenger_completed_at IS NOT NULL)
 AND (deadline<=? OR EXISTS(SELECT 1 FROM trip_reviews other WHERE other.booking_id=trip_reviews.booking_id AND other.reviewer_id=trip_reviews.target_id AND other.target_id=trip_reviews.reviewer_id))`,now,now);
}
const active=`b.cancelled=0 AND r.cancelled=0 AND r.completed_at IS NOT NULL AND b.passenger_completed_at IS NOT NULL`;
export async function reviewSummary(db,userId,role){
 if(!userId||!['driver','passenger'].includes(role))return {average:null,count:0,criteria:{}};
 const row=await db.get(`SELECT COUNT(*) AS count,AVG((q.punctuality+q.communication+q.respect+q.specific)/4.0) AS average,AVG(q.punctuality) AS punctuality,AVG(q.communication) AS communication,AVG(q.respect) AS respect,AVG(q.specific) AS specific FROM trip_reviews q JOIN bookings b ON b.id=q.booking_id JOIN rides r ON r.id=b.ride_id WHERE q.target_id=? AND q.target_role=? AND q.published_at IS NOT NULL AND ${active}`,userId,role);
 if(!row?.count)return {average:null,count:0,criteria:{}};
 return {average:round(row.average),count:row.count,criteria:Object.fromEntries(Object.entries(ratings({...row,target_role:role})).map(([key,value])=>[key,round(value)]))};
}
// Internal batch index for state serializers. Callers attach only an individual
// summary to an already-authorised ride or passenger; never serialize this map.
export async function reviewSummaryIndex(db){
 const rows=await db.all(`SELECT q.target_id,q.target_role,COUNT(*) AS count,AVG((q.punctuality+q.communication+q.respect+q.specific)/4.0) AS average,AVG(q.punctuality) AS punctuality,AVG(q.communication) AS communication,AVG(q.respect) AS respect,AVG(q.specific) AS specific FROM trip_reviews q JOIN bookings b ON b.id=q.booking_id JOIN rides r ON r.id=b.ride_id WHERE q.published_at IS NOT NULL AND ${active} GROUP BY q.target_id,q.target_role`);
 return Object.fromEntries(rows.map(row=>[row.target_id+':'+row.target_role,{average:round(row.average),count:row.count,criteria:Object.fromEntries(Object.entries(ratings(row)).map(([key,value])=>[key,round(value)]))}]));
}
export async function reviewState(db,user){
 const now=Date.now();await maintainReviews(db,now);
 if(!user)return {summary:{asDriver:{average:null,count:0,criteria:{}},asPassenger:{average:null,count:0,criteria:{}}},opportunities:[],received:[]};
 const aggregates=await db.all(`SELECT q.target_role,COUNT(*) AS count,AVG((q.punctuality+q.communication+q.respect+q.specific)/4.0) AS average,AVG(q.punctuality) AS punctuality,AVG(q.communication) AS communication,AVG(q.respect) AS respect,AVG(q.specific) AS specific FROM trip_reviews q JOIN bookings b ON b.id=q.booking_id JOIN rides r ON r.id=b.ride_id WHERE q.target_id=? AND q.published_at IS NOT NULL AND ${active} GROUP BY q.target_role`,user.id);
 const summary={asDriver:{average:null,count:0,criteria:{}},asPassenger:{average:null,count:0,criteria:{}}};
 for(const a of aggregates)summary[a.target_role==='driver'?'asDriver':'asPassenger']={average:round(a.average),count:a.count,criteria:Object.fromEntries(Object.entries(ratings(a)).map(([key,value])=>[key,round(value)]))};
 const rows=await db.all(`SELECT b.id AS bookingId,b.ride_id AS rideId,r.origin AS "from",r.destination_city AS "to",r.date,r.owner,b.user_id,r.completed_at,b.passenger_completed_at,q.id AS review_id,q.target_role,q.punctuality,q.communication,q.respect,q.specific,q.comment,q.created,q.deadline,q.published_at FROM bookings b JOIN rides r ON r.id=b.ride_id LEFT JOIN trip_reviews q ON q.booking_id=b.id AND q.reviewer_id=? WHERE (b.user_id=? OR r.owner=?) AND b.user_id<>r.owner AND ${active} AND (q.id IS NOT NULL OR MAX(r.completed_at,b.passenger_completed_at)+?>?) ORDER BY r.date DESC,b.id LIMIT 100`,user.id,user.id,user.id,WINDOW,now);
 const opportunities=rows.map(row=>{const role=row.owner===user.id?'driver':'passenger';const deadline=row.deadline||Math.max(row.completed_at,row.passenger_completed_at)+WINDOW;return {bookingId:row.bookingId,rideId:row.rideId,from:row.from,to:row.to,date:row.date,role,targetRole:role==='driver'?'passenger':'driver',submitted:!!row.review_id,deadline,ownReview:row.review_id?{overall:overall(row),ratings:ratings(row),comment:row.comment,created:row.created,published:row.published_at!==null}:null}});
 const published=await db.all(`SELECT q.id,q.target_role,q.punctuality,q.communication,q.respect,q.specific,q.comment,q.created,q.published_at FROM trip_reviews q JOIN bookings b ON b.id=q.booking_id JOIN rides r ON r.id=b.ride_id WHERE q.target_id=? AND q.published_at IS NOT NULL AND ${active} ORDER BY q.published_at DESC,q.id LIMIT 50`,user.id);
 return {summary,opportunities,received:published.map(row=>({id:row.id,role:row.target_role,overall:overall(row),ratings:ratings(row),comment:row.comment,created:row.created,publishedAt:row.published_at}))};
}
export async function reviewApi(path,b,user,db){
 if(path!=='/api/reviews/submit')return null;
 if(!user)fail(401,'Sign in to review a trip.');
 if(!user.email_verified)fail(403,'Confirm your email before reviewing a trip.');
 const item=await db.get(`SELECT b.id,b.user_id,b.cancelled AS booking_cancelled,b.passenger_completed_at,r.owner,r.cancelled,r.completed_at FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE b.id=?`,String(b.bookingId||''));
 if(!item||![item.user_id,item.owner].includes(user.id)||item.user_id===item.owner)fail(404,'Completed booking not found.');
 if(item.booking_cancelled||item.cancelled||!item.completed_at||!item.passenger_completed_at)fail(409,'Both travellers must confirm the completed trip before reviewing it.');
 const now=Date.now(),deadline=Math.max(item.completed_at,item.passenger_completed_at)+WINDOW;
 if(now>=deadline)fail(409,'The 14-day review window has closed.');
 const targetRole=user.id===item.user_id?'driver':'passenger',targetId=targetRole==='driver'?item.owner:item.user_id,keys=reviewCriteria[targetRole],scores=b.ratings;
 if(!scores||typeof scores!=='object'||Array.isArray(scores)||Object.keys(scores).length!==4||!keys.every(key=>Number.isInteger(scores[key])&&scores[key]>=1&&scores[key]<=5))fail(400,'Rate each criterion from 1 to 5 stars.');
 if(b.comment!==undefined&&typeof b.comment!=='string')fail(400,'Enter an optional review of up to 500 characters.');
 const comment=(b.comment||'').trim();if(comment.length>500)fail(400,'Enter an optional review of up to 500 characters.');
 if(await db.get('SELECT id FROM trip_reviews WHERE booking_id=? AND reviewer_id=?',item.id,user.id))fail(409,'You already reviewed this booking.');
 try{
 const result=await db.run(`INSERT INTO trip_reviews(id,booking_id,reviewer_id,target_id,target_role,punctuality,communication,respect,specific,comment,created,deadline)
 SELECT ?,?,?,?,?,?,?,?,?,?,?,? FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE b.id=? AND ${active} AND r.completed_at=? AND b.passenger_completed_at=?`,crypto.randomUUID(),item.id,user.id,targetId,targetRole,scores.punctuality,scores.communication,scores.respect,scores[keys[3]],comment,now,deadline,item.id,item.completed_at,item.passenger_completed_at);
 if(!(result.changes??result.meta?.changes))fail(409,'This booking changed. Refresh before reviewing it.');
 }catch(e){if(String(e).includes('UNIQUE'))fail(409,'You already reviewed this booking.');throw e}
 await maintainReviews(db,now);return {refresh:true};
}
