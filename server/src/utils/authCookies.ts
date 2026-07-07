import { Request, Response } from 'express';
import { env } from '../config/env';

/** Matches Next.js proxy cookie name for access JWT */
export const ACCESS_TOKEN_COOKIE = 'token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax' as const,
    path: '/',
  };
}

export function getAccessTokenFromRequest(req: Request): string | undefined {
  const fromCookie = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
  if (fromCookie) return fromCookie;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return undefined;
}

export function getRefreshTokenFromRequest(req: Request): string | undefined {
  const fromCookie = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
  if (fromCookie) return fromCookie;

  const body = req.body as { refreshToken?: string } | undefined;
  return body?.refreshToken;
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken?: string,
): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: ACCESS_MAX_AGE_MS,
  });

  if (refreshToken) {
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...baseCookieOptions(),
      maxAge: REFRESH_MAX_AGE_MS,
    });
  }
}

export function clearAuthCookies(res: Response): void {
  const opts = { path: '/' };
  res.clearCookie(ACCESS_TOKEN_COOKIE, opts);
  res.clearCookie(REFRESH_TOKEN_COOKIE, opts);
}
