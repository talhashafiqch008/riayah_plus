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

/**
 * AUTH-21: ipAddress / userAgent / deviceId are stored for forensic display only.
 * They are intentionally NOT enforced on refresh — stolen tokens work from any
 * network until revoked. Binding would require a product grace policy.
 */
export async function persistRefreshToken(
  userId: string,
  plainToken: string,
  req: Request,
  familyId?: string,
): Promise<RefreshToken> {
  // New login starts a family; rotation continues the existing familyId.
  const id = crypto.randomBytes(16).toString('hex');
  const resolvedFamilyId = familyId ?? id;

  return prisma.refreshToken.create({
    data: {
      id,
      userId,
      familyId: resolvedFamilyId,
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

/**
 * AUTH-02: Atomically claim an unrevoked refresh token for rotation.
 * Returns null if already revoked / missing (caller handles reuse detection).
 */
export async function claimRefreshTokenForRotation(
  tokenId: string,
  userId: string,
): Promise<RefreshToken | null> {
  const result = await prisma.refreshToken.updateMany({
    where: { id: tokenId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count !== 1) return null;

  return prisma.refreshToken.findUnique({ where: { id: tokenId } });
}

/** AUTH-02: On reuse of a revoked family member, kill the entire family. */
export async function revokeRefreshTokenFamily(
  familyId: string,
  userId: string,
): Promise<number> {
  const result = await prisma.refreshToken.updateMany({
    where: { familyId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
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
