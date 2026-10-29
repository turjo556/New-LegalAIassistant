import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function createTestRide({url,password,fetcher=fetch,now=new Date()}={}){
 const target=new URL(url);
 if(target.protocol!=='https:'||!/^ridely-app-test\.[a-z0-9-]+\.workers\.dev$/.test(target.hostname)||target.username||target.password||target.port||target.pathname!=='/'||target.search||target.hash)throw Error('Refusing to use anything except the isolated ridely-app-test server.');
 if(!password)throw Error('Saved test driver password is missing. Run npm run mobile:test:setup on this Mac first.');
 let cookie='';
 async function request(path,body){const r=await fetcher(target.origin+path,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(r.headers.get('X-Ridely-Environment')!=='isolated-test')throw Error('The server did not identify itself as isolated testing. Stopping.');
 const d=await r.json();if(!r.ok)throw Error(r.status===403?'Test driver approval may need refreshing. Run npm run mobile:test:setup, then retry.':`Test server returned ${r.status}. No live server was targeted.`);
 if(path==='/api/login'){cookie=r.headers.get('set-cookie')?.split(';')[0];if(!cookie||d.user?.email!=='driver@ridely.test')throw Error('Test driver sign-in could not be confirmed.');}return d;}
 const health=await request('/api/health');if(health.environment!=='isolated-test'||health.simulatedChecks!==true)throw Error('Isolated test health check failed.');
 const state=await request('/api/login',{email:'driver@ridely.test',password});
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
 const date=new Date(Date.UTC(+parts.year,+parts.month-1,+parts.day+1,12)).toISOString().slice(0,10);
 const matches=r=>r.from==='Montréal'&&r.to==='Ottawa'&&r.date===date&&r.time==='09:00'&&!r.cancelled&&r.seats>0;
 let ride=state.hosting?.find(matches);
 if(!ride){const result=await request('/api/rides',{from:'Montréal',to:'Ottawa',date,time:'09:00',arrival:'12:00',price:25,seats:3,car:'Toyota',vehicleColor:'Black',licencePlate:'TEST123',plateProvince:'QC',luggage:'small',pickupLocationId:'namur-burger-king',dropoffLocationId:'st-laurent-starbucks',allowPickup:false,allowDropoff:false,vehicleNotes:'Synthetic mobile test ride.'});ride=result.hosting?.find(matches);if(!ride)throw Error('The test server did not return a searchable ride.');}
 return {date,rideId:ride.id};
}
async function main(){let env,credentials;try{env=readFileSync(resolve(root,'apps/mobile/.env.local'),'utf8');credentials=JSON.parse(readFileSync(resolve(root,'.ridely-test/private.json'),'utf8'));}catch{throw Error('Saved test setup is missing on this Mac. Run npm run mobile:test:setup first.');}
 const url=env.match(/^\s*EXPO_PUBLIC_API_URL\s*=\s*(.*?)\s*$/m)?.[1]?.replace(/^['"]|['"]$/g,'');
 const result=await createTestRide({url,password:credentials.driverPassword});console.log(`Test ride ready: Montréal → Ottawa · ${result.date} · 09:00–12:00 · $25/seat.\nStay signed in as the rider in Expo Go. Search this route and date, then refresh.\nOnly the isolated test server was used. Saved passwords were not displayed.`);}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
