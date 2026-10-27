import {googleMapsPin,googleMapsUrl} from './meeting-point-pins-client.js';
export {googleMapsPin,googleMapsUrl} from './meeting-point-pins-client.js';
import {meetingPoints} from './meeting-points.js';
import {point,pickupCities,distanceKm} from './pickup.js';
import {serviceBudget} from './providers.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export async function configuredMeetingPoints(db){const rows=await db.all('SELECT point_id,lat,lng,source_url,confirmed_at FROM meeting_point_pins');return meetingPoints.map(p=>{const row=rows.find(r=>r.point_id===p.id);return row?{...p,pin:{lat:row.lat,lng:row.lng},pinConfirmedAt:row.confirmed_at,pinSourceUrl:row.source_url}:{...p,pin:null}})}
export async function meetingPointPinApi(path,b,user,db,env){
 if(!['/api/admin/meeting-points','/api/admin/meeting-points/save','/api/admin/meeting-points/resolve'].includes(path))return null;
 if(!user)fail(401,'Sign in to continue.');if(!user.email_verified||!env.RIDELY_ADMIN_EMAIL||user.email!==env.RIDELY_ADMIN_EMAIL.toLowerCase())fail(403,'Verified operator access is required.');
 if(path.endsWith('/resolve')){await serviceBudget(db,'meeting-pins-resolve:'+user.id,5,3600000);return {...await resolveMissingMeetingPoints(db,env,{force:true}),meetingPoints:await configuredMeetingPoints(db)}}
 if(path.endsWith('/save')){
 await serviceBudget(db,'meeting-pins:'+user.id,100,600000);const selected=meetingPoints.find(p=>p.id===b.id);if(!selected)fail(400,'Choose a pilot meeting point.');if(b.confirmed!==true)fail(400,'Confirm the exact public meeting spot before saving.');
 const source=googleMapsUrl(b.sourceUrl);if(!source)fail(400,'Provide an HTTPS Google Maps source link.');const pin=point(b.lat,b.lng),centre=pickupCities[selected.city];if(distanceKm(pin,{lat:centre[0],lng:centre[1]})>25)fail(400,'The meeting pin must be within its selected city.');const marker=googleMapsPin(source.href);if(marker&&distanceKm(pin,marker)>.1)fail(400,'The coordinates differ from the source link. Confirm the exact loading spot and use its matching link.');
 const now=Date.now();await db.run('INSERT INTO meeting_point_pin_log VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),selected.id,pin.lat,pin.lng,source.href,user.id,now);
 await db.run('INSERT INTO meeting_point_pins VALUES(?,?,?,?,?,?) ON CONFLICT(point_id) DO UPDATE SET lat=excluded.lat,lng=excluded.lng,source_url=excluded.source_url,confirmed_by=excluded.confirmed_by,confirmed_at=excluded.confirmed_at',selected.id,pin.lat,pin.lng,source.href,user.id,now);
 }
 return {meetingPoints:await configuredMeetingPoints(db)};
}

export async function resolveOwnerMapLink(selected){
 let url=googleMapsUrl(selected.mapsUrl);const signal=AbortSignal.timeout(12000);
 for(let hop=0;url&&hop<4;hop++){
 const direct=googleMapsPin(url.href);if(direct)return {...direct,sourceUrl:url.href};
 const response=await fetch(url.href,{redirect:'manual',headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'},signal});
 if([301,302,303,307,308].includes(response.status)){const target=response.headers.get('location');if(!target)break;url=googleMapsUrl(new URL(target,url).href);if(!url)throw Error('The saved map link redirected outside Google Maps.');continue}
 if(!response.ok)throw Error('The saved Google Maps link could not be opened.');
 const reader=response.body?.getReader();if(!reader)break;const decoder=new TextDecoder();let body='';try{while(body.length<750000){const part=await reader.read();if(part.done)break;body+=decoder.decode(part.value,{stream:true})}}finally{await reader.cancel()}
 const text=body.replace(/\\u([0-9a-f]{4})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16))).replace(/\\\//g,'/').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
 const candidates=[];for(const match of text.matchAll(/https:\/\/(?:www\.)?google\.(?:com|ca)\/maps[^\s"'<>\\]*/g)){const candidate=googleMapsUrl(match[0]),pin=candidate&&googleMapsPin(candidate.href);if(pin)candidates.push({...pin,sourceUrl:candidate.href})}
 const unique=candidates.filter((v,i,a)=>a.findIndex(p=>p.lat===v.lat&&p.lng===v.lng)===i);if(unique.length===1)return unique[0];break;
 }
 throw Error('No unambiguous place pin was found. Confirm this location in Meeting points.');
}
export async function resolveMissingMeetingPoints(db,env,{force=false}={}){
 const operator=env.RIDELY_ADMIN_EMAIL?await db.get('SELECT id FROM users WHERE email=? AND email_verified=1',env.RIDELY_ADMIN_EMAIL.toLowerCase()):null;if(!operator)return {saved:0,unresolved:meetingPoints.map(p=>p.id)};
 const missing=(await configuredMeetingPoints(db)).filter(p=>!p.pin),unresolved=[];let saved=0;
 await Promise.all(missing.map(async selected=>{const last=await db.get('SELECT attempted_at FROM meeting_point_pin_attempts WHERE point_id=?',selected.id);if(!force&&last?.attempted_at>Date.now()-86400000){unresolved.push(selected.id);return}
 await db.run('INSERT INTO meeting_point_pin_attempts VALUES(?,?) ON CONFLICT(point_id) DO UPDATE SET attempted_at=excluded.attempted_at',selected.id,Date.now());
 try{const resolved=await resolveOwnerMapLink(selected),centre=pickupCities[selected.city];if(distanceKm(resolved,{lat:centre[0],lng:centre[1]})>25)throw Error('Outside city');const now=Date.now();const result=await db.run('INSERT INTO meeting_point_pins VALUES(?,?,?,?,?,?) ON CONFLICT(point_id) DO NOTHING',selected.id,resolved.lat,resolved.lng,resolved.sourceUrl,operator.id,now);if(result.changes??result.meta?.changes){saved++;await db.run('INSERT INTO meeting_point_pin_log VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),selected.id,resolved.lat,resolved.lng,resolved.sourceUrl,operator.id,now)}}catch{unresolved.push(selected.id)}
 }));return {saved,unresolved};
}
