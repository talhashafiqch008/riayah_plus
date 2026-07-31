import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';
import { EmailService } from '../../services/EmailService';

const assignOrgSchema = z.object({
  organizationId: z.string().min(1),
});

const FAMILY_ROLES = ['family', 'patient', 'client', 'consumer'] as const;

export class AdminFamilyController {
  /** List family/patient accounts; default unassigned=true for the admin queue. */
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const unassignedOnly = String(req.query.unassigned ?? 'true') !== 'false';
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
      const skip = (page - 1) * limit;
      const search = String(req.query.search ?? '').trim();

      // Checked = only families with no org; unchecked = all families
      const where: Record<string, unknown> = {
        role: { in: [...FAMILY_ROLES] },
        deletedAt: null,
        ...(unassignedOnly ? { organizationId: null } : {}),
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [data, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            organizationId: true,
            assignedCoordinatorId: true,
            onboardingStatus: true,
            createdAt: true,
            organization: { select: { id: true, name: true } },
            assignedCoordinator: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      res.json({ data, total, page, limit });
    } catch (err) {
      next(err);
    }
  }

  /** Assign a family user to an organization; backfill care units & intakes. */
  static async assignOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = assignOrgSchema.parse(req.body);
      const familyId = req.params.id;

      const family = await prisma.user.findFirst({
        where: { id: familyId, role: { in: [...FAMILY_ROLES] }, deletedAt: null },
      });
      if (!family) throw new AppError('Family account not found.', 404);

      const org = await prisma.organization.findFirst({
        where: { id: organizationId, isActive: true },
      });
      if (!org) throw new AppError('Organization not found.', 404);

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: family.id },
          data: { organizationId: org.id },
        });
        await tx.careUnit.updateMany({
          where: { familyUserId: family.id, deletedAt: null },
          data: { organizationId: org.id },
        });
        await tx.intakeRecord.updateMany({
          where: { familyUserId: family.id, organizationId: null },
          data: { organizationId: org.id },
        });
      });

      await EmailService.sendFamilyOrgAssigned(family.email, {
        name: family.name,
        organizationName: org.name,
      });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'family_organization_assigned',
        entity: 'User',
        entityId: family.id,
        after: { organizationId: org.id },
        req,
      });

      const updated = await prisma.user.findUnique({
        where: { id: family.id },
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true,
          organization: { select: { id: true, name: true } },
        },
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }

  /** Sidebar badge: families awaiting organization assignment. */
  static async navBadges(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const unassignedFamilies = await prisma.user.count({
        where: {
          role: { in: [...FAMILY_ROLES] },
          deletedAt: null,
          organizationId: null,
        },
      });
      res.json({ data: { unassignedFamilies } });
    } catch (err) {
      next(err);
    }
  }
}
