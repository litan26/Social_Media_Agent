import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
import axios from 'axios';
import { decrypt } from '../utils/encryption.js';

const GRAPH = 'https://graph.facebook.com/v21.0';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});
const r = await pool.query(
  "SELECT access_token, metadata FROM social_accounts WHERE platform='facebook' LIMIT 1"
);
await pool.end();

const pageToken = decrypt(r.rows[0].access_token);
const meta =
  typeof r.rows[0].metadata === 'string' ? JSON.parse(r.rows[0].metadata) : r.rows[0].metadata;

console.log('pageId  :', meta.pageId);
console.log('pageName:', meta.pageName);

try {
  const page = await axios.get(`${GRAPH}/${meta.pageId}`, {
    params: { fields: 'id,name,category,fan_count', access_token: pageToken },
  });
  console.log('PAGE OK :', JSON.stringify(page.data));
} catch (e: any) {
  console.log('PAGE ERR:', JSON.stringify(e.response?.data?.error?.message || e.message));
}

// Which permissions did the Page token actually receive?
try {
  const perms = await axios.get(`${GRAPH}/me/permissions`, {
    params: { access_token: pageToken },
  });
  const granted = perms.data.data
    .filter((p: any) => p.status === 'granted')
    .map((p: any) => p.permission);
  console.log('GRANTED :', granted.join(', ') || '(none)');
  console.log('can post:', granted.includes('pages_manage_posts') ? 'YES' : 'NO — pages_manage_posts missing');
} catch (e: any) {
  console.log('PERM ERR:', JSON.stringify(e.response?.data?.error?.message || e.message));
}
