import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { redis } from '../config/redis';

const MFA_PENDING_TTL_SECONDS = 5 * 60;
const MFA_PENDING_TYP = 'mfa_pending';

type MfaPendingPayload = {
  typ: typeof MFA_PENDING_TYP;
  userId: string;
  jti: string;
};

/** AUTH-11: short-lived signed binder between password step and 2FA verify. */
export function issueMfaPendingToken(userId: string): string {
  const jti = randomUUID();
  void redis
    .set(`auth:mfa_pending:${jti}`, userId, 'EX', MFA_PENDING_TTL_SECONDS)
    .catch(() => undefined);

  return jwt.sign(
    { typ: MFA_PENDING_TYP, userId, jti } satisfies MfaPendingPayload,
    env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: MFA_PENDING_TTL_SECONDS },
  );
}

export async function consumeMfaPendingToken(token: string): Promise<string> {
  let payload: MfaPendingPayload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as MfaPendingPayload;
  } catch {
    throw new Error('INVALID_MFA_PENDING');
  }

  if (payload.typ !== MFA_PENDING_TYP || !payload.userId || !payload.jti) {
    throw new Error('INVALID_MFA_PENDING');
  }

  const key = `auth:mfa_pending:${payload.jti}`;
  try {
    const stored = await redis.get(key);
    if (stored === 'used') throw new Error('INVALID_MFA_PENDING');
    if (stored && stored !== payload.userId) throw new Error('INVALID_MFA_PENDING');
    // Mark consumed (single-use). If Redis never saw the issue SET, still bind via JWT.
    await redis.set(key, 'used', 'EX', MFA_PENDING_TTL_SECONDS);
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_MFA_PENDING') throw err;
    // Redis unavailable — JWT typ/exp/userId still enforce sequencing
  }

  return payload.userId;
}
