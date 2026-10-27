export function createApi({baseUrl,storage,fetchImpl=fetch,getLanguage=()=> 'en'}) {
  const base = new URL(baseUrl);
  if (base.username || base.password || (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost','127.0.0.1','10.0.2.2'].includes(base.hostname)))) throw Error('The API must use HTTPS.');
  // Test and production accounts must never share a persisted session.
  const key = 'ridely.session.v2.' + Array.from(base.origin, c => c.charCodeAt(0).toString(16)).join('');
  let cookie = null, initialized = false, queue = Promise.resolve();
  const enqueue = fn => { const task = queue.then(fn); queue = task.catch(()=>{}); return task; };
  return {
    request(path, body) { return enqueue(async () => {
      if (!/^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/i.test(path)) throw Error('Invalid API path.');
      if (!initialized) {cookie = await storage.getItem(key); initialized = true;}
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      let response;
      try {
        response = await fetchImpl(new URL('/api/' + path, base).href, {
          method: body === undefined ? 'GET' : 'POST', credentials: 'omit', signal: controller.signal,
          headers: {Accept: 'application/json', 'Accept-Language': getLanguage() === 'fr' ? 'fr' : 'en',
            ...(body !== undefined ? {'Content-Type':'application/json'} : {}), ...(cookie ? {Cookie:cookie} : {})},
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch(e) { if(e.name === 'AbortError') throw Error('Connection timed out. Check your internet connection and try again.'); throw e; }
      finally {clearTimeout(timeout);}
      let data; try {data = await response.json();} catch {throw Error('The server returned an unexpected response. Please try again.');}
      if (!response.ok) throw Object.assign(new Error(data.error || 'Request failed.'), {status:response.status});
      const received = response.headers.get('set-cookie');
      if (received) {
        const session = received.match(/(?:^|,\s*)rmw_session=([^;]*)/);
        if (session) {
          cookie = session[1] ? 'rmw_session=' + session[1] : null;
          try { if(cookie) await storage.setItem(key,cookie); else await storage.deleteItem(key); }
          catch {cookie = null; await storage.deleteItem(key).catch(()=>{}); throw Error('Unable to save your sign-in session securely. Please try again.');}
        }
      }
      if (['login','register'].includes(path) && !cookie) throw Error('Unable to save your sign-in session. Please try again.');
      if (path === 'logout') {cookie = null; await storage.deleteItem(key);}
      return data;
    }); },
    photoSource(path) {
      const url=new URL(path,base);if(url.username||url.password||url.origin!==base.origin||url.pathname!=='/api/profile/photo')throw Error('Unexpected profile photo URL.');
      return {uri:url.href,headers:cookie?{Cookie:cookie}:{}};
    },
    clear() {return enqueue(async () => {cookie = null; initialized = true; await storage.deleteItem(key);});},
  };
}
