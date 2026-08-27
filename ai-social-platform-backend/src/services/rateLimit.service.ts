export interface RateLimitConfig {
  prefix: string;
  limit: number;
  /** Window length in seconds */
  windowSec: number;
}

interface Bucket {
  count: number;
  /** Epoch ms when the window expires and the count resets */
  resetAt: number;
}

/**
 * In-process fixed-window counters. State lives in this process only, so a
 * multi-instance deployment limits per instance rather than globally.
 */
const buckets = new Map<string, Bucket>();

/** Drop expired buckets so the map does not grow without bound. */
function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

export class RateLimitService {
  static async checkUserLimit(userId: number, config: RateLimitConfig): Promise<void> {
    const now = Date.now();

    if (now - lastSweep > SWEEP_INTERVAL_MS) {
      sweep(now);
      lastSweep = now;
    }

    const key = `${config.prefix}:${userId}`;
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + config.windowSec * 1000 });
      return;
    }

    existing.count += 1;
    if (existing.count > config.limit) {
      throw new RateLimitExceededError(config, existing.resetAt);
    }
  }

  /** Test helper — clears all counters. */
  static reset(): void {
    buckets.clear();
    lastSweep = 0;
  }
}

export class RateLimitExceededError extends Error {
  readonly statusCode = 429;
  readonly reset: number;

  constructor(config: RateLimitConfig, reset: number) {
    super(`Rate limit exceeded: ${config.limit} requests per ${config.windowSec}s`);
    this.name = 'RateLimitExceededError';
    this.reset = reset;
  }
}

export const RATE_LIMITS = {
  generate: { prefix: 'generate', limit: 10, windowSec: 60 } satisfies RateLimitConfig,
  publishNow: { prefix: 'publish-now', limit: 60, windowSec: 3600 } satisfies RateLimitConfig,
};
