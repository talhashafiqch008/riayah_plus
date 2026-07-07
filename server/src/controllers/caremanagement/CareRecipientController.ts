import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

const recipientSchema = z.object({
  name: z.string().min(2),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  relationship: z.string().optional(),
  notes: z.string().optional(),
  medicalInfo: z.record(z.unknown()).optional(),
});

export class CareRecipientController {
  // POST /api/care-recipients
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = recipientSchema.parse(req.body);
      const recipient = await prisma.careRecipient.create({
        data: {
          userId: req.user!.userId,
          name: body.name,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
          gender: body.gender,
          relationship: body.relationship,
          notes: body.notes,
          medicalInfo: body.medicalInfo ? body.medicalInfo as Prisma.InputJsonValue : undefined,
        },
      });
      res.status(201).json({ success: true, recipient });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/care-recipients
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const recipients = await prisma.careRecipient.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, recipients });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/care-recipients/:id
  static async show(req: Request, res: Response, next: NextFunction) {
    try {
      const recipient = await prisma.careRecipient.findUnique({ where: { id: req.params.id } });
      if (!recipient) throw new AppError('Care recipient not found.', 404);
      if (recipient.userId !== req.user!.userId) throw new AppError('Forbidden.', 403);
      res.json({ success: true, recipient });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/care-recipients/:id
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = recipientSchema.partial().parse(req.body);
      const recipient = await prisma.careRecipient.findUnique({ where: { id: req.params.id } });
      if (!recipient) throw new AppError('Care recipient not found.', 404);
      if (recipient.userId !== req.user!.userId) throw new AppError('Forbidden.', 403);

      const updated = await prisma.careRecipient.update({
        where: { id: req.params.id },
        data: {
          ...body,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
          medicalInfo: body.medicalInfo ? body.medicalInfo as Prisma.InputJsonValue : undefined,
        },
      });
      res.json({ success: true, recipient: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/care-recipients/:id
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const recipient = await prisma.careRecipient.findUnique({ where: { id: req.params.id } });
      if (!recipient) throw new AppError('Care recipient not found.', 404);
      if (recipient.userId !== req.user!.userId) throw new AppError('Forbidden.', 403);
      await prisma.careRecipient.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Care recipient removed.' });
    } catch (err) {
      next(err);
    }
  }
}
