import type { Request, Response, NextFunction } from 'express';
import { sanitizeClientIp } from '../utils/csvSafe';

/**
 * D-02 / INJ-03 — resolve a trusted client IP for rate limits and audit.
 * Prefers Express `req.ip` when it is a well-formed IP; otherwise socket address.
 * Never returns formula-like / non-IP strings.
 */
export function resolveTrustedClientIp(req: Request): string {
  const fromExpress = sanitizeClientIp(req.ip);
  if (fromExpress) return fromExpress;

  const fromSocket = sanitizeClientIp(req.socket?.remoteAddress);
  if (fromSocket) return fromSocket;

  return 'unknown';
}

/**
 * Strip non-IP entries from X-Forwarded-For before Express trust-proxy logic
 * and downstream consumers see them. Keeps only well-formed IPv4/IPv6 hops.
 */
export function sanitizeForwardedForHeader(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.headers['x-forwarded-for'];
  if (raw == null) {
    next();
    return;
  }

  const parts = (Array.isArray(raw) ? raw.join(',') : raw)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const cleaned = parts
    .map((p) => sanitizeClientIp(p))
    .filter((p): p is string => Boolean(p));

  if (cleaned.length === 0) {
    delete req.headers['x-forwarded-for'];
  } else {
    req.headers['x-forwarded-for'] = cleaned.join(', ');
  }

  next();
}
