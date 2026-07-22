import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';
import { tenantWhere } from '../../middleware/tenantScope';
import { mergeTenantOrg } from '../../middleware/tenantAccess';
import { sanitizedString, optionalSanitizedString } from '../../utils/sanitize';

const ADMIN_ROLES = ['admin', 'super_admin', 'support_admin'];
const COORDINATOR_ROLES = ['care_coordinator', ...ADMIN_ROLES];
const FAMILY_ROLES = ['family', 'client', 'consumer'];

function isAdmin(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}

function isCoordinator(role: string): boolean {
  return COORDINATOR_ROLES.includes(role);
}

function isFamily(role: string): boolean {
  return FAMILY_ROLES.includes(role);
}

const createCareUnitSchema = z.object({
  name: sanitizedString(z.string().min(2)),
  primaryCaregiverName: optionalSanitizedString(),
  primaryCaregiverPhone: optionalSanitizedString(),
  primaryCaregiverRelation: optionalSanitizedString(),
  address: optionalSanitizedString(),
  city: optionalSanitizedString(),
  country: z.string().optional(),
  organizationId: z.string().optional(),
  clinicId: z.string().optional(),
});

const updateCareUnitSchema = createCareUnitSchema.partial();

const createPatientSchema = z.object({
  name: sanitizedString(z.string().min(2)),
  dateOfBirth: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  gender: optionalSanitizedString(),
  relationship: optionalSanitizedString(),
  medicalInfo: z.record(z.unknown()).optional(),
  notes: optionalSanitizedString(),
  pocName: optionalSanitizedString(),
  pocPhone: optionalSanitizedString(),
  diagnosisCodes: z.array(z.string().min(1)).optional(),
  externalRef: optionalSanitizedString(),
});

const updatePatientSchema = createPatientSchema.partial();

async function requireCareUnitAccess(req: Request, careUnitId: string) {
  const unit = await prisma.careUnit.findFirst({
    where: { id: careUnitId, deletedAt: null },
  });
  if (!unit) throw new AppError('Care unit not found.', 404);

  const role = req.user!.role;
  if (isFamily(role) && unit.familyUserId === req.user!.userId) return unit;
  if (isCoordinator(role) || isAdmin(role)) {
    const tw = tenantWhere(req);
    if (tw.organizationId === '__no_tenant__') {
      throw new AppError('No organization assigned to this account.', 403);
    }
    if (tw.organizationId && unit.organizationId !== tw.organizationId) {
      throw new AppError('Forbidden.', 403);
    }
    return unit;
  }
  throw new AppError('Forbidden.', 403);
}

function patientSnapshot(row: {
  id: string;
  careUnitId: string | null;
  name: string;
  dateOfBirth: Date | null;
  gender: string | null;
  relationship: string | null;
  medicalInfo: Prisma.JsonValue;
  notes: string | null;
  externalRef: string | null;
  pocName: string | null;
  pocPhone: string | null;
  diagnosisCodes: string[];
}) {
  return {
    id: row.id,
    careUnitId: row.careUnitId,
    name: row.name,
    dateOfBirth: row.dateOfBirth,
    gender: row.gender,
    relationship: row.relationship,
    medicalInfo: row.medicalInfo,
    notes: row.notes,
    externalRef: row.externalRef,
    pocName: row.pocName,
    pocPhone: row.pocPhone,
    diagnosisCodes: row.diagnosisCodes,
  };
}

export class CareUnitController {
  static async index(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '20', search } = req.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const role = req.user!.role;

    const where: Prisma.CareUnitWhereInput = { deletedAt: null };

    if (isFamily(role)) {
      where.familyUserId = req.user!.userId;
    } else if (isCoordinator(role) || isAdmin(role)) {
      // Org-only (not clinic) so coordinators see all units in their org — matches intake queue.
      mergeTenantOrg(req, where);
    } else {
      throw new AppError('Forbidden.', 403);
    }

    if (search?.trim()) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.careUnit.findMany({
        where,
        include: {
          careRecipients: {
            where: { deletedAt: null },
            select: { id: true, name: true, externalRef: true, diagnosisCodes: true },
          },
          _count: { select: { intakeRecords: true, careEpisodes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit, 10),
      }),
      prisma.careUnit.count({ where }),
    ]);

    res.json({ data, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  }

  static async store(req: Request, res: Response): Promise<void> {
    const role = req.user!.role;
    if (!isFamily(role) && !isAdmin(role) && !isCoordinator(role)) {
      throw new AppError('Forbidden.', 403);
    }

    const data = createCareUnitSchema.parse(req.body);
    const familyUserId = isFamily(role) ? req.user!.userId : (req.body.familyUserId as string | undefined);
    if (!familyUserId) {
      throw new AppError('familyUserId is required when creating a care unit as staff.', 422);
    }

    const familyUser = await prisma.user.findUnique({
      where: { id: familyUserId },
      select: { id: true, organizationId: true, role: true },
    });
    if (!familyUser) {
      throw new AppError('Family user not found.', 404);
    }

    // Staff cannot attach families from another organization (C-2).
    if (isCoordinator(role) || isAdmin(role)) {
      const tw = tenantWhere(req);
      if (tw.organizationId === '__no_tenant__') {
        throw new AppError('No organization assigned to this account.', 403);
      }
      if (
        tw.organizationId &&
        familyUser.organizationId &&
        familyUser.organizationId !== tw.organizationId
      ) {
        throw new AppError('Family user is outside your organization.', 403);
      }
      // Non-admin coordinators cannot pick a foreign organizationId in the body.
      if (
        !isAdmin(role) &&
        data.organizationId &&
        tw.organizationId &&
        data.organizationId !== tw.organizationId
      ) {
        throw new AppError('Cannot create care unit in another organization.', 403);
      }
    }

    // Family cannot set organizationId/clinicId (M-3 partial).
    const organizationId = isFamily(role)
      ? familyUser.organizationId ?? req.tenant?.organizationId ?? null
      : data.organizationId ??
        req.tenant?.organizationId ??
        familyUser.organizationId ??
        null;

    if (isFamily(role) && (data.organizationId || data.clinicId)) {
      // Strip silently for family — ignore body org/clinic
    }

    const unit = await prisma.careUnit.create({
      data: {
        familyUserId,
        name: data.name,
        primaryCaregiverName: data.primaryCaregiverName,
        primaryCaregiverPhone: data.primaryCaregiverPhone,
        primaryCaregiverRelation: data.primaryCaregiverRelation,
        address: data.address,
        city: data.city,
        country: data.country ?? 'QA',
        organizationId: organizationId ?? undefined,
        clinicId: isFamily(role) ? undefined : data.clinicId,
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'care_unit_created',
      entity: 'CareUnit',
      entityId: unit.id,
      after: { id: unit.id, familyUserId: unit.familyUserId, organizationId: unit.organizationId },
      req,
    });

    res.status(201).json({ data: unit });
  }

  static async show(req: Request, res: Response): Promise<void> {
    const unit = await requireCareUnitAccess(req, req.params.id);
    const full = await prisma.careUnit.findUnique({
      where: { id: unit.id },
      include: {
        careRecipients: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        intakeRecords: { orderBy: { submittedAt: 'desc' }, take: 20 },
        careEpisodes: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    res.json({ data: full });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const existing = await requireCareUnitAccess(req, req.params.id);
    const role = req.user!.role;
    if (isFamily(role) && existing.familyUserId !== req.user!.userId) {
      throw new AppError('Forbidden.', 403);
    }

    const data = updateCareUnitSchema.parse(req.body);
    // Family cannot reassign org/clinic (M-3).
    const safeData = isFamily(role)
      ? {
          name: data.name,
          primaryCaregiverName: data.primaryCaregiverName,
          primaryCaregiverPhone: data.primaryCaregiverPhone,
          primaryCaregiverRelation: data.primaryCaregiverRelation,
          address: data.address,
          city: data.city,
          country: data.country,
        }
      : data;

    if (
      !isAdmin(role) &&
      isCoordinator(role) &&
      data.organizationId &&
      req.tenant?.organizationId &&
      data.organizationId !== req.tenant.organizationId
    ) {
      throw new AppError('Cannot move care unit to another organization.', 403);
    }

    const updated = await prisma.careUnit.update({
      where: { id: existing.id },
      data: safeData,
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'care_unit_updated',
      entity: 'CareUnit',
      entityId: updated.id,
      before: existing,
      after: updated,
      req,
    });

    res.json({ data: updated });
  }

  static async listPatients(req: Request, res: Response): Promise<void> {
    const unit = await requireCareUnitAccess(req, req.params.id);
    const patients = await prisma.careRecipient.findMany({
      where: { careUnitId: unit.id, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: patients });
  }

  static async createPatient(req: Request, res: Response): Promise<void> {
    const unit = await requireCareUnitAccess(req, req.params.id);
    const role = req.user!.role;
    if (isFamily(role) && unit.familyUserId !== req.user!.userId && !isAdmin(role)) {
      throw new AppError('Forbidden.', 403);
    }

    const data = createPatientSchema.parse(req.body);
    const diagnosisCodes = data.diagnosisCodes ?? [];
    if (diagnosisCodes.length === 0 && data.notes == null) {
      // Prefer coded diagnoses; allow create without codes but warn via empty array OK for draft profiles
    }

    let dateOfBirth: Date | undefined;
    if (data.dateOfBirth) {
      dateOfBirth = new Date(data.dateOfBirth);
      if (Number.isNaN(dateOfBirth.getTime())) {
        throw new AppError('Invalid dateOfBirth.', 422);
      }
    }

    const patient = await prisma.careRecipient.create({
      data: {
        userId: unit.familyUserId,
        careUnitId: unit.id,
        name: data.name,
        dateOfBirth,
        gender: data.gender,
        relationship: data.relationship,
        medicalInfo: data.medicalInfo as Prisma.InputJsonValue | undefined,
        notes: data.notes,
        pocName: data.pocName,
        pocPhone: data.pocPhone,
        diagnosisCodes,
        externalRef: data.externalRef,
      },
    });

    await prisma.careRecipientRevision.create({
      data: {
        careRecipientId: patient.id,
        changedById: req.user!.userId,
        snapshot: patientSnapshot(patient),
        changeSummary: 'Created',
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'patient_created',
      entity: 'CareRecipient',
      entityId: patient.id,
      after: patient,
      req,
    });

    res.status(201).json({ data: patient });
  }

  static async updatePatient(req: Request, res: Response): Promise<void> {
    const unit = await requireCareUnitAccess(req, req.params.id);
    const existing = await prisma.careRecipient.findFirst({
      where: { id: req.params.patientId, careUnitId: unit.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Patient not found.', 404);

    const data = updatePatientSchema.parse(req.body);
    // Family cannot overwrite diagnosis codes (M-4).
    if (isFamily(req.user!.role) && data.diagnosisCodes !== undefined) {
      throw new AppError('Only care staff can update diagnosis codes.', 403);
    }
    let dateOfBirth: Date | null | undefined = undefined;
    if (data.dateOfBirth === undefined) {
      dateOfBirth = undefined;
    } else if (data.dateOfBirth) {
      dateOfBirth = new Date(data.dateOfBirth);
      if (Number.isNaN(dateOfBirth.getTime())) {
        throw new AppError('Invalid dateOfBirth.', 422);
      }
    }

    const updated = await prisma.careRecipient.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        dateOfBirth,
        gender: data.gender,
        relationship: data.relationship,
        medicalInfo: data.medicalInfo as Prisma.InputJsonValue | undefined,
        notes: data.notes,
        pocName: data.pocName,
        pocPhone: data.pocPhone,
        diagnosisCodes: data.diagnosisCodes,
        externalRef: data.externalRef,
      },
    });

    await prisma.careRecipientRevision.create({
      data: {
        careRecipientId: updated.id,
        changedById: req.user!.userId,
        snapshot: patientSnapshot(updated),
        changeSummary: 'Updated',
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'patient_updated',
      entity: 'CareRecipient',
      entityId: updated.id,
      before: existing,
      after: updated,
      req,
    });

    res.json({ data: updated });
  }

  static async patientRevisions(req: Request, res: Response): Promise<void> {
    const unit = await requireCareUnitAccess(req, req.params.id);
    const existing = await prisma.careRecipient.findFirst({
      where: { id: req.params.patientId, careUnitId: unit.id },
      select: { id: true },
    });
    if (!existing) throw new AppError('Patient not found.', 404);

    const revisions = await prisma.careRecipientRevision.findMany({
      where: { careRecipientId: existing.id },
      orderBy: { createdAt: 'desc' },
      include: { changedBy: { select: { id: true, name: true } } },
    });
    res.json({ data: revisions });
  }
}
