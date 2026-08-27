import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
import axios from 'axios';
import { decrypt } from '../utils/encryption.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

const r = await pool.query(
  "SELECT access_token, metadata FROM social_accounts WHERE platform='instagram' LIMIT 1"
);
await pool.end();

const token = decrypt(r.rows[0].access_token);
const meta = typeof r.rows[0].metadata === 'string' ? JSON.parse(r.rows[0].metadata) : r.rows[0].metadata;
const igId = meta.igUserId;

try {
  const me = await axios.get(`https://graph.instagram.com/${igId}`, {
    params: { fields: 'id,username,account_type,media_count', access_token: token },
  });
  console.log('TOKEN OK:', JSON.stringify(me.data));
} catch (e: any) {
  console.log('TOKEN ERR:', JSON.stringify(e.response?.data?.error || e.message));
}
