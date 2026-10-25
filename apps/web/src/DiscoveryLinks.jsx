import React from 'react';
import {sitePages} from '../../../packages/core/site-pages.js';
export default function DiscoveryLinks({locale}){const fr=locale==='fr';return <section className="seo-discovery"><h2>{fr?'Préparez votre prochain covoiturage':'Plan your next shared ride'}</h2><div>{sitePages.filter(p=>p.lang===locale&&p.kind!=='home').map(p=><a key={p.path} href={p.path}>{p.heading}</a>)}</div></section>;}
