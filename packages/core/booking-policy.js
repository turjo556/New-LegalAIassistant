import {departureTime} from './cancellation.js';
export const requestCutoffMs=10*60*1000;
export const requestResponseWindowMs=2*60*60*1000;
export function requestDeadline(date,time,now=Date.now()){
 return Math.min(now+requestResponseWindowMs,departureTime(date,time)-requestCutoffMs);
}
