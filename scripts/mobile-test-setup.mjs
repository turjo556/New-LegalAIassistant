import {readFileSync,writeFileSync,mkdirSync,existsSync,chmodSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomBytes,pbkdf2Sync,createCipheriv} from 'node:crypto';
export const TEST_MARKER='ridely-mobile-test-v1',TEST_WORKER='ridely-app-test',TEST_DATABASE='ridely-app-test';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function testConfig(databaseId,production){
 if(!/^[0-9a-f-]{36}$/i.test(databaseId)||production.d1_databases.some(d=>d.database_id===databaseId))throw Error('Refusing to use the live database for app testing.');
 return {$schema:'../node_modules/wrangler/config-schema.json',name:TEST_WORKER,main:'../apps/worker/mobile-test.js',compatibility_date:production.compatibility_date,compatibility_flags:['nodejs_compat'],workers_dev:true,preview_urls:false,assets:{directory:'../apps/web/dist',binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:['/*']},d1_databases:[{binding:'DB',database_name:TEST_DATABASE,database_id:databaseId,migrations_dir:'../migrations'}],vars:{RIDELY_TEST_ENVIRONMENT:TEST_MARKER},triggers:{crons:[]}};
}
const sqlValue=v=>v===null?'NULL':typeof v==='number'?String(v):"'"+String(v).replaceAll("'","''")+"'";
export function fixtureSql(privateData,now=Date.now()){
 const rows=[['00000000-0000-4000-8000-000000000001','Test driver','driver@ridely.test',privateData.driverPassword],['00000000-0000-4000-8000-000000000002','Test rider','rider@ridely.test',privateData.riderPassword]];
 const statements=[];
 for(const [id,name,email,password] of rows){
  const salt=randomBytes(16).toString('hex'),digest=pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');
  statements.push('INSERT INTO users(id,name,email,password,email_verified,phone_verified,phone) VALUES('+[id,name,email,`${salt}:${digest}`,1,1,'+15145550000'].map(sqlValue).join(',')+') ON CONFLICT(id) DO NOTHING;');
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(privateData.encryptionKey,'base64'),iv);cipher.setAAD(Buffer.from('ridely-rider-profile-v1:'+id));const sealed=Buffer.concat([cipher.update(JSON.stringify({legalName:name+' Synthetic',dob:'1995-01-01'})),cipher.final(),cipher.getAuthTag()]);
  statements.push('INSERT INTO rider_private_profiles(user_id,ciphertext,iv,adult_declared,policy_version,updated_at,expires_at) VALUES('+[id,sealed.toString('base64'),iv.toString('base64'),1,'synthetic-test-only',now,now+365*86400000].map(sqlValue).join(',')+') ON CONFLICT(user_id) DO UPDATE SET ciphertext=excluded.ciphertext,iv=excluded.iv,adult_declared=1,updated_at=excluded.updated_at,expires_at=excluded.expires_at;');
 }
 statements.push(`INSERT INTO driver_checks(user_id,attempt,identity_status,licence_status,insurance_status,licence_province,eligibility_consent_at,authority_source,authority_checked_at,licence_class_confirmed,restrictions_confirmed,licence_expires,insurance_expires,vehicle,reviewed_at) VALUES('00000000-0000-4000-8000-000000000001','synthetic-test-only','verified','approved','approved','QC',${now},'saaq',${now-1000},1,1,'2099-12-31','2099-12-31','Toyota',${now}) ON CONFLICT(user_id) DO UPDATE SET reviewed_at=excluded.reviewed_at,authority_checked_at=excluded.authority_checked_at;`);
 return statements.join('\n');
}
function run(args,{capture=false,input}={}){
 const cli=resolve(root,'node_modules/wrangler/bin/wrangler.js');
 const result=spawnSync(process.execPath,[cli,...args],{cwd:root,env:{...process.env,WRANGLER_SEND_METRICS:'false'},input,encoding:'utf8',stdio:capture?['pipe','pipe','pipe']:input!==undefined?['pipe','inherit','inherit']:'inherit'});
 if(result.error)throw result.error;if(result.status!==0)throw Error(capture?(result.stderr||'Cloudflare command failed. Check your login and account access.'):'Cloudflare command failed. Review the message above.');return result.stdout||'';
}
function parseJson(text){const start=text.search(/[\[{]/);if(start<0)throw Error('Cloudflare returned unexpected output.');return JSON.parse(text.slice(start));}
export async function setup(){
 const production=JSON.parse(readFileSync(resolve(root,'wrangler.json'),'utf8')),dir=resolve(root,'.ridely-test');mkdirSync(dir,{recursive:true,mode:0o700});chmodSync(dir,0o700);
 console.log('Creating/updating only ridely-app-test. The production Worker and database are not targeted.');
 run(['whoami']);
 const databases=parseJson(run(['d1','list','--json'],{capture:true}));let database=databases.find(d=>d.name===TEST_DATABASE);
 const newlyCreated=!database;
 if(!database){run(['d1','create',TEST_DATABASE,'--update-config=false']);const fresh=parseJson(run(['d1','list','--json'],{capture:true}));database=fresh.find(d=>d.name===TEST_DATABASE);}
 if(!database)throw Error('The separate test database could not be found.');
 const config=testConfig(database.uuid||database.database_id,production),configPath=resolve(dir,'wrangler.json');writeFileSync(configPath,JSON.stringify(config,null,2)+'\n',{mode:0o600});
 const target=['--config',configPath];
 if(!newlyCreated){const result=run(['d1','execute','DB','--remote','--command',`SELECT label FROM ridely_test_marker WHERE label='${TEST_MARKER}'`,'--json',...target],{capture:true});if(!parseJson(result).some(r=>r.results?.some(row=>row.label===TEST_MARKER)))throw Error('An existing database with this name is not marked for isolated app testing. Refusing to modify it.');}
 run(['d1','migrations','apply','DB','--remote',...target]);
 const marker=resolve(dir,'marker.sql');writeFileSync(marker,`CREATE TABLE IF NOT EXISTS ridely_test_marker(label TEXT PRIMARY KEY); INSERT OR IGNORE INTO ridely_test_marker(label) VALUES('${TEST_MARKER}');\n`,{mode:0o600});run(['d1','execute','DB','--remote','--file',marker,...target]);
 const privatePath=resolve(dir,'private.json');let privateData;
 if(existsSync(privatePath))privateData=JSON.parse(readFileSync(privatePath,'utf8'));
 else{if(!newlyCreated){const counts=parseJson(run(['d1','execute','DB','--remote','--command','SELECT COUNT(*) AS count FROM users','--json',...target],{capture:true}));if(counts.some(r=>r.results?.some(row=>row.count>0)))throw Error('This test database already has accounts but its local key/login file is missing. Restore .ridely-test/private.json; refusing to replace credentials or encryption keys.');}privateData={encryptionKey:randomBytes(32).toString('base64'),driverPassword:randomBytes(18).toString('base64url'),riderPassword:randomBytes(18).toString('base64url')};writeFileSync(privatePath,JSON.stringify(privateData,null,2),{mode:0o600});}
 if(Buffer.from(privateData.encryptionKey||'','base64').length!==32||!privateData.driverPassword||!privateData.riderPassword)throw Error('The saved test configuration is incomplete. Do not replace the encryption key; review .ridely-test/private.json locally.');
 const seed=resolve(dir,'fixtures.sql');writeFileSync(seed,fixtureSql(privateData),{mode:0o600});run(['d1','execute','DB','--remote','--file',seed,...target]);
 const build=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{cwd:root,stdio:'inherit'});if(build.status!==0)throw Error('Website assets could not be built.');
 const deployOutput=run(['deploy',...target],{capture:true});console.log(deployOutput);
 const url=deployOutput.match(/https:\/\/ridely-app-test\.[a-z0-9-]+\.workers\.dev\b/)?.[0];if(!url)throw Error('The test URL was not found. Do not substitute the live ridely.ca URL.');
 run(['secret','put','LICENCE_ENCRYPTION_KEY',...target],{input:privateData.encryptionKey+'\n'});
 let healthy=false;for(let attempt=0;attempt<8;attempt++){try{const r=await fetch(url+'/api/health',{signal:AbortSignal.timeout(10000)});const d=await r.json();if(r.ok&&d.environment==='isolated-test'&&d.simulatedChecks===true){healthy=true;break;}}catch{}await new Promise(r=>setTimeout(r,2000));}
 if(!healthy)throw Error('The isolated test health check did not pass yet. Rerun this command; production has not been selected.');
 const envPath=resolve(root,'apps/mobile/.env.local');let previous=existsSync(envPath)?readFileSync(envPath,'utf8'):'';previous=previous.split(/\r?\n/).filter(line=>!/^\s*EXPO_PUBLIC_(API_URL|APP_ENV)\s*=/.test(line)).join('\n').trim();
 writeFileSync(envPath,(previous?previous+'\n':'')+'EXPO_PUBLIC_API_URL='+url+'\nEXPO_PUBLIC_APP_ENV=development\n',{mode:0o600});
 const instructions=`RIDELY — ISOLATED TEST ACCOUNTS\n\nTest server: ${url}\nOnly synthetic people and test bookings. No messages, identity checks, charges or payouts are sent to external providers.\n\nDriver email: driver@ridely.test\nDriver password: ${privateData.driverPassword}\n\nRider email: rider@ridely.test\nRider password: ${privateData.riderPassword}\n\nDriver/identity/contact approvals are simulated fixtures, not real government, insurance, phone or identity checks.\nVehicle for the approved driver: Toyota. Enter a fictional colour and plate.\nDates/times: choose a future date and quarter-hour times. Use a $25 whole-dollar fare.\nStart by signing in as the test driver and publishing a Montréal → Ottawa ride. Sign out, sign in as the rider and book it.\nEach account starts with two credits; rerunning setup preserves bookings and used credit balances.\nTest driver approval refreshes on setup and expires after 30 days.\nDo not enter real licence numbers, real private profiles or payment details.\n`;
 writeFileSync(resolve(dir,'TEST-ACCOUNTS.txt'),instructions,{mode:0o600});
 console.log('Test server ready: '+url+'\nThe app test URL was saved automatically.\nRead your private test logins locally: open .ridely-test/TEST-ACCOUNTS.txt\nThen restart the app: cd apps/mobile && npx expo start --clear\nDo not paste the private test-login file into chat.');
}
if(process.argv[1]===fileURLToPath(import.meta.url))setup().catch(e=>{console.error(e.message);process.exitCode=1;});
