import {point} from './pickup.js';
export function googleMapsUrl(value){try{if(typeof value!=='string'||value.length>8000)return null;const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&['google.com','www.google.com','maps.google.com','google.ca','www.google.ca','maps.google.ca','maps.app.goo.gl'].includes(url.hostname)?url:null}catch{return null}}
export function googleMapsPin(value){const url=googleMapsUrl(value);if(!url)return null;let text;try{text=decodeURIComponent(url.pathname+url.search)}catch{return null}
 // Use an explicit place marker or coordinate query, never the map camera (@).
 const markers=[...text.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g)];
 let pair;if(markers.length===1)pair=markers[0].slice(1);else if(markers.length>1)return null;
 if(!pair){for(const key of ['query','q']){const value=url.searchParams.get(key);const match=value?.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);if(match){pair=match.slice(1);break}}}
 if(!pair)return null;try{return point(Number(pair[0]),Number(pair[1]))}catch{return null}
}
