import { Request } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { RefreshToken } from '@prisma/client';
import { hashRefreshToken } from './refreshTokenHash';

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

// A-10: lookup by hashed token only — legacy plaintext fallback removed
export async function findRefreshTokenByPlain(plainToken: string): Promise<RefreshToken | null> {
  const hashed = hashRefreshToken(plainToken);
  const byHash = await prisma.refreshToken.findUnique({ where: { token: hashed } });
  if (byHash && timingSafeEqualHex(byHash.token, hashed)) return byHash;
  return null;
}

export async function revokeRefreshTokenByPlain(
  plainToken: string,
  userId?: string,
): Promise<{ count: number }> {
  const hashed = hashRefreshToken(plainToken);
  const result = await prisma.refreshToken.updateMany({
    where: {
      token: hashed,
      ...(userId ? { userId } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return { count: result.count };
}
