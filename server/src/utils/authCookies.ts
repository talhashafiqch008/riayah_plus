import { Request, Response } from 'express';
import { env } from '../config/env';

/**
 * Cookie names:
 * - Production: `__Host-` prefix (Secure required, no Domain, Path=/)
 * - Non-prod: plain names so local HTTP still works
 */
export const ACCESS_TOKEN_COOKIE = env.isProd ? '__Host-token' : 'token';
export const REFRESH_TOKEN_COOKIE = env.isProd ? '__Host-refresh_token' : 'refresh_token';

/** Legacy names cleared on logout/set so old cookies cannot linger after rename. */
const LEGACY_ACCESS_COOKIES = ['token', '__Host-token'];
const LEGACY_REFRESH_COOKIES = ['refresh_token', '__Host-refresh_token'];

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function accessCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict' as const,
    path: '/',
  };
}

// A-8: refresh token uses strict to prevent it being sent on any cross-site navigation
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict' as const,
    path: '/',
  };
}

/**
 * Prefer Authorization Bearer over cookie so an intentional API token
 * is not overridden by a stale SPA cookie (M3 auth finding).
 */
export function getAccessTokenFromRequest(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  const fromCookie = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
  if (fromCookie) return fromCookie;

  // Accept legacy cookie name during rollout
  for (const name of LEGACY_ACCESS_COOKIES) {
    if (name === ACCESS_TOKEN_COOKIE) continue;
    const legacy = req.cookies?.[name] as string | undefined;
    if (legacy) return legacy;
  }
  return undefined;
}

/** Cookie-only — no body.refreshToken fallback (M1 / M3 auth finding). */
export function getRefreshTokenFromRequest(req: Request): string | undefined {
  const fromCookie = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
  if (fromCookie) return fromCookie;

  for (const name of LEGACY_REFRESH_COOKIES) {
    if (name === REFRESH_TOKEN_COOKIE) continue;
    const legacy = req.cookies?.[name] as string | undefined;
    if (legacy) return legacy;
  }
  return undefined;
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken?: string,
): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...accessCookieOptions(),
    maxAge: ACCESS_MAX_AGE_MS,
  });

  if (refreshToken) {
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...refreshCookieOptions(),
      maxAge: REFRESH_MAX_AGE_MS,
    });
  }
}

export function clearAuthCookies(res: Response): void {
  const clearOne = (name: string) => {
    // __Host- cookies require Secure=true to clear
    const secure = name.startsWith('__Host-') || env.isProd;
    res.clearCookie(name, { path: '/', secure });
  };
  for (const name of new Set([...LEGACY_ACCESS_COOKIES, ACCESS_TOKEN_COOKIE])) {
    clearOne(name);
  }
  for (const name of new Set([...LEGACY_REFRESH_COOKIES, REFRESH_TOKEN_COOKIE])) {
    clearOne(name);
  }
}
