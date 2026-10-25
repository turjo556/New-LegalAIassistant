import React,{useSyncExternalStore} from 'react';
import fr from './locales/fr.json';
const normalize=s=>s.replace(/\s+/g,' ').trim();
function initial(){try{const q=new URLSearchParams(location.search).get('lang');if(q==='en'||q==='fr')return q;if(location.pathname==='/fr'||location.pathname.startsWith('/fr/'))return 'fr';const saved=localStorage.getItem('ridely.locale');if(saved==='en'||saved==='fr')return saved;return navigator.language?.startsWith('fr')?'fr':'en'}catch{return 'en'}}
let language=initial();const listeners=new Set();
export const getLocale=()=>language;
export const formatLocale=()=>language==='fr'?'fr-CA':'en-CA';
export function setLocale(next){if(!['en','fr'].includes(next)||next===language)return;language=next;try{localStorage.setItem('ridely.locale',next)}catch{}document.documentElement.lang=next;document.title=next==='fr'?'Ridely — Votre trajet. Votre monde.':'Ridely — Your route. Your ride.';document.querySelector('meta[name=description]')?.setAttribute('content',next==='fr'?'Ridely — Trouvez des trajets de covoiturage entre Montréal, Longueuil, Ottawa et Gatineau.':'Ridely — Find shared rides between Montréal, Longueuil, Ottawa and Gatineau.');const url=new URL(location.href);if(['/','/fr'].includes(url.pathname)){url.pathname=next==='fr'?'/fr':'/';url.searchParams.delete('lang')}else url.searchParams.set('lang',next);history.replaceState({},'',url);listeners.forEach(fn=>fn())}
export function useLocale(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},getLocale,getLocale)}
export function t(value){if(language!=='fr'||typeof value!=='string')return value;const key=normalize(value);if(!key)return value;const translated=fr[key];if(translated!==undefined)return value.match(/^\s*/)[0]+translated+value.match(/\s*$/)[0];
 let m;if((m=key.match(/^STEP (\d+) OF (\d+)$/)))return `ÉTAPE ${m[1]} SUR ${m[2]}`;
 if((m=key.match(/^(\d+) passengers?$/)))return `${m[1]} passager${m[1]==='1'?'':'s'}`;
 if((m=key.match(/^(\d+) passenger seats?$/)))return `${m[1]} place${m[1]==='1'?'':'s'} pour passagers`;
 if((m=key.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/)))return `${Number(m[1])%12+(m[3]==='PM'?12:0)} h ${m[2]}`;
 if((m=key.match(/^Your cart, (\d+) booking credits$/)))return `Votre panier, ${m[1]} crédits de réservation`;
 if((m=key.match(/^Hi, (.+)\.$/)))return `Bonjour, ${m[1]}.`;
 if((m=key.match(/^Posting as (.+)$/)))return `Publication par ${m[1]}`;
 if((m=key.match(/^(\d+) booking credits?$/)))return `${m[1]} crédit${m[1]==='1'?'':'s'} de réservation`;
 if((m=key.match(/^1 booking credit will be used for this reservation \((\d+) available\)\.$/)))return `Un crédit sera utilisé pour cette réservation (${m[1]} disponibles).`;
 if((m=key.match(/^Your (?:ride|trip) to (.+)$/)))return `Votre trajet vers ${m[1]}`;
 if((m=key.match(/^Request custom (pickup|drop-off)(.*)$/)))return `Demander un ${m[1]==='pickup'?'embarquement':'débarquement'} personnalisé${m[2].replace('/person','/personne')}`;
 if((m=key.match(/^(.+)’s profile$/)))return `Photo de profil de ${m[1]}`;
 if((m=key.match(/^\d+ listings · (.+)$/)))return key.replace('listings','annonces');
 return value;
}
// Translate presentation only, while retaining the original form/API values.
// User-written text is explicitly marked translate="no" at its render sites.
export function i18nElement(type,props,...children){if(typeof type!=='string'&&type!==React.Fragment)return React.createElement(type,props,...children);let p=props;if(type==='option'&&props?.value===undefined){p={...props,value:children.filter(c=>typeof c==='string'||typeof c==='number').join('')}}if(p?.translate!=='no'&&!p?.['data-user-content']){p={...p};for(const k of ['placeholder','title','alt','aria-label','aria-description'])if(typeof p[k]==='string')p[k]=t(p[k]);const translateChild=c=>typeof c==='string'?t(c):Array.isArray(c)?c.map(translateChild):c;children=children.map(translateChild)}return React.createElement(type,p,...children)}
export function LanguageSwitcher(){const locale=useLocale();return React.createElement('button',{type:'button',className:'language-switch',translate:'no',lang:locale==='en'?'fr':'en','aria-label':locale==='en'?'Passer au français':'Switch to English',onClick:()=>setLocale(locale==='en'?'fr':'en')},locale==='en'?'Français':'English')}
document.documentElement.lang=language;
if(language==='fr'&&location.pathname==='/'){const url=new URL(location.href);url.pathname='/fr';url.searchParams.delete('lang');history.replaceState({},'',url);}
