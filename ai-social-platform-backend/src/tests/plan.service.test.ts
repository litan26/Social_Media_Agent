import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN_LIMITS } from '../config/plans.js';

describe('Plan limits config', () => {
  it('free plan allows 5 AI generations per month and 7 connected accounts', () => {
    assert.equal(PLAN_LIMITS.free.aiGenerationsPerMonth, 5);
    assert.equal(PLAN_LIMITS.free.maxAccounts, 7);
  });
});
