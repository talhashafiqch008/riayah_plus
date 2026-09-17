import speakeasy from 'speakeasy';
import { prisma } from '../config/database';

const TOTP_STEP_SECONDS = 30;
const TOTP_WINDOW = 1;

/**
 * AUTH-10: Verify TOTP and reject replay of the same (or older) time-step.
 * Persists the accepted counter on success.
 */
export async function verifyTotpNoReplay(
  userId: string,
  secret: string,
  token: string,
): Promise<boolean> {
  const nowStep = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastTotpStep: true },
  });

  for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta++) {
    const candidateStep = nowStep + delta;
    if (user?.lastTotpStep != null && candidateStep <= user.lastTotpStep) {
      continue;
    }
    const expected = speakeasy.totp({
      secret,
      encoding: 'base32',
      step: TOTP_STEP_SECONDS,
      time: candidateStep * TOTP_STEP_SECONDS,
    });
    if (expected === token) {
      await prisma.user.update({
        where: { id: userId },
        data: { lastTotpStep: candidateStep },
      });
      return true;
    }
  }
  return false;
}
