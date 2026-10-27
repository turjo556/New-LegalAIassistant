const key='ridely.signup-referral';
export function readReferralCode(){try{const value=new URLSearchParams(location.search).get('ref');if(value!==null){const code=value.trim().toUpperCase();if(/^[A-Z0-9-]{3,20}$/.test(code)){sessionStorage.setItem(key,code);return code}sessionStorage.removeItem(key);return ''}return sessionStorage.getItem(key)||''}catch{return ''}}
export function saveReferralCode(value){try{const code=value.trim().toUpperCase();if(code)sessionStorage.setItem(key,code);else sessionStorage.removeItem(key);const url=new URL(location.href);if(code)url.searchParams.set('ref',code);else url.searchParams.delete('ref');history.replaceState(history.state,'',url.pathname+url.search+url.hash)}catch{}}
export function clearReferralCode(){saveReferralCode('')}
