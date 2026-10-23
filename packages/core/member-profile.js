import jpeg from 'jpeg-js';
import {cities} from './index.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
export const photoUrl=(id,version)=>version?`/api/profile/photo?id=${encodeURIComponent(id)}&v=${encodeURIComponent(version)}`:null;
export async function memberState(db,user){return {rideDraft:user?JSON.parse((await db.get('SELECT payload FROM ride_drafts WHERE user_id=?',user.id))?.payload||'null'):null}}
export async function memberAction(path,b,user,db){
 if(!['/api/profile/photo','/api/rides/draft','/api/rides/draft/delete'].includes(path))return false;
 if(!user)fail('Sign in to continue.',401);
 if(path==='/api/profile/photo'){
 if(b.photo===null){await db.run('UPDATE users SET profile_photo=NULL,photo_version=NULL WHERE id=?',user.id);return true}
 if(b.publicConsent!==true)fail('Confirm your photo can appear on your profile and rides.');
 if(typeof b.photo!=='string'||b.photo.length>110000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(b.photo))fail('Choose a JPEG profile photo under 80 KB.');
 try{const data=Uint8Array.from(atob(b.photo.split(',')[1]),c=>c.charCodeAt(0));if(data.length>80000)fail('Photo is too large.');const decoded=jpeg.decode(data,{useTArray:true,maxResolutionInMP:0.15,maxMemoryUsageInMB:16});if(decoded.width>384||decoded.height>384||decoded.width<32||decoded.height<32)fail('Photo must be between 32 and 384 pixels on each side.');const clean=jpeg.encode({width:decoded.width,height:decoded.height,data:decoded.data},80).data;if(clean.length>80000)fail('Photo is too large.');const photo='data:image/jpeg;base64,'+Buffer.from(clean).toString('base64');await db.run('UPDATE users SET profile_photo=?,photo_version=? WHERE id=?',photo,crypto.randomUUID(),user.id)}catch(e){if(e.status)throw e;fail('This photo could not be read. Choose another image.')}
 return true;
 }
 if(path.endsWith('/delete')){await db.run('DELETE FROM ride_drafts WHERE user_id=?',user.id);return true}
 const source=b.draft;if(!source||typeof source!=='object'||Array.isArray(source))fail('Enter your ride details.');
 const draft={};for(const k of ['from','to','date','time','arrival','seats','price','car','vehicleColor','licencePlate','plateProvince','luggage','vehicleNotes','pickup','destination','pickupLocationId','dropoffLocationId','allowPickup','allowDropoff','pickupFee','dropoffFee','pickupLat','pickupLng','dropoffLat','dropoffLng']){const v=source[k];if(v===null||['string','boolean','number'].includes(typeof v)){if(typeof v==='string'&&v.length>500)fail('Ride detail is too long.');draft[k]=v}}
 if(!cities.includes(draft.from)||!cities.includes(draft.to))fail('Choose supported pilot cities.');
 await db.run('INSERT INTO ride_drafts(user_id,payload,updated) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated=excluded.updated',user.id,JSON.stringify(draft),Date.now());return true;
}
export async function readPhoto(db,id){return (await db.get('SELECT profile_photo FROM users WHERE id=?',String(id||'')))?.profile_photo||null}
