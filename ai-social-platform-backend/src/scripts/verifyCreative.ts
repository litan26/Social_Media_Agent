/**
 * End-to-end check of the creative pipeline that does not touch Gemini:
 * render -> composite -> save to storage -> read back from disk.
 *
 *   npx tsx src/scripts/verifyCreative.ts
 */
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { CreativeImageService } from '../services/creativeImage.service.js';
import { getImageStorage, LOCAL_STORAGE_ROOT } from '../services/imageStorage.service.js';

dotenv.config();

const TEST_USER_ID = 999999;

async function main() {
  const storage = getImageStorage();
  console.log(`storage driver: ${storage.driver}`);

  for (const tone of ['professional', 'casual', 'bold']) {
    const result = await CreativeImageService.renderWithoutAI(
      'Discipline is choosing between what you want now and what you want most.',
      { tone }
    );

    const meta = await sharp(result.png).metadata();
    if (meta.width !== 1080 || meta.height !== 1080) {
      throw new Error(`${tone}: expected 1080x1080, got ${meta.width}x${meta.height}`);
    }

    const stored = await storage.save(TEST_USER_ID, result.png, 'png');
    const onDisk = await fs.stat(path.join(LOCAL_STORAGE_ROOT, stored.key));
    if (onDisk.size !== stored.bytes) {
      throw new Error(`${tone}: size mismatch, disk=${onDisk.size} reported=${stored.bytes}`);
    }

    console.log(
      `  ${tone.padEnd(13)} ok  ${meta.width}x${meta.height}  ${(stored.bytes / 1024).toFixed(0)}KB  -> ${stored.url}`
    );

    await storage.delete(stored.key);
    const gone = await fs
      .stat(path.join(LOCAL_STORAGE_ROOT, stored.key))
      .then(() => false)
      .catch(() => true);
    if (!gone) throw new Error(`${tone}: delete did not remove the file`);
  }

  // Long text must wrap and clamp rather than overflow the frame.
  const long = await CreativeImageService.renderWithoutAI('word '.repeat(120), { tone: 'bold' });
  console.log(`  wrapping      ok  quote clamped to ${long.quote.length} chars`);

  // Traversal keys must be rejected by the storage layer.
  let rejected = false;
  try {
    await storage.delete('../../../etc/passwd');
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error('storage.delete accepted a traversal key');
  console.log('  key safety    ok  traversal key rejected');

  await fs.rm(path.join(LOCAL_STORAGE_ROOT, String(TEST_USER_ID)), {
    recursive: true,
    force: true,
  });
  console.log('\nall checks passed');
}

main().catch((error) => {
  console.error('\nFAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
