import type { Redis } from 'ioredis';

/** Connect or wait for an in-flight connection without throwing "already connecting". */
export async function ensureRedisConnected(redis: Redis): Promise<void> {
  if (redis.status === 'ready') return;

  if (redis.status === 'connecting') {
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        redis.off('ready', onReady);
        redis.off('error', onError);
      };
      redis.once('ready', onReady);
      redis.once('error', onError);
    });
    return;
  }

  if (redis.status === 'wait') {
    await redis.connect();
  }
}
