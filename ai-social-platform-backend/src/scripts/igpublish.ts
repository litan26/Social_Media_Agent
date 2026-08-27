/**
 * Manual end-to-end check of the Instagram publish path.
 * Usage: npx tsx src/scripts/igpublish.ts "<image_url>" "<caption>"
 */
import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
import axios from 'axios';
import { decrypt } from '../utils/encryption.js';

const GRAPH = 'https://graph.instagram.com';

const imageUrl = process.argv[2];
const caption = process.argv[3] ?? 'Test post';

if (!imageUrl) {
  console.error('Usage: igpublish.ts <image_url> [caption]');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

const r = await pool.query(
  "SELECT access_token, metadata FROM social_accounts WHERE platform='instagram' LIMIT 1"
);
await pool.end();

const token = decrypt(r.rows[0].access_token);
const meta =
  typeof r.rows[0].metadata === 'string' ? JSON.parse(r.rows[0].metadata) : r.rows[0].metadata;
const igId = meta.igUserId;

function err(e: any) {
  return JSON.stringify(e.response?.data?.error || e.message);
}

try {
  console.log('1/3 creating container...');
  const container = await axios.post(`${GRAPH}/${igId}/media`, null, {
    params: { image_url: imageUrl, caption, access_token: token },
  });
  const creationId = String(container.data.id);
  console.log('    container id:', creationId);

  console.log('2/3 waiting for media processing...');
  let status = '';
  for (let i = 0; i < 10; i++) {
    const s = await axios.get(`${GRAPH}/${creationId}`, {
      params: { fields: 'status_code,status', access_token: token },
    });
    status = s.data.status_code;
    console.log(`    attempt ${i + 1}: ${status}`);
    if (status === 'FINISHED') break;
    if (status === 'ERROR' || status === 'EXPIRED') {
      console.error('    detail:', s.data.status);
      process.exit(1);
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
  if (status !== 'FINISHED') {
    console.error('timed out waiting for FINISHED');
    process.exit(1);
  }

  console.log('3/3 publishing...');
  const published = await axios.post(`${GRAPH}/${igId}/media_publish`, null, {
    params: { creation_id: creationId, access_token: token },
  });
  console.log('PUBLISHED id:', published.data.id);

  const check = await axios.get(`https://graph.instagram.com/${published.data.id}`, {
    params: { fields: 'id,permalink,caption,media_type', access_token: token },
  });
  console.log('LIVE:', JSON.stringify(check.data));
} catch (e) {
  console.error('FAILED:', err(e));
  process.exit(1);
}
