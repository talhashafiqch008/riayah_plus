import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';

const grantSchema = z.object({
  consentType: z.string(),
  description: z.string().optional(),
  expiresAt: z.string().optional(),
});

export class ConsentController {
  // POST /api/consents
  static async grant(req: Request, res: Response, next: NextFunction) {
    try {
      const body = grantSchema.parse(req.body);
      const userId = req.user!.userId;

      const consent = await prisma.consent.upsert({
        where: { userId_consentType: { userId, consentType: body.consentType } },
        create: {
          userId,
          consentType: body.consentType,
          description: body.description,
          granted: true,
          grantedAt: new Date(),
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        },
        update: { granted: true, grantedAt: new Date(), expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined, revokedAt: null },
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
