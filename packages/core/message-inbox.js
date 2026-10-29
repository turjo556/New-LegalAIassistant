const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const messageNotice='You have a new private booking message.';
const empty=()=>({unread:0,threads:[]});
export async function messageInbox(db,user){
 if(!user)return empty();
 const total=await db.get(`SELECT COUNT(*) AS unread FROM messages m JOIN bookings b ON b.id=m.booking_id JOIN rides r ON r.id=b.ride_id LEFT JOIN message_reads seen ON seen.user_id=? AND seen.booking_id=b.id WHERE (b.user_id=? OR r.owner=?) AND m.sender<>? AND m.rowid>COALESCE(seen.last_read_rowid,0)`,user.id,user.id,user.id,user.id);
 const rows=await db.all(`SELECT b.id AS bookingId,b.ride_id AS rideId,r.origin AS "from",r.destination_city AS "to",r.date,CASE WHEN r.owner=? THEN 'driver' ELSE 'passenger' END AS role,CASE WHEN b.cancelled=1 OR r.cancelled=1 THEN 1 ELSE 0 END AS cancelled,
 (SELECT COUNT(*) FROM messages m WHERE m.booking_id=b.id AND m.sender<>? AND m.rowid>COALESCE(seen.last_read_rowid,0)) AS unread,
 (SELECT MAX(m.created) FROM messages m WHERE m.booking_id=b.id) AS lastMessageAt
 FROM bookings b JOIN rides r ON r.id=b.ride_id LEFT JOIN message_reads seen ON seen.user_id=? AND seen.booking_id=b.id WHERE b.user_id=? OR r.owner=? ORDER BY lastMessageAt DESC,r.date DESC,b.id LIMIT 100`,user.id,user.id,user.id,user.id,user.id);
 return {unread:Number(total?.unread)||0,threads:rows.map(row=>({...row,cancelled:!!row.cancelled,unread:Number(row.unread)||0}))};
}
export async function readMessages(db,user,bookingId){
 if(!user)fail(401,'Sign in to read messages.');
 const id=String(bookingId||'');
 const booking=await db.get('SELECT b.id FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE b.id=? AND (b.user_id=? OR r.owner=?)',id,user.id,user.id);
 if(!booking)fail(404,'Booking not found.');
 // Read the newest page, then display it chronologically. The watermark is only
 // the maximum sequence actually returned, so a concurrent new message remains unread.
 const rows=await db.all(`SELECT * FROM (SELECT m.rowid AS _sequence,m.id,m.body,m.created,u.name AS sender FROM messages m JOIN users u ON u.id=m.sender WHERE m.booking_id=? ORDER BY m.rowid DESC LIMIT 500) ORDER BY created,_sequence`,id);
 const last=rows.reduce((max,row)=>Math.max(max,row._sequence),0);
 if(last)await db.run(`INSERT INTO message_reads(user_id,booking_id,last_read_rowid,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,booking_id) DO UPDATE SET last_read_rowid=MAX(message_reads.last_read_rowid,excluded.last_read_rowid),updated_at=excluded.updated_at`,user.id,id,last,Date.now());
 // Clear only message notices, and only if the account currently has no unread
 // incoming messages. An atomic condition protects messages arriving during this read.
 await db.run(`UPDATE notifications SET read_at=? WHERE user_id=? AND title=? AND read_at IS NULL AND NOT EXISTS(SELECT 1 FROM messages m JOIN bookings b ON b.id=m.booking_id JOIN rides r ON r.id=b.ride_id LEFT JOIN message_reads seen ON seen.user_id=? AND seen.booking_id=b.id WHERE (b.user_id=? OR r.owner=?) AND m.sender<>? AND m.rowid>COALESCE(seen.last_read_rowid,0))`,Date.now(),user.id,messageNotice,user.id,user.id,user.id,user.id);
 return rows.map(({_sequence,...message})=>message);
}
