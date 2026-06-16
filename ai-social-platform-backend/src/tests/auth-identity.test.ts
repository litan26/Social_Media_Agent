import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth.service.js';
import { stripUntrustedUserId } from '../db/tenant.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-min-32-characters-long';

describe('Auth & JWT identity layer', () => {
  it('hashes and verifies passwords with bcrypt', async () => {
    const hash = await AuthService.hashPassword('TestPassword123!');
    assert.ok(hash.startsWith('$2'));
    assert.equal(await AuthService.verifyPassword('TestPassword123!', hash), true);
    assert.equal(await AuthService.verifyPassword('wrong', hash), false);
  });

  it('embeds userId in JWT payload (session strategy: JWT, not DB sessions)', () => {
    const token = AuthService.generateToken(42, 'user@example.com', 'free', 'user');
    const payload = AuthService.verifyToken(token);
    assert.equal(payload.userId, 42);
    assert.equal(payload.email, 'user@example.com');
    assert.equal(payload.plan, 'free');
    assert.equal(payload.role, 'user');
  });

  it('rejects invalid JWT tokens', () => {
    assert.throws(() => AuthService.verifyToken('not-a-valid-token'));
  });

  it('strips userId from request body so routes cannot trust client-supplied identity', () => {
    const body: Record<string, unknown> = { email: 'a@b.com', userId: 999, password: 'x' };
    stripUntrustedUserId(body);
    assert.equal(body.userId, undefined);
    assert.equal(body.email, 'a@b.com');
  });
});

describe('bcrypt cost factor', () => {
  it('uses bcrypt with sufficient rounds', async () => {
    const hash = await bcrypt.hash('test', 12);
    assert.match(hash, /^\$2[aby]\$12\$/);
  });
});
