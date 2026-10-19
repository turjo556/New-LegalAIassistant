import {randomBytes,randomUUID,timingSafeEqual,createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
async function passwordDigest(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);return Buffer.from(bits).toString('hex')}
function easternNow(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const get=k=>parts.find(p=>p.type===k).value;return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`}

export default {async fetch(req,env){
 const headers=new Headers({'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY'});
 const send=(status,data)=>new Response(JSON.stringify(data),{status,headers});
 const url=new URL(req.url);
 if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(req);
 if(!env.DB)return send(503,{error:'The database binding is not configured.'});
 const get=(sql,...args)=>env.DB.prepare(sql).bind(...args).first();
 const all=async(sql,...args)=>(await env.DB.prepare(sql).bind(...args).all()).results;
 const run=(sql,...args)=>env.DB.prepare(sql).bind(...args).run();
 function fail(status,message){throw Object.assign(new Error(message),{status})}
 function text(v,name,min=1,max=150){if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)fail(400,`Enter a valid ${name}.`);return v.trim()}
 function integer(v,min,max,name){if(!Number.isInteger(v)||v<min||v>max)fail(400,`Invalid ${name}.`);return v}
 const cities=['Montréal','Québec City','Ottawa','Toronto'];

 async function list(){return (await all(`SELECT r.*,u.name AS driver,r.capacity-COALESCE((SELECT SUM(b.seats) FROM bookings b WHERE b.ride_id=r.id AND b.cancelled=0),0) AS seats FROM rides r JOIN users u ON u.id=r.owner ORDER BY r.date,r.time`)).map(r=>({id:r.id,owner:r.owner,from:r.origin,to:r.destination_city,date:r.date,time:r.time,arrival:r.arrival,driver:r.driver,initials:r.driver.slice(0,2).toUpperCase(),price:r.price/100,seats:r.seats,capacity:r.capacity,car:r.car,pickup:r.pickup,destination:r.destination,home:false,tags:[],color:'sage',cancelled:!!r.cancelled}));}
 async function state(user){const rides=await list();const saved=user?(await all('SELECT ride_id FROM favorites WHERE user_id=?',user.id)).map(r=>r.ride_id):[];const bookings=user?(await all('SELECT * FROM bookings WHERE user_id=? AND cancelled=0',user.id)).map(b=>({id:b.id,seats:b.seats,total:b.total/100,mode:'meeting',ride:rides.find(r=>r.id===b.ride_id)})):[];const passengers=user?await all('SELECT b.id,b.seats,b.ride_id,u.name FROM bookings b JOIN rides r ON r.id=b.ride_id JOIN users u ON u.id=b.user_id WHERE r.owner=? AND b.cancelled=0',user.id):[];return {user:user?{id:user.id,name:user.name,email:user.email}:null,rides:rides.filter(r=>!r.cancelled),saved,bookings,hosting:user?rides.filter(r=>r.owner===user.id).map(r=>({...r,passengers:passengers.filter(p=>p.ride_id===r.id)})):[]};}
 try{
 if(req.method!=='GET'&&req.headers.get('Origin')&&new URL(req.headers.get('Origin')).origin!==url.origin)fail(403,'Request origin is not allowed.');
 const raw=(req.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('rmw_session='))?.slice(12);
 const user=raw?await get('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?',hash(raw),Date.now()):null;
 if(req.method==='GET'&&url.pathname==='/api/state'){return send(200,await state(user));}
 if(req.method==='GET'&&url.pathname==='/api/health'){return send(200,{status:'ok'});}
 if(req.method!=='POST')fail(405,'Method not allowed.');
 if(!req.headers.get('Content-Type')?.startsWith('application/json'))fail(415,'JSON required.');
 let body='';const reader=req.body?.getReader();if(reader){const decoder=new TextDecoder();while(true){const {value,done}=await reader.read();if(done)break;body+=decoder.decode(value,{stream:true});if(body.length>16000){await reader.cancel();fail(413,'Request too large.')}}}let b;try{b=JSON.parse(body||'{}')}catch{fail(400,'Invalid JSON.')}if(!b||typeof b!=='object'||Array.isArray(b))fail(400,'Invalid request.');
 if(['/api/register','/api/login'].includes(url.pathname)){
 const key=hash(req.headers.get('CF-Connecting-IP')||'local');const now=Date.now();await run('DELETE FROM auth_attempts WHERE expires<?',now);await run('INSERT INTO auth_attempts(key,attempts,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1',key,now+600000);const limit=await get('SELECT attempts FROM auth_attempts WHERE key=?',key);if(limit.attempts>40)fail(429,'Too many attempts. Try again in ten minutes.');
 const email=text(b.email,'email',3,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Enter a valid email.');const password=text(b.password,'password',10,128);let account;
 if(url.pathname==='/api/register'){const name=text(b.name,'name',2,50);if(await get('SELECT id FROM users WHERE email=?',email))fail(409,'An account already exists with that email.');const salt=randomBytes(16).toString('hex');const encoded=salt+':'+await passwordDigest(password,salt);const id=randomUUID();await run('INSERT INTO users VALUES(?,?,?,?)',id,name,email,encoded);account={id,name,email}}
 else{account=await get('SELECT * FROM users WHERE email=?',email);const [salt,digest]=(account?.password||'missing:'+await passwordDigest('dummy','missing')).split(':');const matches=timingSafeEqual(Buffer.from(await passwordDigest(password,salt),'hex'),Buffer.from(digest,'hex'));if(!account||!matches)fail(401,'Email or password is incorrect.');}
 const token=randomBytes(32).toString('hex');await run('DELETE FROM sessions WHERE expires<?',Date.now());await run('INSERT INTO sessions VALUES(?,?,?)',hash(token),account.id,Date.now()+7*86400000);headers.set('Set-Cookie',`rmw_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${url.protocol==='https:'?'; Secure':''}`);return send(200,await state(account));
 }
 if(url.pathname==='/api/logout'){if(raw)await run('DELETE FROM sessions WHERE token=?',hash(raw));headers.set('Set-Cookie',`rmw_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${url.protocol==='https:'?'; Secure':''}`);return send(200,await state(null));}
 if(!user)fail(401,'Sign in to continue.');
 if(url.pathname==='/api/messages'||url.pathname==='/api/messages/send'){
 const id=text(b.id,'booking');const booking=await get('SELECT b.*,r.owner,r.cancelled AS ride_cancelled FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE b.id=?',id);if(!booking||(booking.user_id!==user.id&&booking.owner!==user.id))fail(404,'Booking not found.');
 if(url.pathname.endsWith('/send')){if(booking.cancelled||booking.ride_cancelled)fail(400,'This trip is cancelled.');const message=text(b.message,'message',1,2000);await run('INSERT INTO messages VALUES(?,?,?,?,?)',randomUUID(),id,user.id,message,Date.now());}
 return send(200,{messages:await all('SELECT m.id,m.body,m.created,u.name AS sender FROM messages m JOIN users u ON u.id=m.sender WHERE m.booking_id=? ORDER BY m.created,m.rowid LIMIT 500',id)});
 }
 if(url.pathname==='/api/rides'){
 const from=text(b.from,'departure city'),to=text(b.to,'destination city');if(!cities.includes(from)||!cities.includes(to)||from===to)fail(400,'Choose two different supported cities.');
 const date=text(b.date,'date');const time=text(b.time,'departure time');const arrival=text(b.arrival,'arrival time');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(arrival)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)fail(400,'Enter valid trip dates and times.');if(date+'T'+time<=easternNow()||arrival<=time)fail(400,'Choose a future date and an arrival after departure (same day).');
 const cents=Math.round(Number(b.price)*100);integer(cents,500,50000,'price');const seats=integer(b.seats,1,4,'seat count');const car=text(b.car,'vehicle',2,60),pickup=text(b.pickup,'pickup point',3),destination=text(b.destination,'drop-off point',3);
 await run('INSERT INTO rides(id,owner,origin,destination_city,date,time,arrival,price,capacity,car,pickup,destination) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',randomUUID(),user.id,from,to,date,time,arrival,cents,seats,car,pickup,destination);return send(201,await state(user));
 }
 if(url.pathname==='/api/bookings'){
 const seats=integer(b.seats,1,4,'seat count');const ride=await get('SELECT * FROM rides WHERE id=?',text(b.rideId,'ride'));if(!ride||ride.cancelled)fail(404,'This ride is unavailable.');if(ride.owner===user.id)fail(400,'You cannot book your own ride.');if(ride.date+'T'+ride.time<=easternNow())fail(400,'This ride has departed.');if(b.mode&&b.mode!=='meeting')fail(400,'Home drop-off is not available yet.');
 const existing=await get('SELECT * FROM bookings WHERE user_id=? AND ride_id=?',user.id,ride.id);if(existing&&!existing.cancelled)fail(409,'You already booked this ride.');try{if(existing)await run('UPDATE bookings SET seats=?,total=?,cancelled=0 WHERE id=?',seats,seats*ride.price,existing.id);else await run('INSERT INTO bookings(id,user_id,ride_id,seats,total) VALUES(?,?,?,?,?)',randomUUID(),user.id,ride.id,seats,seats*ride.price)}catch(e){if(e.message.includes('capacity_exceeded'))fail(409,'Not enough seats left. Refresh and choose another ride.');if(e.message.includes('ride_unavailable'))fail(404,'This ride is unavailable.');if(e.message.includes('UNIQUE'))fail(409,'You already booked this ride.');throw e}
 return send(201,await state(user));
 }
 if(url.pathname==='/api/bookings/cancel'){const result=await run('UPDATE bookings SET cancelled=1 WHERE id=? AND user_id=? AND cancelled=0',text(b.id,'booking'),user.id);if(!result.meta.changes)fail(404,'Booking not found.');return send(200,await state(user));}
 if(url.pathname==='/api/rides/cancel'){const result=await run('UPDATE rides SET cancelled=1 WHERE id=? AND owner=? AND cancelled=0',text(b.id,'ride'),user.id);if(!result.meta.changes)fail(404,'Ride not found.');return send(200,await state(user));}
 if(url.pathname==='/api/favorites'){const id=text(b.id,'ride');if(!await get('SELECT id FROM rides WHERE id=? AND cancelled=0',id))fail(404,'Ride not found.');const exists=await get('SELECT 1 FROM favorites WHERE user_id=? AND ride_id=?',user.id,id);if(exists)await run('DELETE FROM favorites WHERE user_id=? AND ride_id=?',user.id,id);else await run('INSERT INTO favorites VALUES(?,?)',user.id,id);return send(200,await state(user));}
 fail(404,'Endpoint not found.');
 }catch(e){if(!e.status)console.error('API request failed',e.message);return send(e.status||500,{error:e.status?e.message:'Something went wrong. Please try again.'})}
}};
