import type { RowDataPacket } from 'mysql2';
import { pool, query, setCurrentUser } from './connection.js';

/**
 * All tenant data access must go through helpers that require userId from JWT (never from body).
 */
export async function scopedQuery<T = RowDataPacket>(
  userId: number,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  await setCurrentUser(userId);
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function assertPostOwnedByUser(userId: number, postId: number): Promise<void> {
  const rows = await scopedQuery<{ id: number }>(
    userId,
    'SELECT id FROM posts WHERE id = $1 AND user_id = $2 LIMIT 1',
    [postId, userId]
  );
  if (rows.length === 0) {
    throw new Error('Post not found');
  }
}

export async function getPostsByUser(userId: number, limit = 50) {
  return scopedQuery(
    userId,
    'SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
}

/** Reject attempts to pass userId in request body (identity must come from JWT only). */
export function stripUntrustedUserId(body: unknown): void {
  if (body && typeof body === 'object' && 'userId' in body) {
    delete (body as Record<string, unknown>).userId;
  }
}
