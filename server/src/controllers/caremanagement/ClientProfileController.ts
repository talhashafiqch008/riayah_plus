import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

const profileSchema = z.object({
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('QA'),
  postalCode: z.string().optional(),
  language: z.string().default('en'),
  nationalId: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insuranceNumber: z.string().optional(),
  medicalNotes: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  preferredCareTypes: z.array(z.string()).optional(),
});

export class ClientProfileController {
  // GET /api/client/profile
  static async show(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await prisma.clientProfile.findUnique({ where: { userId: req.user!.userId } });
      res.json({ success: true, profile: profile ?? null });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/client/profile — upsert
  static async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const body = profileSchema.parse(req.body);
      const profile = await prisma.clientProfile.upsert({
        where: { userId: req.user!.userId },
        create: {
          userId: req.user!.userId,
          ...body,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        },
        update: {
          ...body,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        },
      });
      res.json({ success: true, profile });
    } catch (err) {
      next(err);
    }
  }
}
