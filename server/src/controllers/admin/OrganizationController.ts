import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';
import {
  INVITE_PASSWORD_PLACEHOLDER,
  sendInviteSetPassword,
} from '../../utils/inviteUser';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uniqueOrgSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base || 'organization';
  let suffix = 1;

  while (true) {
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${suffix++}`;
  }
}

const organizationCreateSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).optional(),
  logoUrl: z.string().url().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email(),
  adminName: z.string().min(2).max(120).optional(),
  website: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

const organizationUpdateSchema = organizationCreateSchema
  .omit({ adminName: true })
  .partial()
  .extend({
    email: z.string().email().optional().nullable(),
  });

const clinicCreateSchema = z.object({
  name: z.string().min(2).max(120),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  isActive: z.boolean().optional(),
});

const clinicUpdateSchema = clinicCreateSchema.partial();

const departmentCreateSchema = z.object({
  name: z.string().min(2).max(120),
  isActive: z.boolean().optional(),
});

const departmentUpdateSchema = departmentCreateSchema.partial();

export class OrganizationController {
  static async listOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, active } = req.query as { search?: string; active?: string };
      const where: Record<string, unknown> = {};

      if (active === 'true') where.isActive = true;
      if (active === 'false') where.isActive = false;
      if (search?.trim()) {
        where.OR = [
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { slug: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }

      const organizations = await prisma.organization.findMany({
        where,
        include: {
          _count: { select: { clinics: true, users: true } },
        },
        orderBy: { name: 'asc' },
      });

      res.json({ success: true, data: organizations });
    } catch (err) {
      next(err);
    }
  }

  static async getOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: req.params.id },
        include: {
          clinics: {
            include: {
              departments: { orderBy: { name: 'asc' } },
              _count: { select: { users: true, departments: true } },
            },
            orderBy: { name: 'asc' },
          },
          _count: { select: { clinics: true, users: true } },
        },
      });

      if (!organization) throw new AppError('Organization not found.', 404);
      res.json({ success: true, data: organization });
    } catch (err) {
      next(err);
    }
  }

  static async createOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = organizationCreateSchema.parse(req.body);

      const nameTaken = await prisma.organization.findFirst({ where: { name: body.name } });
      if (nameTaken) throw new AppError('An organization with this name already exists.', 409);

      const emailTaken = await prisma.user.findUnique({ where: { email: body.email } });
      if (emailTaken) throw new AppError('An account with this email already exists.', 409);

      const baseSlug = slugify(body.slug ?? body.name);
      const slug = await uniqueOrgSlug(baseSlug);
      const adminName = body.adminName?.trim() || `${body.name} Admin`;

      const { organization, orgAdmin } = await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: body.name,
            slug,
            logoUrl: body.logoUrl ?? undefined,
            address: body.address ?? undefined,
            phone: body.phone ?? undefined,
            email: body.email,
            website: body.website ?? undefined,
            isActive: body.isActive ?? true,
          },
        });

        const orgAdmin = await tx.user.create({
          data: {
            name: adminName,
            email: body.email,
            passwordHash: INVITE_PASSWORD_PLACEHOLDER,
            role: 'org_admin',
            organizationId: organization.id,
            mustSetPassword: true,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            verificationStatus: 'approved',
            isActive: true,
          },
        });

        return { organization, orgAdmin };
      });

      await sendInviteSetPassword({
        id: orgAdmin.id,
        email: orgAdmin.email,
        name: orgAdmin.name,
        role: orgAdmin.role,
      });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'organization_created',
        entity: 'Organization',
        entityId: organization.id,
        after: { ...organization, orgAdminId: orgAdmin.id },
        req,
      });

      res.status(201).json({
        success: true,
        data: organization,
        orgAdmin: { id: orgAdmin.id, email: orgAdmin.email, name: orgAdmin.name },
        inviteSent: true,
      });
    } catch (err) {
      next(err);
    }
  }

  /** Resend set-password invite to the org's org_admin user. */
  static async resendOrgAdminInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const org = await prisma.organization.findUnique({ where: { id: req.params.id } });
      if (!org) throw new AppError('Organization not found.', 404);

      const orgAdmin = await prisma.user.findFirst({
        where: {
          organizationId: org.id,
          role: 'org_admin',
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!orgAdmin) throw new AppError('No organization admin found for this organization.', 404);

      await prisma.user.update({
        where: { id: orgAdmin.id },
        data: { mustSetPassword: true, passwordHash: INVITE_PASSWORD_PLACEHOLDER },
      });

      await sendInviteSetPassword({
        id: orgAdmin.id,
        email: orgAdmin.email,
        name: orgAdmin.name,
        role: orgAdmin.role,
      });

      res.json({ success: true, message: 'Invite resent.', email: orgAdmin.email });
    } catch (err) {
      next(err);
    }
  }

  static async updateOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = organizationUpdateSchema.parse(req.body);
      const existing = await prisma.organization.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError('Organization not found.', 404);

      if (body.name && body.name !== existing.name) {
        const nameTaken = await prisma.organization.findFirst({
          where: { name: body.name, id: { not: req.params.id } },
        });
        if (nameTaken) throw new AppError('An organization with this name already exists.', 409);
      }

      let slug = existing.slug;
      if (body.slug) {
        slug = await uniqueOrgSlug(slugify(body.slug), existing.id);
      } else if (body.name && body.name !== existing.name && !body.slug) {
        slug = await uniqueOrgSlug(slugify(body.name), existing.id);
      }

      const organization = await prisma.organization.update({
        where: { id: req.params.id },
        data: {
          ...body,
          slug,
          logoUrl: body.logoUrl === null ? null : body.logoUrl,
          address: body.address === null ? null : body.address,
          phone: body.phone === null ? null : body.phone,
          email: body.email === null ? null : body.email,
          website: body.website === null ? null : body.website,
        },
      });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'organization_updated',
        entity: 'Organization',
        entityId: organization.id,
        before: existing,
        after: organization,
        req,
      });

      res.json({ success: true, data: organization });
    } catch (err) {
      next(err);
    }
  }

  static async deleteOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { clinics: true, users: true } } },
      });
      if (!organization) throw new AppError('Organization not found.', 404);

      if (organization._count.clinics > 0 || organization._count.users > 0) {
        throw new AppError(
          'Cannot delete organization with linked clinics or users. Deactivate it instead.',
          409,
        );
      }

      await prisma.organization.delete({ where: { id: organization.id } });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'organization_deleted',
        entity: 'Organization',
        entityId: organization.id,
        before: organization,
        req,
      });

      res.json({ success: true, message: 'Organization deleted.' });
    } catch (err) {
      next(err);
    }
  }

  static async listClinics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const org = await prisma.organization.findUnique({ where: { id: req.params.orgId } });
      if (!org) throw new AppError('Organization not found.', 404);

      const { search, active } = req.query as { search?: string; active?: string };

      const clinics = await prisma.clinic.findMany({
        where: {
          organizationId: req.params.orgId,
          ...(active !== undefined && { isActive: active === 'true' }),
          ...(search?.trim() && {
            name: { contains: search.trim(), mode: 'insensitive' },
          }),
        },
        include: {
          _count: { select: { departments: true, users: true } },
        },
        orderBy: { name: 'asc' },
      });

      res.json({ success: true, data: clinics });
    } catch (err) {
      next(err);
    }
  }

  static async getClinic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clinic = await prisma.clinic.findUnique({
        where: { id: req.params.id },
        include: {
          organization: { select: { id: true, name: true, slug: true } },
          departments: { orderBy: { name: 'asc' } },
          _count: { select: { users: true, departments: true } },
        },
      });
      if (!clinic) throw new AppError('Clinic not found.', 404);
      res.json({ success: true, data: clinic });
    } catch (err) {
      next(err);
    }
  }

  static async createClinic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const org = await prisma.organization.findUnique({ where: { id: req.params.orgId } });
      if (!org) throw new AppError('Organization not found.', 404);

      const body = clinicCreateSchema.parse(req.body);
      const clinic = await prisma.clinic.create({
        data: {
          organizationId: org.id,
          name: body.name,
          address: body.address ?? undefined,
          phone: body.phone ?? undefined,
          isActive: body.isActive ?? true,
        },
      });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'clinic_created',
        entity: 'Clinic',
        entityId: clinic.id,
        after: clinic,
        req,
      });

      res.status(201).json({ success: true, data: clinic });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        return next(new AppError('A clinic with this name already exists in this organization.', 409));
      }
      next(err);
    }
  }

  static async updateClinic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await prisma.clinic.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError('Clinic not found.', 404);

      const body = clinicUpdateSchema.parse(req.body);
      const clinic = await prisma.clinic.update({
        where: { id: req.params.id },
        data: {
          ...body,
          address: body.address === null ? null : body.address,
          phone: body.phone === null ? null : body.phone,
        },
      });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'clinic_updated',
        entity: 'Clinic',
        entityId: clinic.id,
        before: existing,
        after: clinic,
        req,
      });

      res.json({ success: true, data: clinic });
    } catch (err) {
      next(err);
    }
  }

  static async deleteClinic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clinic = await prisma.clinic.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { departments: true, users: true } } },
      });
      if (!clinic) throw new AppError('Clinic not found.', 404);

      if (clinic._count.departments > 0 || clinic._count.users > 0) {
        throw new AppError(
          'Cannot delete clinic with linked departments or users. Deactivate it instead.',
          409,
        );
      }

      await prisma.clinic.delete({ where: { id: clinic.id } });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'clinic_deleted',
        entity: 'Clinic',
        entityId: clinic.id,
        before: clinic,
        req,
      });

      res.json({ success: true, message: 'Clinic deleted.' });
    } catch (err) {
      next(err);
    }
  }

  static async listDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clinic = await prisma.clinic.findUnique({ where: { id: req.params.clinicId } });
      if (!clinic) throw new AppError('Clinic not found.', 404);

      const { search, active } = req.query as { search?: string; active?: string };

      const departments = await prisma.department.findMany({
        where: {
          clinicId: clinic.id,
          ...(active !== undefined && { isActive: active === 'true' }),
          ...(search?.trim() && {
            name: { contains: search.trim(), mode: 'insensitive' },
          }),
        },
        include: { _count: { select: { users: true } } },
        orderBy: { name: 'asc' },
      });

      res.json({ success: true, data: departments });
    } catch (err) {
      next(err);
    }
  }

  static async getDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const department = await prisma.department.findUnique({
        where: { id: req.params.id },
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              organization: { select: { id: true, name: true } },
            },
          },
          _count: { select: { users: true } },
        },
      });
      if (!department) throw new AppError('Department not found.', 404);
      res.json({ success: true, data: department });
    } catch (err) {
      next(err);
    }
  }

  static async createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clinic = await prisma.clinic.findUnique({ where: { id: req.params.clinicId } });
      if (!clinic) throw new AppError('Clinic not found.', 404);

      const body = departmentCreateSchema.parse(req.body);
      const department = await prisma.department.create({
        data: {
          clinicId: clinic.id,
          name: body.name,
          isActive: body.isActive ?? true,
        },
      });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'department_created',
        entity: 'Department',
        entityId: department.id,
        after: department,
        req,
      });

      res.status(201).json({ success: true, data: department });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        return next(new AppError('A department with this name already exists in this clinic.', 409));
      }
      next(err);
    }
  }

  static async updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await prisma.department.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError('Department not found.', 404);

      const body = departmentUpdateSchema.parse(req.body);
      const department = await prisma.department.update({
        where: { id: req.params.id },
        data: body,
      });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'department_updated',
        entity: 'Department',
        entityId: department.id,
        before: existing,
        after: department,
        req,
      });

      res.json({ success: true, data: department });
    } catch (err) {
      next(err);
    }
  }

  static async deleteDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const department = await prisma.department.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { users: true } } },
      });
      if (!department) throw new AppError('Department not found.', 404);

      if (department._count.users > 0) {
        throw new AppError(
          'Cannot delete department with assigned users. Deactivate it instead.',
          409,
        );
      }

      await prisma.department.delete({ where: { id: department.id } });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'department_deleted',
        entity: 'Department',
        entityId: department.id,
        before: department,
        req,
      });

      res.json({ success: true, message: 'Department deleted.' });
    } catch (err) {
      next(err);
    }
  }
}
