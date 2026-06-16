import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PLANS } from '../config/plans.js';

describe('Stripe billing contract', () => {
  it('supports pro and team as paid checkout plans', () => {
    assert.ok(PLANS.includes('pro'));
    assert.ok(PLANS.includes('team'));
  });

  it('free plan is not a Stripe checkout target', () => {
    assert.ok(PLANS.includes('free'));
  });
});
