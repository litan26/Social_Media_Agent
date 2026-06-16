import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { pool, setCurrentUser } from '../db/connection.js';
import { assertPostOwnedByUser } from '../db/tenant.js';

function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export class MediaService {
  static isConfigured(): boolean {
    return !!(
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
    );
  }

  static async createPresignedUpload(
    userId: number,
    postId: number,
    filename: string,
    contentType: string
  ): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME;
    if (!client || !bucket) {
      throw new Error('R2 storage is not configured');
    }

    await setCurrentUser(userId);
    await assertPostOwnedByUser(userId, postId);

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `users/${userId}/posts/${postId}/${randomUUID()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, '') || '';
    const publicUrl = publicBase ? `${publicBase}/${key}` : key;

    return { uploadUrl, publicUrl, key };
  }

  static async createPresignedLogoUpload(
    userId: number,
    filename: string,
    contentType: string
  ): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME;
    if (!client || !bucket) {
      throw new Error('R2 storage is not configured');
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `users/${userId}/brand/${randomUUID()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, '') || '';
    const publicUrl = publicBase ? `${publicBase}/${key}` : key;

    return { uploadUrl, publicUrl, key };
  }

  static async appendMediaUrl(
    userId: number,
    postId: number,
    mediaUrl: string
  ): Promise<string[]> {
    await setCurrentUser(userId);
    await assertPostOwnedByUser(userId, postId);

    await pool.query(
      `UPDATE posts
       SET media_urls = JSON_ARRAY_APPEND(COALESCE(media_urls, JSON_ARRAY()), '$', ?),
           updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [mediaUrl, postId, userId]
    );

    const result = await pool.query(
      'SELECT media_urls FROM posts WHERE id = $1 AND user_id = $2',
      [postId, userId]
    );
    const urls = result.rows[0]?.media_urls;
    return Array.isArray(urls) ? urls : JSON.parse(urls || '[]');
  }
}
