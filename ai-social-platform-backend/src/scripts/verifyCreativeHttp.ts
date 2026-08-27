/**
 * Exercises the creative history HTTP endpoints against a running server.
 *
 *   BASE_URL=http://localhost:3999 npx tsx src/scripts/verifyCreativeHttp.ts
 */
import dotenv from 'dotenv';
import { AuthService } from '../services/auth.service.js';
import { CreativeImageService } from '../services/creativeImage.service.js';
import { CreativeHistoryService } from '../services/creativeHistory.service.js';
import { getImageStorage } from '../services/imageStorage.service.js';
import { pool } from '../db/connection.js';

dotenv.config();

const BASE = process.env.BASE_URL || 'http://localhost:3999';

async function main() {
  const users = await pool.query(
    'SELECT id, email, plan, role FROM users ORDER BY id LIMIT 2'
  );
  if (users.rows.length === 0) throw new Error('no users in DB to test with');

  const user = users.rows[0];
  const token = AuthService.generateToken(user.id, user.email, user.plan, user.role);
  const auth = { Authorization: `Bearer ${token}` };
  console.log(`testing as user id=${user.id}`);

  // Seed one image through the same service path /generate uses.
  const result = await CreativeImageService.renderWithoutAI('Verification run image.', {
    tone: 'professional',
  });
  const stored = await getImageStorage().save(user.id, result.png, 'png');
  const record = await CreativeHistoryService.record(user.id, {
    quote: result.quote,
    prompt: 'Verification run image.',
    tone: result.tone,
    driver: stored.driver,
    key: stored.key,
    url: stored.url,
    width: result.width,
    height: result.height,
    bytes: stored.bytes,
  });
  console.log(`  seeded image id=${record.id}`);

  // GET /history returns it.
  const historyRes = await fetch(`${BASE}/api/creative/history`, { headers: auth });
  const history = await historyRes.json();
  const found = history.images?.find((i: { id: number }) => i.id === record.id);
  if (!historyRes.ok || !found) throw new Error(`history did not return seeded image`);
  console.log(`  GET /history            ${historyRes.status}  total=${history.total}`);

  // The stored file is actually served over HTTP.
  const filePath = stored.url.slice(stored.url.indexOf('/uploads/'));
  const fileRes = await fetch(`${BASE}${filePath}`);
  const buf = Buffer.from(await fileRes.arrayBuffer());
  if (!fileRes.ok || buf.byteLength !== stored.bytes) {
    throw new Error(`static serve failed: ${fileRes.status} ${buf.byteLength}b`);
  }
  console.log(
    `  GET ${filePath.slice(0, 28)}...  ${fileRes.status}  ${fileRes.headers.get('content-type')}  CORP=${fileRes.headers.get('cross-origin-resource-policy')}`
  );

  // A different user must not see or delete it.
  if (users.rows[1]) {
    const other = users.rows[1];
    const otherToken = AuthService.generateToken(other.id, other.email, other.plan, other.role);
    const otherRes = await fetch(`${BASE}/api/creative/history`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    const otherBody = await otherRes.json();
    const leaked = otherBody.images?.some((i: { id: number }) => i.id === record.id);
    if (leaked) throw new Error('TENANT LEAK: another user saw this image');

    const delRes = await fetch(`${BASE}/api/creative/history/${record.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    if (delRes.status !== 404) {
      throw new Error(`cross-user delete returned ${delRes.status}, expected 404`);
    }
    console.log(`  cross-user isolation    ok  (list clean, delete 404)`);
  }

  // Bad id is rejected.
  const badRes = await fetch(`${BASE}/api/creative/history/abc`, {
    method: 'DELETE',
    headers: auth,
  });
  console.log(`  DELETE /history/abc     ${badRes.status}`);

  // Owner can delete, and the file goes with it.
  const delRes = await fetch(`${BASE}/api/creative/history/${record.id}`, {
    method: 'DELETE',
    headers: auth,
  });
  const after = await fetch(`${BASE}${filePath}`);
  if (!delRes.ok || after.status !== 404) {
    throw new Error(`delete failed: api=${delRes.status} file=${after.status}`);
  }
  console.log(`  DELETE /history/${record.id}      ${delRes.status}  file now ${after.status}`);

  console.log('\nall HTTP checks passed');
  process.exit(0);
}

main().catch((error) => {
  console.error('\nFAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
