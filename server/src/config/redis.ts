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
  if (redis.status === 'ready' || redis.status === 'connecting') return;
  await redis.connect();
}
