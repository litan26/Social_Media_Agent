import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Storage for generated creative images.
 *
 * Local disk is the default and needs no configuration. S3 is available for
 * deployments where the app runs on ephemeral disks (containers, autoscaling),
 * where local files vanish on restart. Both drivers implement the same
 * interface so callers never learn which one is active.
 */
export type StorageDriver = 'local' | 's3';

export type StoredImage = {
  driver: StorageDriver;
  /** Driver-relative key, e.g. "3/a1b2c3.png". Never an absolute path. */
  key: string;
  /** URL a browser can load the image from. */
  url: string;
  bytes: number;
};

export interface ImageStorage {
  readonly driver: StorageDriver;
  save(userId: number, data: Buffer, ext: string): Promise<StoredImage>;
  delete(key: string): Promise<void>;
}

/** Uploads live outside src/ so tsx watch does not restart on every render. */
const LOCAL_ROOT = path.resolve(process.cwd(), 'uploads', 'creative');
const PUBLIC_PREFIX = '/uploads/creative';

function randomName(ext: string): string {
  return `${crypto.randomBytes(16).toString('hex')}.${ext}`;
}

/**
 * Reject keys that would escape the storage root. Keys are generated
 * internally today, but delete() is one refactor away from taking user input.
 */
function assertSafeKey(key: string): void {
  if (!/^\d+\/[a-f0-9]{32}\.[a-z0-9]{2,4}$/i.test(key)) {
    throw new Error('Invalid storage key');
  }
}

class LocalImageStorage implements ImageStorage {
  readonly driver = 'local' as const;

  async save(userId: number, data: Buffer, ext: string): Promise<StoredImage> {
    const key = `${userId}/${randomName(ext)}`;
    const target = path.join(LOCAL_ROOT, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);

    const base = process.env.API_URL?.replace(/\/$/, '') || '';
    return {
      driver: this.driver,
      key,
      url: `${base}${PUBLIC_PREFIX}/${key}`,
      bytes: data.byteLength,
    };
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    await fs.rm(path.join(LOCAL_ROOT, key), { force: true });
  }
}

/**
 * S3 driver. Kept behind the same interface so switching is a config change,
 * not a code change. Enabled by setting IMAGE_STORAGE_DRIVER=s3 plus the
 * S3_BUCKET / AWS credentials the SDK already expects.
 */
class S3ImageStorage implements ImageStorage {
  readonly driver = 's3' as const;

  constructor(private readonly bucket: string) {}

  async save(userId: number, data: Buffer, ext: string): Promise<StoredImage> {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({});
    const key = `creative/${userId}/${randomName(ext)}`;

    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      })
    );

    const base =
      process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
      `https://${this.bucket}.s3.amazonaws.com`;

    return { driver: this.driver, key, url: `${base}/${key}`, bytes: data.byteLength };
  }

  async delete(key: string): Promise<void> {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({});
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let cached: ImageStorage | null = null;

export function getImageStorage(): ImageStorage {
  if (cached) return cached;

  if (process.env.IMAGE_STORAGE_DRIVER?.trim() === 's3') {
    const bucket = process.env.S3_BUCKET?.trim();
    if (!bucket) throw new Error('IMAGE_STORAGE_DRIVER=s3 requires S3_BUCKET to be set');
    cached = new S3ImageStorage(bucket);
  } else {
    cached = new LocalImageStorage();
  }

  return cached;
}

export const LOCAL_STORAGE_ROOT = LOCAL_ROOT;
export const LOCAL_PUBLIC_PREFIX = PUBLIC_PREFIX;
