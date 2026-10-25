import test from 'node:test';
import assert from 'node:assert/strict';
import {mobileConfig} from './config.js';
import {createApi} from './api.js';
import {t,setLanguage} from './i18n.js';
const storage=()=>{const m=new Map();return {getItem:async k=>m.get(k)||null,setItem:async(k,v)=>m.set(k,v),deleteItem:async k=>m.delete(k)};};
test('mobile requires explicit backend configuration and production HTTPS',()=>{
 assert.equal(mobileConfig().ready,false);
 assert.equal(mobileConfig('https://staging.example').ready,true);
 assert.equal(mobileConfig('http://10.0.2.2:3000').ready,true);
 for(const url of ['http://ridely.ca','https://user:pass@ridely.ca','https://ridely.ca/api','https://ridely.ca/?token=x','http://10.0.2.2:3000'])assert.equal(mobileConfig(url,'production').ready,false,url);
});
test('native API isolates sessions by origin, rejects path escapes and sends selected language',async()=>{
 const store=storage(),calls=[];
 const fetchImpl=async(url,opts)=>{calls.push({url,opts});return {ok:true,headers:new Headers(url.endsWith('/login')?{'set-cookie':'rmw_session=private; HttpOnly; Secure'}:{}),json:async()=>({ok:true})};};
 const one=createApi({baseUrl:'https://one.example',storage:store,fetchImpl,getLanguage:()=> 'fr'});
 await one.request('login',{});await one.request('state');assert.equal(calls[1].opts.headers.Cookie,'rmw_session=private');assert.equal(calls[1].opts.headers['Accept-Language'],'fr');
 const two=createApi({baseUrl:'https://two.example',storage:store,fetchImpl});await two.request('state');assert.equal(calls[2].opts.headers.Cookie,undefined);
 for(const path of ['../state','https://evil.example','state?token=x','/state','state/../../login'])await assert.rejects(()=>one.request(path),/Invalid API path/);
 await one.clear();await one.request('state');assert.equal(calls.at(-1).opts.headers.Cookie,undefined);
});
test('mobile translation changes interface copy without altering user content',()=>{setLanguage('fr');assert.equal(t('Booking credits'),'Crédits de réservation');assert.equal(t('Avery Jones'),'Avery Jones');assert.equal(t('1. Confirm your email'),'1. Confirmez votre courriel');setLanguage('en');assert.equal(t('Booking credits'),'Booking credits');});
