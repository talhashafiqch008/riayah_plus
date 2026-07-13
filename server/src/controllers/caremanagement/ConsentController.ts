import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AuditService } from '../../services/AuditService';

const CONSENT_DOCUMENT_VERSION = '1.0.0';

const grantSchema = z.object({
  consentType: z.string(),
  description: z.string().optional(),
  expiresAt: z.string().optional(),
});

function deviceFingerprint(req: Request): string {
  const header = req.headers['x-device-fingerprint'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  const ua = req.headers['user-agent'] ?? '';
  return crypto.createHash('sha256').update(`${req.ip}:${ua}`).digest('hex').slice(0, 32);
}

export class ConsentController {
  // POST /api/consents
  static async grant(req: Request, res: Response, next: NextFunction) {
    try {
      const body = grantSchema.parse(req.body);
      const userId = req.user!.userId;
      const ipAddress = req.ip;
      const fingerprint = deviceFingerprint(req);

      const consent = await prisma.consent.upsert({
        where: { userId_consentType: { userId, consentType: body.consentType } },
        create: {
          userId,
          consentType: body.consentType,
          description: body.description,
          granted: true,
          grantedAt: new Date(),
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
          documentVersion: CONSENT_DOCUMENT_VERSION,
          deviceFingerprint: fingerprint,
          ipAddress,
          signatureStatus: 'signed',
        },
        update: {
          granted: true,
          grantedAt: new Date(),
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
          revokedAt: null,
          documentVersion: CONSENT_DOCUMENT_VERSION,
          deviceFingerprint: fingerprint,
          ipAddress,
          signatureStatus: 'signed',
        },
      });

      await prisma.consentLog.create({
        data: {
          userId,
          consentType: body.consentType,
          version: CONSENT_DOCUMENT_VERSION,
          ipAddress,
          granted: true,
        },
      });

      await AuditService.log({ userId, action: 'consent_granted', entity: 'Consent', req });

      res.json({ success: true, consent });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/consents/:consentType
  static async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { consentType } = req.params;

      await prisma.consent.updateMany({
        where: { userId, consentType },
        data: { granted: false, revokedAt: new Date() },
      });

      await prisma.consentLog.create({
        data: {
          userId,
          consentType,
          version: CONSENT_DOCUMENT_VERSION,
          ipAddress: req.ip,
          granted: false,
          revokedAt: new Date(),
        },
      });

      await AuditService.log({ userId, action: 'consent_revoked', entity: 'Consent', req });

      res.json({ success: true, message: 'Consent revoked.' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/consents
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const consents = await prisma.consent.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, consents });
    } catch (err) {
      next(err);
    }
  }
}
