import crypto from 'crypto';

const GCM_ALGORITHM = 'aes-256-gcm';
const CBC_ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey(): Buffer {
  const tokenKeyHex = process.env.TOKEN_ENCRYPTION_KEY || process.env.TOKEN_KEY;
  if (tokenKeyHex && /^[0-9a-fA-F]{64}$/.test(tokenKeyHex)) {
    return Buffer.from(tokenKeyHex, 'hex');
  }
  const secret = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production!!';
  return crypto.scryptSync(secret, 'salt', 32);
}

/** AES-256-GCM — stores iv + auth tag + ciphertext (decrypt only at publish/refresh time). */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `gcm:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(stored: string): string {
  const key = getKey();

  if (stored.startsWith('gcm:')) {
    const parts = stored.split(':');
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const ciphertext = parts[3];
    const decipher = crypto.createDecipheriv(GCM_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Legacy AES-256-CBC (iv:ciphertext)
  const [ivHex, ciphertext] = stored.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(CBC_ALGORITHM, key, iv);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
