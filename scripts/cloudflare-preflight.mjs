import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../wrangler.json',import.meta.url),'utf8'));
const id=config.d1_databases?.find(d=>d.binding==='DB')?.database_id;
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'')){
 console.error('Cloudflare setup needs the D1 database ID. Create a D1 database named ridemyway in your Cloudflare dashboard, then add its Database ID as database_id under d1_databases[0] in wrangler.json. It is not an API token. See CLOUDFLARE.md.');process.exit(1);
}
console.log('D1 database configuration is present.');
