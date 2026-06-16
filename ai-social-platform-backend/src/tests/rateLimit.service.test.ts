import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RATE_LIMITS } from '../services/rateLimit.service.js';

describe('Rate limit config', () => {
  it('generate route: 10 per minute', () => {
    assert.equal(RATE_LIMITS.generate.limit, 10);
    assert.equal(RATE_LIMITS.generate.windowSec, 60);
  });

  it('publish-now route: 60 per hour', () => {
    assert.equal(RATE_LIMITS.publishNow.limit, 60);
    assert.equal(RATE_LIMITS.publishNow.windowSec, 3600);
  });
});
