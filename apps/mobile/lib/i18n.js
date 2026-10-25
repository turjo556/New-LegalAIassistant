import dictionary from './fr.js';
let language = 'en';
const listeners = new Set();
export const getLanguage = () => language;
export const subscribeLanguage = fn => {listeners.add(fn); return () => listeners.delete(fn);};
export function setLanguage(value) {language = value === 'fr' ? 'fr' : 'en'; listeners.forEach(fn=>fn());}
export function t(value) {
  if(typeof value !== 'string' || language !== 'fr') return value;
  if(dictionary[value]) return dictionary[value];
  const translated=dictionary[value.replace(/\s+/g,' ').trim()];
  return translated ? (/^\s/.test(value)?' ':'') + translated + (/\s$/.test(value)?' ':'') : value;
}
