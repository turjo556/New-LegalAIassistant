// Stripe's return marker is consumed by driver onboarding, not a posting URL.
// Preserve language/search context and fragments when leaving that flow.
export function withoutDriverReturn(value,base='https://ridely.ca'){
 const url=new URL(value,base);url.searchParams.delete('driver-verification');
 return url.pathname+url.search+url.hash;
}

export const sectionPaths={offer:'/offer-a-ride','driver-onboarding':'/driver-verification',account:'/account','rider-profile':'/profile',messages:'/messages'};
export const communityPaths={support:'/help',policies:'/policies',notifications:'/notifications',admin:'/operator'};
const viewPaths={home:'/',explore:'/search',trips:'/my-trips',hosting:'/my-listings',saved:'/saved',cart:'/cart'};
export function sectionUrl(modal,{community='policies',thread=null}={}){
 if(modal==='community')return communityPaths[community]||null;
 const path=sectionPaths[modal];if(!path)return null;
 return path+(modal==='messages'&&thread?'?'+new URLSearchParams({booking:thread}):'');
}
export function readSection(value,base='https://ridely.ca'){
 const url=new URL(value,base),p=url.pathname,q=url.searchParams;
 const rideMatch=p.match(/^\/ride\/([a-zA-Z0-9_-]{1,80})(\/request)?$/),rideId=rideMatch?.[1]||null;
 const modal=Object.keys(sectionPaths).find(k=>sectionPaths[k]===p)||null;
 const community=Object.keys(communityPaths).find(k=>communityPaths[k]===p)||null;
 const legacy=q.has('driver-verification')?'driver-onboarding':q.has('rider-profile')?'rider-profile':q.has('policy')?'community':q.get('credit-checkout')==='return'?'account':null;
 return {rideId,view:rideId?(rideMatch[2]?'request':'ride'):Object.keys(viewPaths).find(k=>viewPaths[k]===p)||'home',modal:['/login','/join'].includes(p)?'auth':community?'community':modal||legacy,community:community||'policies',authMode:p==='/join'?'register':'login',thread:p==='/messages'&&/^[a-zA-Z0-9_-]{1,80}$/.test(q.get('booking')||'')?q.get('booking'):null};
}
export function safeSectionReturn(value){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//'))return null;
 const url=new URL(value,'https://ridely.ca');const route=readSection(url.href);
 const allowed=[...Object.values(viewPaths),'/fr',...Object.values(sectionPaths),...Object.values(communityPaths)];
 return (allowed.includes(url.pathname)||route.rideId)&&route.modal!=='auth'?url.pathname+url.search+url.hash:null;
}
