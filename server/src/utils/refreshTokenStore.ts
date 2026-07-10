import { Request } from 'express';
import { prisma } from '../config/database';
import { RefreshToken } from '@prisma/client';
import { hashRefreshToken, isLegacyPlainRefreshToken } from './refreshTokenHash';

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  if (byHash) return byHash;

  const legacy = await prisma.refreshToken.findUnique({ where: { token: plainToken } });
  if (legacy && isLegacyPlainRefreshToken(legacy.token)) return legacy;

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
