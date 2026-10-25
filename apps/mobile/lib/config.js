export function mobileConfig(value, mode = 'development') {
  if (!value) return { ready: false, message: 'Set EXPO_PUBLIC_API_URL to your test backend to connect this build.' };
  let url;
  try { url = new URL(value); } catch { return { ready: false, message: 'The API URL is invalid.' }; }
  const local = ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !(local && mode !== 'production' && url.protocol === 'http:'))) {
    return { ready: false, message: 'Use an HTTPS API origin. Local HTTP is allowed only for development.' };
  }
  return { ready: true, baseUrl: url.origin, production: mode === 'production' };
}
