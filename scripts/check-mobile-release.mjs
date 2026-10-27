import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mobileConfig} from '../apps/mobile/lib/config.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function checkMobileRelease({app,eas,profile='beta',runtime={}}){
 const errors=[],build=eas.build?.[profile];if(!build)return ['Unknown EAS build profile: '+profile];
 const expo=app.expo;
 if(expo?.extra?.eas?.projectId!=='07f16659-df0c-456b-a48e-1ced12874553')errors.push('Use the existing Ridely Expo project ID.');
 if(expo?.ios?.bundleIdentifier!=='ca.ridely.app'||expo?.android?.package!=='ca.ridely.app')errors.push('Confirm the ca.ridely.app store identifiers before building.');
 const mode=build.env?.EXPO_PUBLIC_APP_ENV,url=build.env?.EXPO_PUBLIC_API_URL;
 const configuration=mobileConfig(url,mode);if(!configuration.ready)errors.push(configuration.message);
 if(profile==='beta'&&(mode!=='staging'||build.distribution!=='store'||build.ios?.simulator!==false||build.android?.buildType!=='app-bundle'))errors.push('Beta must be a physical-device store build against staging.');
 if(profile==='production'&&(mode!=='production'||build.distribution!=='store'||build.ios?.simulator!==false||build.android?.buildType!=='app-bundle'))errors.push('Production must be a physical-device store build against ridely.ca.');
 for(const name of ['EXPO_PUBLIC_API_URL','EXPO_PUBLIC_APP_ENV'])if(runtime[name]&&runtime[name]!==build.env?.[name])errors.push('EAS environment overrides '+name+'. Correct the selected profile/environment.');
 for(const [key,value] of Object.entries(build.env||{}))if(!key.startsWith('EXPO_PUBLIC_')||/\b(?:sk_live_|rk_live_|re_)[A-Za-z0-9]{12,}/.test(String(value)))errors.push('Keep backend secrets out of mobile build profiles: '+key);
 const blocked=expo?.android?.blockedPermissions||[];for(const permission of ['CAMERA','RECORD_AUDIO','ACCESS_FINE_LOCATION','ACCESS_COARSE_LOCATION'])if(!blocked.includes('android.permission.'+permission))errors.push('Unexpected native permission configuration: '+permission);
 return errors;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const profile=process.env.EAS_BUILD_PROFILE||process.argv[2]||'beta';
 const app=JSON.parse(readFileSync(resolve(root,'apps/mobile/app.json'),'utf8')),eas=JSON.parse(readFileSync(resolve(root,'apps/mobile/eas.json'),'utf8'));
 const errors=checkMobileRelease({app,eas,profile,runtime:process.env});
 const icon=readFileSync(resolve(root,'apps/mobile',app.expo.icon));
 if(icon.subarray(1,4).toString()!=='PNG'||icon.readUInt32BE(16)!==icon.readUInt32BE(20)||icon.readUInt32BE(16)<1024)errors.push('The launcher icon must be a square PNG of at least 1024px.');
 if(errors.length){for(const error of errors)console.error(error);process.exitCode=1}
 else{console.log('Ridely '+profile+' build configuration passed.');console.log('Backend: '+eas.build[profile].env.EXPO_PUBLIC_API_URL);console.log('This checks local configuration only. It does not build, upload, charge or publish an app.');console.log('Developer enrolment, signing, device QA and store/privacy review remain separate.');}
}
