import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { IntakeStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';
import { EmailService } from '../../services/EmailService';
import {
  INVITE_PASSWORD_PLACEHOLDER,
  sendInviteSetPassword,
} from '../../utils/inviteUser';

const FAMILY_ROLES = ['family', 'patient', 'client', 'consumer'] as const;

/** Clinical + support roles org admins can invite (not coordinators — those have their own page). */
export const ORG_STAFF_ROLES = [
  'clinical_staff',
  'doctor',
  'nurse',
  'physiotherapist',
  'occupational_therapist',
  'speech_therapist',
  'psychologist',
  'dietitian',
  'therapist',
  'support_worker',
] as const;

type OrgStaffRole = (typeof ORG_STAFF_ROLES)[number];

function requireOrgId(req: Request): string {
  const orgId = req.tenant?.organizationId;
  if (!orgId || orgId === '__no_tenant__') {
    throw new AppError('No organization assigned to this account.', 403);
  }
  return orgId;
}

/** Page/limit for org list endpoints — hard cap 100. */
function listPagination(req: Request): { page: number; limit: number; skip: number; take: number } {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

const createCoordinatorSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
});

const createStaffSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  role: z.enum(ORG_STAFF_ROLES),
});

const assignCoordinatorSchema = z.object({
  coordinatorId: z.string().min(1).nullable(),
});

export class OrgPortalController {
  static async dashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = requireOrgId(req);

      const [families, coordinators, pendingIntakes] = await Promise.all([
        prisma.user.count({
          where: { organizationId, role: { in: [...FAMILY_ROLES] }, deletedAt: null },
        }),
        prisma.user.count({
          where: { organizationId, role: 'care_coordinator', deletedAt: null },
        }),
        prisma.intakeRecord.count({
          where: {
            organizationId,
            status: { in: ['submitted', 'under_review'] satisfies IntakeStatus[] },
            familyUser: { assignedCoordinatorId: null },
          },
        }),
      ]);

      res.json({
        data: {
          organizationId,
          stats: { families, coordinators, pendingIntakes },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async listCoordinators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = requireOrgId(req);
      const { page, limit, skip, take } = listPagination(req);
      const where = { organizationId, role: 'care_coordinator' as const, deletedAt: null };
      const [data, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            mustSetPassword: true,
            createdAt: true,
          },
          orderBy: { name: 'asc' },
          skip,
          take,
        }),
        prisma.user.count({ where }),
      ]);
      res.json({ data, meta: { total, page, limit } });
    } catch (err) {
      next(err);
    }
  }

  static async createCoordinator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = requireOrgId(req);
      const body = createCoordinatorSchema.parse(req.body);

      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing) throw new AppError('Email already in use.', 409);

      const coordinator = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone,
          role: 'care_coordinator',
          organizationId,
          passwordHash: INVITE_PASSWORD_PLACEHOLDER,
          mustSetPassword: true,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          verificationStatus: 'approved',
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          organizationId: true,
          mustSetPassword: true,
          createdAt: true,
        },
      });

      await sendInviteSetPassword({
        id: coordinator.id,
        email: coordinator.email,
        name: coordinator.name,
        role: 'care_coordinator',
      });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'org_coordinator_created',
        entity: 'User',
        entityId: coordinator.id,
        after: coordinator,
        req,
      });

      res.status(201).json({ data: coordinator, inviteSent: true });
    } catch (err) {
      next(err);
    }
  }

  static async updateCoordinator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = requireOrgId(req);
      const body = z
        .object({
          name: z.string().min(2).optional(),
          phone: z.string().max(40).optional().nullable(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);

      const existing = await prisma.user.findFirst({
        where: {
          id: req.params.id,
          organizationId,
          role: 'care_coordinator',
          deletedAt: null,
        },
      });
      if (!existing) throw new AppError('Coordinator not found.', 404);

      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          mustSetPassword: true,
        },
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async resendCoordinatorInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = requireOrgId(req);
      const coordinator = await prisma.user.findFirst({
        where: {
          id: req.params.id,
          organizationId,
          role: 'care_coordinator',
          deletedAt: null,
        },
      });
      if (!coordinator) throw new AppError('Coordinator not found.', 404);
      if (!coordinator.mustSetPassword) {
        throw new AppError('User has already set their password. Resending is not allowed.', 409);
      }

      await prisma.user.update({
        where: { id: coordinator.id },
        data: { mustSetPassword: true, passwordHash: INVITE_PASSWORD_PLACEHOLDER },
      });
      await sendInviteSetPassword({
        id: coordinator.id,
        email: coordinator.email,
        name: coordinator.name,
        role: 'care_coordinator',
      });

      res.json({ success: true, message: 'Invite resent.' });
    } catch (err) {
      next(err);
    }
  }

  static async listFamilies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = requireOrgId(req);
      const { page, limit, skip, take } = listPagination(req);
      const where = {
        organizationId,
        role: { in: [...FAMILY_ROLES] },
        deletedAt: null,
      };
      const [data, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            onboardingStatus: true,
            assignedCoordinatorId: true,
            assignedCoordinator: { select: { id: true, name: true } },
            createdAt: true,
            _count: { select: { submittedIntakes: true, careUnitsOwned: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.user.count({ where }),
      ]);
      res.json({ data, meta: { total, page, limit } });
    } catch (err) {
      next(err);
    }
  }

  static async assignFamilyCoordinator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = requireOrgId(req);
      const { coordinatorId } = assignCoordinatorSchema.parse(req.body);

      const family = await prisma.user.findFirst({
        where: {
          id: req.params.id,
          organizationId,
          role: { in: [...FAMILY_ROLES] },
          deletedAt: null,
        },
      });
      if (!family) throw new AppError('Family not found in your organization.', 404);

      let coordinator: {
        id: string;
        name: string;
        email: string;
        organization: { name: string } | null;
      } | null = null;

      if (coordinatorId) {
        coordinator = await prisma.user.findFirst({
          where: {
            id: coordinatorId,
            organizationId,
            role: 'care_coordinator',
            deletedAt: null,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            email: true,
            organization: { select: { name: true } },
          },
        });
        if (!coordinator) {
          throw new AppError('Coordinator not found in your organization.', 404);
        }
      }

      const previousCoordinatorId = family.assignedCoordinatorId;

      const updated = await prisma.user.update({
        where: { id: family.id },
        data: { assignedCoordinatorId: coordinatorId },
        select: {
          id: true,
          name: true,
          email: true,
          assignedCoordinatorId: true,
          assignedCoordinator: { select: { id: true, name: true, email: true } },
        },
      });

      if (coordinator && coordinatorId && coordinatorId !== previousCoordinatorId) {
        await EmailService.sendCoordinatorFamilyAssigned(coordinator.email, {
          coordinatorName: coordinator.name,
          familyName: family.name,
          familyEmail: family.email,
          organizationName: coordinator.organization?.name ?? 'your organization',
        });
      }

      await AuditService.log({
        userId: req.user!.userId,
        action: 'family_coordinator_assigned',
        entity: 'User',
        entityId: family.id,
        after: { assignedCoordinatorId: coordinatorId },
        req,
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }

  /** Sidebar badge counts for org portal. */
  static async navBadges(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = requireOrgId(req);

      const [
        pendingIntakes,
        familiesNeedingCoordinator,
        coordinatorsAwaitingPassword,
        staffAwaitingPassword,
      ] = await Promise.all([
          prisma.intakeRecord.count({
            where: {
              organizationId,
              status: { in: ['submitted', 'under_review'] satisfies IntakeStatus[] },
              familyUser: { assignedCoordinatorId: null },
            },
          }),
          prisma.user.count({
            where: {
              organizationId,
              role: { in: [...FAMILY_ROLES] },
              deletedAt: null,
              assignedCoordinatorId: null,
            },
          }),
          prisma.user.count({
            where: {
              organizationId,
              role: 'care_coordinator',
              deletedAt: null,
              mustSetPassword: true,
            },
          }),
          prisma.user.count({
            where: {
              organizationId,
              role: { in: [...ORG_STAFF_ROLES] },
              deletedAt: null,
              mustSetPassword: true,
            },
          }),
        ]);

      res.json({
        data: {
          pendingIntakes,
          familiesNeedingCoordinator,
          coordinatorsAwaitingPassword,
          staffAwaitingPassword,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async listStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = requireOrgId(req);
      const { page, limit, skip, take } = listPagination(req);
      const where = {
        organizationId,
        role: { in: [...ORG_STAFF_ROLES] },
        deletedAt: null,
      };
      const [data, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            mustSetPassword: true,
            createdAt: true,
          },
          orderBy: [{ role: 'asc' }, { name: 'asc' }],
          skip,
          take,
        }),
        prisma.user.count({ where }),
      ]);
      res.json({ data, meta: { total, page, limit } });
    } catch (err) {
      next(err);
    }
  }

  static async createStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = requireOrgId(req);
      const body = createStaffSchema.parse(req.body);
      const role = body.role as OrgStaffRole;

      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing) throw new AppError('Email already in use.', 409);

      const staff = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone,
          role,
          organizationId,
          passwordHash: INVITE_PASSWORD_PLACEHOLDER,
          mustSetPassword: true,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          verificationStatus: 'approved',
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          organizationId: true,
          mustSetPassword: true,
          createdAt: true,
        },
      });

      await sendInviteSetPassword({
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
      });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'org_staff_created',
        entity: 'User',
        entityId: staff.id,
        after: staff,
        req,
      });

      res.status(201).json({ data: staff, inviteSent: true });
    } catch (err) {
      next(err);
    }
  }

  static async updateStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = requireOrgId(req);
      const body = z
        .object({
          name: z.string().min(2).optional(),
          phone: z.string().max(40).optional().nullable(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);

      const existing = await prisma.user.findFirst({
        where: {
          id: req.params.id,
          organizationId,
          role: { in: [...ORG_STAFF_ROLES] },
          deletedAt: null,
        },
      });
      if (!existing) throw new AppError('Staff member not found.', 404);

      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          mustSetPassword: true,
        },
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async resendStaffInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = requireOrgId(req);
      const staff = await prisma.user.findFirst({
        where: {
          id: req.params.id,
          organizationId,
          role: { in: [...ORG_STAFF_ROLES] },
          deletedAt: null,
        },
      });
      if (!staff) throw new AppError('Staff member not found.', 404);
      if (!staff.mustSetPassword) {
        throw new AppError('User has already set their password. Resending is not allowed.', 409);
      }

      await prisma.user.update({
        where: { id: staff.id },
        data: { mustSetPassword: true, passwordHash: INVITE_PASSWORD_PLACEHOLDER },
      });
      await sendInviteSetPassword({
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
      });

      res.json({ success: true, message: 'Invite resent.' });
    } catch (err) {
      next(err);
    }
  }

  /** Intakes for this org where the family has no primary coordinator yet. */
  static async pendingIntakes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = requireOrgId(req);
      const { page, limit, skip, take } = listPagination(req);

      const where = {
        organizationId,
        status: { in: ['submitted', 'under_review'] as IntakeStatus[] },
        familyUser: { assignedCoordinatorId: null },
      };

      const [data, total] = await Promise.all([
        prisma.intakeRecord.findMany({
          where,
          include: {
            careUnit: { select: { id: true, name: true } },
            careRecipient: {
              select: { id: true, name: true },
            },
            familyUser: {
              select: { id: true, name: true, email: true, assignedCoordinatorId: true },
            },
          },
          orderBy: [{ urgencyLevel: 'desc' }, { submittedAt: 'asc' }],
          skip,
          take,
        }),
        prisma.intakeRecord.count({ where }),
      ]);

      res.json({ data, total, meta: { total, page, limit } });
    } catch (err) {
      next(err);
    }
  }
}
