import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt } from '../utils/encryption.js';

describe('AES-256-GCM token encryption', () => {
  const prevTokenKey = process.env.TOKEN_KEY;
  const prevEncryptionKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-min!!';
    delete process.env.TOKEN_KEY;
  });

  afterEach(() => {
    if (prevTokenKey) process.env.TOKEN_KEY = prevTokenKey;
    else delete process.env.TOKEN_KEY;
    if (prevEncryptionKey) process.env.ENCRYPTION_KEY = prevEncryptionKey;
  });

  it('round-trips access tokens with gcm prefix', () => {
    const token = 'ya29.access-token-example';
    const stored = encrypt(token);
    assert.ok(stored.startsWith('gcm:'));
    assert.equal(decrypt(stored), token);
  });

  it('uses TOKEN_KEY hex when set', () => {
    process.env.TOKEN_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const stored = encrypt('secret');
    assert.equal(decrypt(stored), 'secret');
  });
});
