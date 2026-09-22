import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Verify Meta WhatsApp Cloud API `X-Hub-Signature-256` (INJ-10).
 * Expects `req.body` to be a Buffer (express.raw on the webhook mount).
 */
export function verifyWhatsAppSignature(req: Request, res: Response, next: NextFunction): void {
  const secret = env.WHATSAPP_APP_SECRET?.trim();
  if (!secret) {
    if (env.isProd) {
      logger.error('whatsapp_webhook_secret_missing');
      res.sendStatus(503);
      return;
    }
    logger.warn('whatsapp_webhook_signature_skipped', {
      reason: 'WHATSAPP_APP_SECRET unset (non-production)',
    });
    next();
    return;
  }

  const header = req.get('x-hub-signature-256') || req.get('X-Hub-Signature-256');
  if (!header || !header.startsWith('sha256=')) {
    res.sendStatus(401);
    return;
  }

  const raw = req.body;
  if (!Buffer.isBuffer(raw)) {
    // Parsed JSON path (e.g. accidental mount under /api/whatsapp) cannot verify HMAC.
    if (secret) {
      res.sendStatus(401);
      return;
    }
    next();
    return;
  }

  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const provided = header.slice('sha256='.length);
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(provided, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.sendStatus(401);
      return;
    }
  } catch {
    res.sendStatus(401);
    return;
  }

  next();
}

/** Parse JSON body after signature verification on a raw Buffer. */
export function parseWhatsAppRawBody(req: Request): unknown {
  if (Buffer.isBuffer(req.body)) {
    const text = req.body.toString('utf8');
    if (!text) return {};
    return JSON.parse(text) as unknown;
  }
  return req.body;
}
