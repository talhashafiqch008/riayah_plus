import Redis from 'ioredis';
import { env } from './env';

export const redisConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
} as const;

export const redis = new Redis(redisConnectionOptions);

/** BullMQ connection config — use options object to avoid ioredis version mismatch with bullmq's nested dependency. */
export const bullmqConnection = { connection: { ...redisConnectionOptions } };

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err.message));

export async function connectRedis(): Promise<void> {
  try {
    // ioredis can already be mid-connect after a nodemon reload / hot import
    if (['ready', 'connecting', 'connect', 'wait'].includes(redis.status)) return;
    await redis.connect();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('already connecting') || message.includes('already connected')) {
      return;
    }
    throw err;
  }
}
