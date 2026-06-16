import { Redis } from 'ioredis';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis as UpstashRedis } from '@upstash/redis';

export interface RateLimitConfig {
  prefix: string;
  limit: number;
  /** Window length in seconds */
  windowSec: number;
}

let ioredis: Redis | null = null;

function getIoRedis(): Redis | null {
  if (ioredis) return ioredis;
  try {
    ioredis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    ioredis.on('error', () => {});
    return ioredis;
  } catch {
    return null;
  }
}

const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(config: RateLimitConfig): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const key = `${config.prefix}:${config.limit}:${config.windowSec}`;
  if (!upstashLimiters.has(key)) {
    const redis = new UpstashRedis({ url, token });
    upstashLimiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSec} s`),
        prefix: config.prefix,
        analytics: true,
      })
    );
  }
  return upstashLimiters.get(key)!;
}

export class RateLimitService {
  static async checkUserLimit(userId: number, config: RateLimitConfig): Promise<void> {
    const identifier = String(userId);
    const upstash = getUpstashLimiter(config);

    if (upstash) {
      const { success, reset } = await upstash.limit(identifier);
      if (!success) {
        throw new RateLimitExceededError(config, reset);
      }
      return;
    }

    const redis = getIoRedis();
    if (!redis) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('Rate limiting disabled — configure UPSTASH_REDIS_REST_URL or REDIS_URL');
      }
      return;
    }

    try {
      const { ensureRedisConnected } = await import('../utils/redisConnect.js');
      await ensureRedisConnected(redis);
    } catch {
      return;
    }

    const bucketKey = `ratelimit:${config.prefix}:${userId}`;
    const count = await redis.incr(bucketKey);
    if (count === 1) {
      await redis.expire(bucketKey, config.windowSec);
    }
    if (count > config.limit) {
      const ttl = await redis.ttl(bucketKey);
      const reset = Date.now() + Math.max(ttl, 1) * 1000;
      throw new RateLimitExceededError(config, reset);
    }
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
