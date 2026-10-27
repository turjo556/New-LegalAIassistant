export function mobileConfig(value, mode = 'development') {
  if (!['development', 'staging', 'production'].includes(mode)) return { ready: false, message: 'Unknown app environment. Rebuild with a supported Ridely configuration.' };
  if (!value) return { ready: false, message: 'Set EXPO_PUBLIC_API_URL to your test backend to connect this build.' };
  let url;
  try { url = new URL(value); } catch { return { ready: false, message: 'The API URL is invalid.' }; }
  const local = ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !(local && mode !== 'production' && url.protocol === 'http:'))) {
    return { ready: false, message: 'Use an HTTPS API origin. Local HTTP is allowed only for development.' };
  }
  if (mode === 'production' && url.origin !== 'https://ridely.ca') return { ready: false, message: 'A production build must connect to https://ridely.ca.' };
  if (mode === 'staging' && url.origin !== 'https://ridely-app-test.bonjour-847.workers.dev') return { ready: false, message: 'A beta build must connect to the isolated Ridely test server.' };
  return { ready: true, baseUrl: url.origin, production: mode === 'production', staging: mode === 'staging' };
}
