import { redis } from '../config/redis';
import { logger } from '../config/logger';

const LOCK_PREFIX = 'paytabs:webhook:';
const LOCK_TTL_SECONDS = 600;

/** Redis NX lock — prevents concurrent duplicate processing of the same tran_ref (M2). */
export async function acquirePaytabsTranRefLock(tranRef: string): Promise<boolean> {
  const key = `${LOCK_PREFIX}${tranRef}`;
  try {
    const result = await redis.set(key, '1', 'EX', LOCK_TTL_SECONDS, 'NX');
    return result === 'OK';
  } catch (err) {
    logger.warn('PayTabs webhook lock unavailable; relying on DB idempotency only', { tranRef, err });
    return true;
  }
}

export async function releasePaytabsTranRefLock(tranRef: string): Promise<void> {
  try {
    await redis.del(`${LOCK_PREFIX}${tranRef}`);
  } catch {
    // non-fatal
  }
}
