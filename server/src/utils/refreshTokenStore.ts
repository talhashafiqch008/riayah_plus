import { Request } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { RefreshToken } from '@prisma/client';
import { hashRefreshToken, isLegacyPlainRefreshToken } from './refreshTokenHash';

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function persistRefreshToken(
  userId: string,
  plainToken: string,
  req: Request,
): Promise<RefreshToken> {
  return prisma.refreshToken.create({
    data: {
      userId,
      token: hashRefreshToken(plainToken),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
}

/** Lookup by plain refresh JWT; supports legacy rows that still store the raw token. */
export async function findRefreshTokenByPlain(plainToken: string): Promise<RefreshToken | null> {
  const hashed = hashRefreshToken(plainToken);
  const byHash = await prisma.refreshToken.findUnique({ where: { token: hashed } });
  // M-49: constant-time compare on hashed form
  if (byHash && timingSafeEqualHex(byHash.token, hashed)) return byHash;

  const legacy = await prisma.refreshToken.findUnique({ where: { token: plainToken } });
  if (
    legacy &&
    isLegacyPlainRefreshToken(legacy.token) &&
    timingSafeEqualHex(legacy.token, plainToken)
  ) {
    return legacy;
  }

  return null;
}

export async function revokeRefreshTokenByPlain(
  plainToken: string,
  userId?: string,
): Promise<{ count: number }> {
  const hashed = hashRefreshToken(plainToken);
  const result = await prisma.refreshToken.updateMany({
    where: {
      OR: [{ token: hashed }, { token: plainToken }],
      ...(userId ? { userId } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return { count: result.count };
}
