import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

const schema = z.object({
  name: z.string().min(2),
  relationship: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  canReceiveUpdates: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
});

export class FamilyMemberController {
  // POST /api/family-members
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = schema.parse(req.body);
      const member = await prisma.familyMember.create({
        data: { ...body, managerId: req.user!.userId },
      });
      res.status(201).json({ success: true, member });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/family-members
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await prisma.familyMember.findMany({ where: { managerId: req.user!.userId }, orderBy: { createdAt: 'desc' } });
      res.json({ success: true, members });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/family-members/:id
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = schema.partial().parse(req.body);
      const member = await prisma.familyMember.findUnique({ where: { id: req.params.id } });
      if (!member) throw new AppError('Family member not found.', 404);
      if (member.managerId !== req.user!.userId) throw new AppError('Forbidden.', 403);
      const updated = await prisma.familyMember.update({ where: { id: req.params.id }, data: body });
      res.json({ success: true, member: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/family-members/:id
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await prisma.familyMember.findUnique({ where: { id: req.params.id } });
      if (!member) throw new AppError('Family member not found.', 404);
      if (member.managerId !== req.user!.userId) throw new AppError('Forbidden.', 403);
      await prisma.familyMember.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Family member removed.' });
    } catch (err) {
      next(err);
    }
  }
}
