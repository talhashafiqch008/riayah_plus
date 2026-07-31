import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import {
  IntakeStatus,
  Prisma,
  ServiceCategory,
  UrgencyLevel,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';
import { tenantWhere } from '../../middleware/tenantScope';
import { assertIntakeTransition } from '../../utils/stateMachine';
import { sanitizedString, optionalSanitizedString } from '../../utils/sanitize';
import { NotificationService } from '../../services/NotificationService';
import { assertTenantOrgAccess } from '../../middleware/tenantAccess';
import { resolveEpisodePartyIds } from '../../utils/careAccess';
import { AiIntakeSummaryService } from '../../services/AiIntakeSummaryService';

const ADMIN_ROLES = ['admin', 'super_admin', 'support_admin'];
const COORDINATOR_ROLES = ['care_coordinator', ...ADMIN_ROLES];
const FAMILY_ROLES = ['family', 'client', 'consumer'];

/** Immutable consent text version for intake Privacy / Treatment. */
export const INTAKE_CONSENT_DOCUMENT_VERSION = '1.0.0-intake';

const urgencyEnum = z.nativeEnum(UrgencyLevel);
const serviceEnum = z.nativeEnum(ServiceCategory);

const submitIntakeSchema = z.object({
  careUnitId: z.string().min(1),
  careRecipientId: z.string().min(1),
  reasonForCare: sanitizedString(z.string().min(5)),
  medicalHistory: optionalSanitizedString(),
  currentMeds: optionalSanitizedString(),
  diagnoses: z.array(z.string().min(1)).min(1, 'At least one coded diagnosis is required'),
  serviceInterests: z.array(serviceEnum).default([]),
  urgencyLevel: urgencyEnum.optional(),
  primaryCaregiverName: optionalSanitizedString(),
  primaryCaregiverPhone: optionalSanitizedString(),
  primaryCaregiverRelation: optionalSanitizedString(),
  wizardPayload: z.record(z.unknown()).optional(),
  documentIds: z.array(z.string().min(1)).optional().default([]),
  privacyConsent: z.boolean().refine((v) => v === true, {
    message: 'Privacy consent is required.',
  }),
  treatmentConsent: z.boolean().refine((v) => v === true, {
    message: 'Treatment consent is required.',
  }),
  telehealthConsent: z.boolean().optional().default(false),
  dataSharingConsent: z.boolean().optional().default(false),
});

const reviewSchema = z.object({
  keyConcerns: z.array(sanitizedString(z.string().min(1))).min(1),
  urgencyIndicators: z.array(sanitizedString(z.string().min(1))).min(1),
  suggestedServiceCategories: z.array(serviceEnum).min(1),
  riskFlags: z.array(sanitizedString(z.string().min(1))).default([]),
  createEpisode: z.boolean().optional().default(true),
  episodeTitle: optionalSanitizedString(),
  notes: optionalSanitizedString(),
  coordinatorId: z.string().min(1).optional(),
});

const statusSchema = z.object({
  status: z.nativeEnum(IntakeStatus),
});

const updateFamilyRequestSchema = z.object({
  wizardPayload: z.record(z.unknown()),
  reasonForCare: optionalSanitizedString(),
  serviceInterests: z.array(serviceEnum).optional(),
  primaryCaregiverName: optionalSanitizedString(),
  primaryCaregiverPhone: optionalSanitizedString(),
  primaryCaregiverRelation: optionalSanitizedString(),
  syncCareUnit: z
    .object({
      address: optionalSanitizedString(),
      country: optionalSanitizedString(),
      primaryCaregiverName: optionalSanitizedString(),
    })
    .optional(),
});

function isAdmin(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}

function isCoordinator(role: string): boolean {
  return COORDINATOR_ROLES.includes(role);
}

function isFamily(role: string): boolean {
  return FAMILY_ROLES.includes(role);
}

function deviceFingerprint(req: Request): string {
  const header = req.headers['x-device-fingerprint'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  const ua = req.headers['user-agent'] ?? '';
  return crypto.createHash('sha256').update(`${req.ip}:${ua}`).digest('hex').slice(0, 32);
}

async function recordIntakeConsent(
  req: Request,
  userId: string,
  consentType: string,
  description: string,
) {
  const ipAddress = req.ip ?? null;
  const fingerprint = deviceFingerprint(req);
  const grantedAt = new Date();

  await prisma.consent.upsert({
    where: { userId_consentType: { userId, consentType } },
    create: {
      userId,
      consentType,
      description,
      granted: true,
      grantedAt,
      documentVersion: INTAKE_CONSENT_DOCUMENT_VERSION,
      deviceFingerprint: fingerprint,
      ipAddress,
      signatureStatus: 'signed',
    },
    update: {
      granted: true,
      grantedAt,
      revokedAt: null,
      description,
      documentVersion: INTAKE_CONSENT_DOCUMENT_VERSION,
      deviceFingerprint: fingerprint,
      ipAddress,
      signatureStatus: 'signed',
    },
  });

  await prisma.consentLog.create({
    data: {
      userId,
      consentType,
      version: INTAKE_CONSENT_DOCUMENT_VERSION,
      ipAddress,
      granted: true,
    },
  });

  return {
    consentType,
    description,
    granted: true,
    grantedAt: grantedAt.toISOString(),
    documentVersion: INTAKE_CONSENT_DOCUMENT_VERSION,
    ipAddress,
    deviceFingerprint: fingerprint,
    signatureStatus: 'signed' as const,
  };
}

const OPEN_STATUSES: IntakeStatus[] = ['submitted', 'under_review'];

async function loadIntakeOrThrow(id: string) {
  const intake = await prisma.intakeRecord.findUnique({
    where: { id },
    include: {
      careUnit: true,
      careRecipient: true,
      familyUser: { select: { id: true, name: true, email: true, assignedCoordinatorId: true } },
      reviewer: { select: { id: true, name: true, email: true } },
      careEpisode: true,
      documents: true,
    },
  });
  if (!intake) throw new AppError('Intake not found.', 404);
  return intake;
}

function assertIntakeAccess(
  req: Request,
  intake: {
    familyUserId: string;
    organizationId: string | null;
    familyUser?: { assignedCoordinatorId: string | null } | null;
  },
): void {
  const role = req.user!.role;
  if (isFamily(role) && intake.familyUserId === req.user!.userId) return;

  // Platform admins may access any intake.
  if (isAdmin(role)) return;

  if (role === 'org_admin') {
    const tw = tenantWhere(req);
    if (!tw.organizationId || tw.organizationId === '__no_tenant__') {
      throw new AppError('No organization assigned to this account.', 403);
    }
    if (!intake.organizationId || intake.organizationId !== tw.organizationId) {
      throw new AppError('Forbidden.', 403);
    }
    return;
  }

  if (role === 'care_coordinator') {
    const tw = tenantWhere(req);
    if (!tw.organizationId || tw.organizationId === '__no_tenant__') {
      throw new AppError('No organization assigned to this account.', 403);
    }
    // M-1 / M-13: reject null-org intakes for coordinators
    if (!intake.organizationId || intake.organizationId !== tw.organizationId) {
      throw new AppError('Forbidden.', 403);
    }
    // Assigned-only: coordinator may only see families assigned to them
    const assignedTo = intake.familyUser?.assignedCoordinatorId;
    if (assignedTo !== req.user!.userId) {
      throw new AppError('Forbidden.', 403);
    }
    return;
  }

  throw new AppError('Forbidden.', 403);
}

export class IntakeController {
  /** Family (or staff) submits an immutable intake record. */
  static async submit(req: Request, res: Response): Promise<void> {
    const role = req.user!.role;
    if (!isFamily(role) && !isCoordinator(role) && !isAdmin(role)) {
      throw new AppError('Forbidden.', 403);
    }

    const data = submitIntakeSchema.parse(req.body);

    const unit = await prisma.careUnit.findFirst({
      where: { id: data.careUnitId, deletedAt: null },
    });
    if (!unit) throw new AppError('Care unit not found.', 404);

    if (isFamily(role) && unit.familyUserId !== req.user!.userId) {
      throw new AppError('Forbidden.', 403);
    }
    if (isCoordinator(role) || isAdmin(role)) {
      assertTenantOrgAccess(req, unit.organizationId);
    }

    const recipient = await prisma.careRecipient.findFirst({
      where: {
        id: data.careRecipientId,
        careUnitId: unit.id,
        deletedAt: null,
      },
    });
    if (!recipient) throw new AppError('Patient not found in this care unit.', 404);

    const openExisting = await prisma.intakeRecord.findFirst({
      where: {
        careRecipientId: recipient.id,
        status: { in: OPEN_STATUSES },
      },
      select: { id: true, status: true },
    });
    if (openExisting) {
      throw new AppError(
        `An open intake already exists for this patient (${openExisting.status}).`,
        409,
      );
    }

    const familyUserId = isFamily(role) ? req.user!.userId : unit.familyUserId;
    const organizationId = unit.organizationId ?? req.tenant?.organizationId ?? null;

    if (!organizationId) {
      throw new AppError(
        'This care unit is not linked to a care organization, so the request cannot be routed. Contact your clinic or ask an administrator to assign an organization.',
        422,
      );
    }

    // Immutable consent capture (Privacy + Treatment required)
    const consentRecords = [];
    consentRecords.push(
      await recordIntakeConsent(
        req,
        familyUserId,
        'privacy',
        'Privacy Consent — processing of intake and clinical data',
      ),
    );
    consentRecords.push(
      await recordIntakeConsent(
        req,
        familyUserId,
        'treatment',
        'Treatment Consent — clinical assessment and care planning',
      ),
    );
    if (data.telehealthConsent) {
      consentRecords.push(
        await recordIntakeConsent(
          req,
          familyUserId,
          'telehealth',
          'Telehealth Consent — virtual care sessions',
        ),
      );
    }
    if (data.dataSharingConsent) {
      consentRecords.push(
        await recordIntakeConsent(
          req,
          familyUserId,
          'data_sharing',
          'Data Sharing Consent — sharing reports with care team',
        ),
      );
    }

    // G-15: record health-data consent on behalf of the care recipient (guardian/family basis)
    consentRecords.push(
      await recordIntakeConsent(
        req,
        familyUserId,
        `care_recipient_health:${recipient.id}`,
        `Special-category health data consent on behalf of care recipient ${recipient.name} (legal basis: family/guardian care arrangement)`,
      ),
    );

    const wizardPayload = {
      ...(data.wizardPayload ?? {}),
      privacyConsent: true,
      treatmentConsent: true,
      telehealthConsent: data.telehealthConsent,
      dataSharingConsent: data.dataSharingConsent,
      consents: consentRecords,
      consentDocumentVersion: INTAKE_CONSENT_DOCUMENT_VERSION,
    };

    const intake = await prisma.intakeRecord.create({
      data: {
        careUnitId: unit.id,
        careRecipientId: recipient.id,
        familyUserId,
        organizationId: organizationId ?? undefined,
        status: 'submitted',
        urgencyLevel: data.urgencyLevel,
        reasonForCare: data.reasonForCare,
        medicalHistory: data.medicalHistory,
        currentMeds: data.currentMeds,
        diagnoses: data.diagnoses,
        serviceInterests: data.serviceInterests,
        primaryCaregiverName: data.primaryCaregiverName ?? unit.primaryCaregiverName,
        primaryCaregiverPhone: data.primaryCaregiverPhone ?? unit.primaryCaregiverPhone,
        primaryCaregiverRelation:
          data.primaryCaregiverRelation ?? unit.primaryCaregiverRelation,
        wizardPayload: wizardPayload as Prisma.InputJsonValue,
        submittedAt: new Date(),
      },
      include: {
        careUnit: { select: { id: true, name: true } },
        careRecipient: { select: { id: true, name: true, externalRef: true } },
        documents: true,
      },
    });

    if (data.documentIds.length > 0) {
      const owned = await prisma.document.findMany({
        where: {
          id: { in: data.documentIds },
          userId: req.user!.userId,
          careUnitId: unit.id,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (owned.length !== data.documentIds.length) {
        throw new AppError('One or more documents are invalid for this care unit.', 422);
      }
      await prisma.document.updateMany({
        where: { id: { in: owned.map((d) => d.id) } },
        data: { intakeRecordId: intake.id },
      });
    }

    const withDocs = await prisma.intakeRecord.findUnique({
      where: { id: intake.id },
      include: {
        careUnit: { select: { id: true, name: true } },
        careRecipient: { select: { id: true, name: true, externalRef: true } },
        documents: true,
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'intake_submitted',
      entity: 'IntakeRecord',
      entityId: intake.id,
      after: {
        status: intake.status,
        diagnoses: intake.diagnoses,
        documentCount: data.documentIds.length,
        consents: consentRecords.map((c) => c.consentType),
      },
      req,
    });

    res.status(201).json({
      data: {
        ...(withDocs ?? intake),
        consents: consentRecords,
      },
    });
  }

  static async show(req: Request, res: Response): Promise<void> {
    const intake = await loadIntakeOrThrow(req.params.id);
    assertIntakeAccess(req, intake);

    const payload = (intake.wizardPayload as Record<string, unknown> | null) ?? {};
    const fromPayload = Array.isArray(payload.consents) ? payload.consents : null;

    let consents = fromPayload;
    if (!consents) {
      const logs = await prisma.consentLog.findMany({
        where: {
          userId: intake.familyUserId,
          consentType: { in: ['privacy', 'treatment', 'telehealth', 'data_sharing'] },
          granted: true,
          createdAt: {
            gte: new Date(new Date(intake.submittedAt).getTime() - 5 * 60 * 1000),
            lte: new Date(new Date(intake.submittedAt).getTime() + 5 * 60 * 1000),
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      consents = logs.map((l) => ({
        consentType: l.consentType,
        granted: l.granted,
        grantedAt: l.createdAt.toISOString(),
        documentVersion: l.version,
        ipAddress: l.ipAddress,
      }));
    }

    res.json({ data: { ...intake, consents } });
  }

  /**
   * Family (or coordinator) updates the care-request details stored on an intake
   * (wizard answers + mapped reason/services). Used by Care Unit "Edit".
   */
  static async updateRequest(req: Request, res: Response): Promise<void> {
    const intake = await loadIntakeOrThrow(req.params.id);
    assertIntakeAccess(req, intake);

    if (intake.status === 'withdrawn') {
      throw new AppError('Withdrawn intakes cannot be edited.', 422);
    }

    const body = updateFamilyRequestSchema.parse(req.body);
    const existingPayload =
      (intake.wizardPayload as Record<string, unknown> | null) ?? {};

    const wizardPayload = {
      ...existingPayload,
      ...body.wizardPayload,
      source:
        (body.wizardPayload.source as string | undefined) ||
        (existingPayload.source as string | undefined) ||
        'family_careseeker_onboarding',
      updatedAt: new Date().toISOString(),
      updatedBy: req.user!.userId,
    };

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.intakeRecord.update({
        where: { id: intake.id },
        data: {
          wizardPayload: wizardPayload as Prisma.InputJsonValue,
          ...(body.reasonForCare
            ? { reasonForCare: body.reasonForCare }
            : {}),
          ...(body.serviceInterests
            ? { serviceInterests: body.serviceInterests }
            : {}),
          ...(body.primaryCaregiverName !== undefined
            ? { primaryCaregiverName: body.primaryCaregiverName || null }
            : {}),
          ...(body.primaryCaregiverPhone !== undefined
            ? { primaryCaregiverPhone: body.primaryCaregiverPhone || null }
            : {}),
          ...(body.primaryCaregiverRelation !== undefined
            ? { primaryCaregiverRelation: body.primaryCaregiverRelation || null }
            : {}),
        },
        include: {
          careUnit: true,
          careRecipient: { select: { id: true, name: true, externalRef: true } },
          documents: true,
        },
      });

      if (body.syncCareUnit) {
        const unitData: Prisma.CareUnitUpdateInput = {};
        if (body.syncCareUnit.address !== undefined) {
          unitData.address = body.syncCareUnit.address || null;
        }
        if (body.syncCareUnit.country) {
          unitData.country = body.syncCareUnit.country;
        }
        if (body.syncCareUnit.primaryCaregiverName !== undefined) {
          unitData.primaryCaregiverName = body.syncCareUnit.primaryCaregiverName || null;
        }
        if (Object.keys(unitData).length > 0) {
          await tx.careUnit.update({
            where: { id: intake.careUnitId },
            data: unitData,
          });
        }
      }

      return row;
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'intake_request_updated',
      entity: 'IntakeRecord',
      entityId: intake.id,
      before: { wizardPayload: intake.wizardPayload },
      after: { wizardPayload: updated.wizardPayload },
      req,
    });

    res.json({ data: updated });
  }

  /** Coordinator queue with status / urgency filters + tenant scope. */
  /** Sidebar badge: open intakes in this coordinator's assigned queue. */
  static async navBadges(req: Request, res: Response): Promise<void> {
    if (!isCoordinator(req.user!.role)) {
      throw new AppError('Care coordinator access required.', 403);
    }

    const tw = tenantWhere(req);
    const where: Prisma.IntakeRecordWhereInput = {
      status: { in: OPEN_STATUSES },
    };
    if (tw.organizationId) {
      where.organizationId = tw.organizationId;
    }
    if (where.organizationId === '__no_tenant__') {
      throw new AppError('No organization assigned to this account.', 403);
    }
    if (req.user!.role === 'care_coordinator') {
      where.familyUser = { assignedCoordinatorId: req.user!.userId };
    }

    const pendingIntake = await prisma.intakeRecord.count({ where });
    res.json({ data: { pendingIntake } });
  }

  static async queue(req: Request, res: Response): Promise<void> {
    if (!isCoordinator(req.user!.role)) {
      throw new AppError('Care coordinator access required.', 403);
    }

    const {
      page = '1',
      limit = '20',
      status,
      urgency,
    } = req.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const tw = tenantWhere(req);
    const where: Prisma.IntakeRecordWhereInput = {};
    if (tw.organizationId) {
      where.organizationId = tw.organizationId;
    }

    // Admins get {} from tenantWhere; coordinators without org get sentinel
    if (where.organizationId === '__no_tenant__') {
      throw new AppError('No organization assigned to this account.', 403);
    }

    // Assigned-only: care_coordinator sees only their assigned families' intakes
    if (req.user!.role === 'care_coordinator') {
      where.familyUser = { assignedCoordinatorId: req.user!.userId };
    }

    if (status) {
      where.status = status as IntakeStatus;
    }
    if (urgency) {
      where.urgencyLevel = urgency as UrgencyLevel;
    }

    const [data, total] = await Promise.all([
      prisma.intakeRecord.findMany({
        where,
        include: {
          careUnit: { select: { id: true, name: true } },
          careRecipient: {
            select: { id: true, name: true, externalRef: true, diagnosisCodes: true },
          },
          familyUser: { select: { id: true, name: true, email: true, assignedCoordinatorId: true } },
        },
        orderBy: [{ urgencyLevel: 'desc' }, { submittedAt: 'asc' }],
        skip,
        take: parseInt(limit, 10),
      }),
      prisma.intakeRecord.count({ where }),
    ]);

    res.json({ data, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  }

  /** Move intake along status machine (e.g. start review / withdraw / send back). */
  static async updateStatus(req: Request, res: Response): Promise<void> {
    const intake = await loadIntakeOrThrow(req.params.id);
    assertIntakeAccess(req, intake);

    const { status } = statusSchema.parse(req.body);
    assertIntakeTransition(intake.status, status);

    // Only coordinators/admins can pull into review or validate; family can withdraw while open
    if (status === 'withdrawn') {
      if (!isFamily(req.user!.role) && !isCoordinator(req.user!.role)) {
        throw new AppError('Forbidden.', 403);
      }
      if (isFamily(req.user!.role) && intake.familyUserId !== req.user!.userId) {
        throw new AppError('Forbidden.', 403);
      }
    } else if (!isCoordinator(req.user!.role)) {
      throw new AppError('Care coordinator access required.', 403);
    }

    if (status === 'validated' || status === 'episode_created') {
      throw new AppError(
        'Use POST /intake/:id/review to validate and create an episode.',
        422,
      );
    }

    // M-22: block withdrawal once an episode exists
    if (status === 'withdrawn' && intake.careEpisodeId) {
      throw new AppError(
        'Cannot withdraw an intake that already has a care episode. Contact your coordinator.',
        422,
      );
    }

    const updated = await prisma.intakeRecord.update({
      where: { id: intake.id },
      data: { status },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'intake_status_changed',
      entity: 'IntakeRecord',
      entityId: intake.id,
      before: { status: intake.status },
      after: { status: updated.status },
      req,
    });

    if (status === 'withdrawn' && intake.reviewerId) {
      try {
        await NotificationService.create({
          userId: intake.reviewerId,
          title: 'Intake withdrawn',
          body: 'A family withdrew an intake that was under review.',
          type: 'intake_withdrawn',
          data: { intakeId: intake.id },
        });
      } catch (err) {
        console.error('intake_withdrawn notification failed', err);
      }
    }

    res.json({ data: updated });
  }

  /** Coordinator raises intake urgency for queue priority (R6). */
  static async updateUrgency(req: Request, res: Response): Promise<void> {
    if (!isCoordinator(req.user!.role)) {
      throw new AppError('Care coordinator access required.', 403);
    }

    const intake = await loadIntakeOrThrow(req.params.id);
    assertIntakeAccess(req, intake);

    const { urgencyLevel } = z
      .object({ urgencyLevel: urgencyEnum })
      .parse(req.body);

    if (intake.status === 'withdrawn') {
      throw new AppError('Cannot change urgency on a withdrawn intake.', 422);
    }

    const updated = await prisma.intakeRecord.update({
      where: { id: intake.id },
      data: { urgencyLevel },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'intake_urgency_changed',
      entity: 'IntakeRecord',
      entityId: intake.id,
      before: { urgencyLevel: intake.urgencyLevel },
      after: { urgencyLevel: updated.urgencyLevel },
      req,
    });

    res.json({ data: updated });
  }

  /**
   * Structured coordinator review → validated → optional CareEpisode + episode_created.
   * Free-text-only reviews are rejected (guided fields required).
   */
  static async review(req: Request, res: Response): Promise<void> {
    if (!isCoordinator(req.user!.role)) {
      throw new AppError('Care coordinator access required.', 403);
    }

    const intake = await loadIntakeOrThrow(req.params.id);
    assertIntakeAccess(req, intake);

    const review = reviewSchema.parse(req.body);

    const reviewSummary = {
      keyConcerns: review.keyConcerns,
      urgencyIndicators: review.urgencyIndicators,
      suggestedServiceCategories: review.suggestedServiceCategories,
      riskFlags: review.riskFlags,
      notes: review.notes ?? null,
    };

    // Validate desired path before writing
    if (intake.status === 'submitted') {
      assertIntakeTransition('submitted', 'under_review');
      assertIntakeTransition('under_review', 'validated');
    } else {
      assertIntakeTransition(intake.status, 'validated');
    }
    if (review.createEpisode) {
      assertIntakeTransition('validated', 'episode_created');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Auto-advance submitted → under_review inside the same transaction
      if (intake.status === 'submitted') {
        await tx.intakeRecord.update({
          where: { id: intake.id },
          data: { status: 'under_review' },
        });
      }

      const validated = await tx.intakeRecord.update({
        where: { id: intake.id },
        data: {
          status: 'validated',
          reviewedAt: new Date(),
          reviewerId: req.user!.userId,
          reviewSummary: reviewSummary as Prisma.InputJsonValue,
        },
      });

      if (review.createEpisode) {
        // Re-check inside transaction to prevent duplicate episodes (H-2).
        const locked = await tx.intakeRecord.findUnique({
          where: { id: intake.id },
          select: { id: true, status: true, careEpisodeId: true },
        });
        if (!locked || locked.careEpisodeId) {
          throw new AppError('Intake already has a care episode.', 409);
        }
        if (!['submitted', 'under_review', 'validated'].includes(locked.status)) {
          throw new AppError('Intake is not open for episode creation.', 422);
        }

        const party = await resolveEpisodePartyIds({
          careUnitId: intake.careUnitId,
          careRecipientId: intake.careRecipientId,
          patientId: intake.familyUserId,
        });

        const episode = await tx.careEpisode.create({
          data: {
            coordinatorId:
              review.coordinatorId ??
              intake.familyUser?.assignedCoordinatorId ??
              req.user!.userId,
            // Account party = CareRecipient.userId (family guardian in M2). Clinical patient = careRecipientId (C-1).
            patientId: party.patientId,
            careRecipientId: party.careRecipientId,
            careUnitId: intake.careUnitId,
            organizationId: intake.organizationId ?? undefined,
            title:
              review.episodeTitle?.trim() ||
              `Care episode — ${intake.careRecipient.name}`,
            status: 'validated',
            urgencyLevel: intake.urgencyLevel ?? undefined,
            reasonForCare: intake.reasonForCare,
            medicalHistory: intake.medicalHistory ?? undefined,
            currentMeds: intake.currentMeds ?? undefined,
            diagnoses: intake.diagnoses,
            serviceInterests: intake.serviceInterests,
            intakeSummary: reviewSummary as Prisma.InputJsonValue,
            intakeReviewedAt: new Date(),
            intakeReviewerId: req.user!.userId,
          },
        });

        const linkedResult = await tx.intakeRecord.updateMany({
          where: { id: intake.id, careEpisodeId: null },
          data: {
            status: 'episode_created',
            careEpisodeId: episode.id,
          },
        });
        if (linkedResult.count !== 1) {
          throw new AppError('Intake already has a care episode.', 409);
        }

        const linked = await tx.intakeRecord.findUniqueOrThrow({
          where: { id: intake.id },
          include: {
            careEpisode: true,
            careRecipient: true,
            careUnit: true,
          },
        });

        return { intake: linked, episode };
      }

      return {
        intake: validated,
        episode: null as null,
      };
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'intake_reviewed',
      entity: 'IntakeRecord',
      entityId: intake.id,
      after: {
        status: result.intake.status,
        // H-30: notes omitted from audit log — may contain free-text PHI
        reviewSummary: {
          keyConcerns: reviewSummary.keyConcerns,
          urgencyIndicators: reviewSummary.urgencyIndicators,
          suggestedServiceCategories: reviewSummary.suggestedServiceCategories,
          riskFlags: reviewSummary.riskFlags,
        },
        careEpisodeId: result.episode?.id ?? null,
      },
      req,
    });

    await NotificationService.create({
      userId: intake.familyUserId,
      title: 'Intake reviewed',
      body: review.createEpisode
        ? 'Your intake was validated and a care episode has been created.'
        : 'Your intake was validated by the care coordinator.',
      type: 'intake_reviewed',
    }).catch(() => undefined);

    // M3-2.2: non-blocking AI intake summary after episode create (never fail review)
    if (result.episode?.id) {
      await AiIntakeSummaryService.summarizeAndPersistSafe({
        episodeId: result.episode.id,
        intake: {
          reasonForCare: intake.reasonForCare,
          urgencyLevel: intake.urgencyLevel,
          medicalHistory: intake.medicalHistory,
          currentMeds: intake.currentMeds,
          diagnoses: intake.diagnoses,
          serviceInterests: intake.serviceInterests,
        },
        careRecipient: {
          dateOfBirth: intake.careRecipient.dateOfBirth,
          gender: intake.careRecipient.gender,
          diagnosisCodes: intake.careRecipient.diagnosisCodes,
        },
      });
    }

    res.json({ data: result });
  }
}
