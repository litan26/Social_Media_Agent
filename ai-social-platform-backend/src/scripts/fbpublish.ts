/**
 * Manual end-to-end check of the Facebook Page publish path.
 * Usage: npx tsx src/scripts/fbpublish.ts "<message>" [image_url]
 */
import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
import axios from 'axios';
import { decrypt } from '../utils/encryption.js';

const GRAPH = 'https://graph.facebook.com/v21.0';

const message = process.argv[2] ?? 'Test post';
const imageUrl = process.argv[3];

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

try {
  let postId: string;

  if (imageUrl) {
    console.log('publishing photo to', meta.pageName, '...');
    const res = await axios.post(`${GRAPH}/${meta.pageId}/photos`, null, {
      params: { url: imageUrl, caption: message, access_token: pageToken },
    });
    postId = String(res.data.post_id || res.data.id);
  } else {
    console.log('publishing text post to', meta.pageName, '...');
    const res = await axios.post(`${GRAPH}/${meta.pageId}/feed`, null, {
      params: { message, access_token: pageToken },
    });
    postId = String(res.data.id);
  }

  console.log('PUBLISHED id:', postId);

  const check = await axios.get(`${GRAPH}/${postId}`, {
    params: { fields: 'id,message,permalink_url,created_time', access_token: pageToken },
  });
  console.log('LIVE:', JSON.stringify(check.data));
} catch (e: any) {
  console.error('FAILED:', JSON.stringify(e.response?.data?.error || e.message));
  process.exit(1);
}
