import { scopedQuery } from '../db/tenant.js';
import { getImageStorage, type StorageDriver } from './imageStorage.service.js';

export type CreativeImageRecord = {
  id: number;
  quote: string;
  prompt: string | null;
  tone: string;
  storage_driver: StorageDriver;
  storage_key: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
};

export class CreativeHistoryService {
  static async record(
    userId: number,
    entry: {
      quote: string;
      prompt?: string;
      tone: string;
      driver: StorageDriver;
      key: string;
      url: string;
      width: number;
      height: number;
      bytes: number;
    }
  ): Promise<CreativeImageRecord> {
    const rows = await scopedQuery<CreativeImageRecord>(
      userId,
      `INSERT INTO creative_images
         (user_id, quote, prompt, tone, storage_driver, storage_key, url, width, height, bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        entry.quote,
        entry.prompt ?? null,
        entry.tone,
        entry.driver,
        entry.key,
        entry.url,
        entry.width,
        entry.height,
        entry.bytes,
      ]
    );
    return rows[0];
  }

  static async list(userId: number, limit = 50, offset = 0): Promise<CreativeImageRecord[]> {
    return scopedQuery<CreativeImageRecord>(
      userId,
      `SELECT * FROM creative_images
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, Math.min(limit, 100), offset]
    );
  }

  static async count(userId: number): Promise<number> {
    const rows = await scopedQuery<{ count: string }>(
      userId,
      'SELECT COUNT(*)::text AS count FROM creative_images WHERE user_id = $1',
      [userId]
    );
    return Number(rows[0]?.count ?? 0);
  }

  /** Deletes the DB row and the stored file. Scoped so users cannot delete others' images. */
  static async remove(userId: number, imageId: number): Promise<boolean> {
    const rows = await scopedQuery<CreativeImageRecord>(
      userId,
      'DELETE FROM creative_images WHERE id = $1 AND user_id = $2 RETURNING *',
      [imageId, userId]
    );

    const deleted = rows[0];
    if (!deleted) return false;

    // Row is already gone; a failed file delete leaves an orphan, not a broken gallery.
    try {
      await getImageStorage().delete(deleted.storage_key);
    } catch {
      /* ignore */
    }

    return true;
  }
}
