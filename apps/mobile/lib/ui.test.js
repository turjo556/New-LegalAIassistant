import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from '../../server/index.js';
import {createApi} from './api.js';
import {testDatabase,approveTestDriver,completeTestRiders} from '../../../scripts/test-driver-fixture.mjs';
const require=createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const text=node=>typeof node==='string'?node:(node.children||[]).map(text).join('');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<100;i++){await act(async()=>{await wait(10);});if(fn())return;}throw Error('UI did not reach expected state');}
for(const platform of ['ios','android'])test(platform+': native screens register, enforce checks and credits, book, share, hide codes and save a private preset draft',async t=>{
 const dbPath=testDatabase(t),server=createApp({dbPath});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const baseUrl='http://127.0.0.1:'+server.address().port;
 const map=new Map(),storage={getItem:async k=>map.get(k)||null,setItem:async(k,v)=>map.set(k,v),deleteItem:async k=>map.delete(k)};
 const driver=createApi({baseUrl,storage});await driver.request('register',{name:'Driver',email:'driver@example.com',password:'test-mobile-password'});approveTestDriver(dbPath);
 const posted=await driver.request('rides',{from:'Montréal',to:'Ottawa',date:'2099-11-06',time:'09:00',arrival:'12:00',price:25,seats:4,car:'Toyota',vehicleColor:'Blue',licencePlate:'TEST123',plateProvince:'QC',pickupLocationId:'namur-burger-king',dropoffLocationId:'st-laurent-starbucks'});
 const mocks={platform,store:new Map(),callbacks:new Set(),shared:[],links:[]};globalThis.__ridelyNativeTest=mocks;
 const nativeStub=`import React from 'react';const m=globalThis.__ridelyNativeTest;export const View='View',Text='Text',TextInput='TextInput',ScrollView='ScrollView',Pressable='Pressable',KeyboardAvoidingView='KeyboardAvoidingView',RefreshControl='RefreshControl',Switch='Switch',ActivityIndicator='ActivityIndicator',Image='Image';export const Modal=({visible,children})=>visible?React.createElement('Modal',null,children):null;export const StyleSheet={create:x=>x};export const useWindowDimensions=()=>({width:390,height:844});export const Platform={get OS(){return m.platform}};export const Alert={alert:()=>{}};export const AppState={currentState:'active',addEventListener:(_,fn)=>{m.callbacks.add(fn);return{remove:()=>m.callbacks.delete(fn)}}};export const Linking={openURL:async url=>m.links.push(url)};export const Share={share:async info=>m.shared.push(info)};`;
 const modules={
  'react-native':nativeStub,
  'react-native-safe-area-context':"export const SafeAreaProvider='SafeAreaProvider',SafeAreaView='SafeAreaView';",
  'expo-status-bar':"export const StatusBar='StatusBar';",
  '@react-native-community/datetimepicker':"export default 'DateTimePicker';",
  'react-native-maps':"export default 'MapView';export const Marker='Marker',Circle='Circle';",
  'expo-secure-store':"const m=globalThis.__ridelyNativeTest;export const getItemAsync=async k=>m.store.get(k)||null,setItemAsync=async(k,v)=>m.store.set(k,v),deleteItemAsync=async k=>m.store.delete(k),WHEN_UNLOCKED_THIS_DEVICE_ONLY='device';",
  'expo-image-picker':"export const launchImageLibraryAsync=async()=>({canceled:true});",
  'expo-image-manipulator':"export const manipulateAsync=async()=>({}),SaveFormat={JPEG:'jpeg'};",
 };
 let tree;
 try{
 const bundle=await build({entryPoints:[new URL('../App.js',import.meta.url).pathname],bundle:true,write:false,format:'cjs',platform:'node',loader:{'.js':'jsx','.webp':'dataurl'},external:['react'],define:{'process.env.EXPO_PUBLIC_API_URL':JSON.stringify(baseUrl),'process.env.EXPO_PUBLIC_APP_ENV':'"development"'},plugins:[{name:'native-hosts',setup(b){b.onResolve({filter:/.*/},args=>Object.hasOwn(modules,args.path)?{path:args.path,namespace:'native-hosts'}:null);b.onLoad({filter:/.*/,namespace:'native-hosts'},args=>({contents:modules[args.path],loader:'js'}));}}]});
 const mod={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(require,mod,mod.exports);
 await act(async()=>{tree=TestRenderer.create(React.createElement(mod.exports.default));});
 const all=()=>text(tree.root);
 const assertNativeText=()=>{for(const n of tree.root.findAll(n=>typeof n.type==='string'&&n.type!=='Text')){const raw=n.children.filter(c=>typeof c==='string'||typeof c==='number');assert.deepEqual(raw,[],'Raw text outside Text under '+n.type+': '+JSON.stringify(raw));}};
 const press=async(label)=>{const n=tree.root.findAll(n=>n.type==='Pressable'&&(text(n)===label||['Search','My trips','Saved','Credits','Account'].includes(label)&&text(n).endsWith(label))).at(label==='Sign in'?-1:0);assert.ok(n,'Missing button: '+label);assert.ok(!n.props.disabled,'Disabled: '+label);await act(async()=>{await n.props.onPress();});assertNativeText();};
 const field=async(label,value)=>{const n=tree.root.findAll(n=>n.type==='TextInput'&&n.props.accessibilityLabel===label)[0];assert.ok(n,'Missing input '+label);await act(async()=>n.props.onChangeText(value));};
 await until(()=>all().includes('Find a ride'));assert.ok(all().includes('GOOD COMPANY.'));assert.equal(tree.root.findAll(n=>n.type==='Image').length,2);
 await press('Sign in');await press('New here? Create account');await field('First name','Sam');await field('Email','sam@example.com');await field('Password','test-mobile-password');await field('Referral code (optional)','aba01');
 // Registration requires consent; no misleading verified state is created.
 await press('Create account');assert.ok(all().includes('Accept the early-access terms'));
 await act(async()=>tree.root.findAll(n=>n.type==='Switch'&&n.props.accessibilityLabel==='Accept terms and privacy policy')[0].props.onValueChange(true));await press('Create account');
 await until(()=>all().includes('Get ready for your first ride'));const referralDb=new DatabaseSync(dbPath);assert.equal(referralDb.prepare("SELECT referral_code FROM users WHERE email='sam@example.com'").get().referral_code,'ABA01');referralDb.close();assert.ok(all().includes('Confirm your email'));assert.ok(all().includes('Your private rider details'));
 completeTestRiders(dbPath);await act(async()=>{mocks.callbacks.forEach(fn=>fn('active'));});await until(()=>all().includes('Email confirmed'));
 await press('Back to account');await press('Credits');assert.ok(all().includes('two free booking credits'));assert.ok(all().includes('No charge can be made here'));
 await press('Search');
 const dateButton=tree.root.findAll(n=>n.type==='Pressable'&&n.props.style&&text(n).includes('2026'))[0];assert.ok(dateButton);await act(async()=>dateButton.props.onPress());
 await act(async()=>tree.root.findByType('DateTimePicker').props.onChange({},new Date('2099-11-06T12:00:00Z')));
 await press('Find a ride →');assert.ok(!all().includes('Driver identity, driving eligibility and insurance require separate approval'));assert.ok(!all().includes('Route & stops'));await press('More details +');assert.ok(all().includes('Route & stops'));assert.ok(all().includes('Identity, licence and insurance checks are separate.'));await press('More details −');assert.ok(!all().includes('Route & stops'));await press('Review & book →');assert.ok(all().includes('cash to driver'));assert.ok(all().includes('2 booking credits available'));
 await press('Request standard seats');await until(()=>all().includes('Awaiting driver approval'));const pending=(await driver.request('state')).seatRequests.find(q=>q.status==='pending');assert.ok(pending);
 // Drivers must see their pending requests in My trips, regardless of Riders/Drivers toggle.
 await press('Account');await press('Sign out');await press('Sign in');await field('Email','driver@example.com');await field('Password','test-mobile-password');await press('Sign in');await until(()=>!tree.root.findAll(n=>n.type==='Modal').length);await press('Account');assert.ok(all().includes('driver@example.com'));await press('My trips');await until(()=>all().includes('Accept seats'));assert.ok(all().includes('Decline'));assert.ok(all().includes('YOUR LISTING'));
 const notificationButton=()=>tree.root.findAll(n=>n.type==='Pressable'&&n.props.accessibilityLabel?.startsWith('Notifications,'))[0];assert.ok(notificationButton());assert.notEqual(notificationButton().props.accessibilityLabel,'Notifications, 0');await act(async()=>notificationButton().props.onPress());await press('Mark updates as read');await until(()=>notificationButton().props.accessibilityLabel==='Notifications, 0');await act(async()=>tree.root.findAll(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Close')[0].props.onPress());
await press('As passenger');assert.ok(!all().includes('YOUR LISTING'));assert.ok(!all().includes('Accept seats'));await press('As driver');assert.ok(all().includes('YOUR LISTING'));assert.ok(all().includes('Accept seats'));
 await press('Account');await press('Sign out');await press('Sign in');await field('Email','sam@example.com');await field('Password','test-mobile-password');await press('Sign in');await until(()=>!tree.root.findAll(n=>n.type==='Modal').length);await press('My trips');
 await driver.request('booking-requests/decision',{id:pending.id,decision:'accept',availabilityConfirmed:true});await act(async()=>{mocks.callbacks.forEach(fn=>fn('active'));});await until(()=>all().includes('STANDARD SEATS RESERVED'));
 await press('Trip details & boarding code');await press('Show my boarding code');await until(()=>tree.root.findAll(n=>n.type==='Text'&&/^\d{6}$/.test(text(n))).length>0);
 await act(async()=>{mocks.callbacks.forEach(fn=>fn('background'));});assert.equal(tree.root.findAll(n=>n.type==='Text'&&/^\d{6}$/.test(text(n))).length,0);
 const consent=tree.root.findAll(n=>n.type==='Switch'&&n.props.accessibilityLabel?.startsWith('I understand anyone'))[0];await act(async()=>consent.props.onValueChange(true));await press('Create and share itinerary link');assert.equal(mocks.shared.length,1);assert.ok(mocks.shared[0].message.startsWith(baseUrl+'/trip-share#'));await press('Revoke link');
 await act(async()=>tree.root.findAll(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Close')[0].props.onPress());
 await press('Search');await press('Drivers');await press('＋ Post your route');await field('Vehicle','Toyota');await field('Licence plate number','SAM123');await field('Price per seat (CAD)','25');
 await press('Namur · Burger King');await press('St-Laurent Shopping Centre · Near Starbucks');await press('Save ride & continue to verification');await until(()=>all().includes('Become a Ridely driver'));
 assert.ok(all().includes('Driver’s licence number'));const db=new DatabaseSync(dbPath);try{const draft=JSON.parse(db.prepare('SELECT payload FROM ride_drafts d JOIN users u ON u.id=d.user_id WHERE u.email=?').get('sam@example.com').payload);assert.equal(draft.pickupLocationId,'namur-burger-king');assert.equal(draft.dropoffLocationId,'st-laurent-starbucks');assert.equal(draft.price,25);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rides').get().n,1);}finally{db.close();}
 await field('Driver’s licence number','A123456789012');
 await act(async()=>tree.root.findAll(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Change language')[0].props.onPress());
 assert.ok(all().includes('2. Votre permis de conduire'));
 const licence=tree.root.findAll(n=>n.type==='TextInput'&&n.props.accessibilityLabel==='Numéro du permis de conduire')[0];assert.equal(licence.props.value,'A123456789012');
 assert.equal(posted.hosting[0].price,25);
 }finally{if(tree)await act(async()=>tree.unmount());await new Promise(r=>server.close(r));delete globalThis.__ridelyNativeTest;}
});
