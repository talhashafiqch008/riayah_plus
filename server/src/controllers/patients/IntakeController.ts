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
  keyConcerns: z.array(z.string().min(1)).min(1),
  urgencyIndicators: z.array(z.string().min(1)).min(1),
  suggestedServiceCategories: z.array(serviceEnum).min(1),
  riskFlags: z.array(z.string().min(1)).default([]),
  createEpisode: z.boolean().optional().default(true),
  episodeTitle: optionalSanitizedString(),
  notes: optionalSanitizedString(),
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
      familyUser: { select: { id: true, name: true, email: true } },
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
  intake: { familyUserId: string; organizationId: string | null },
): void {
  const role = req.user!.role;
  if (isFamily(role) && intake.familyUserId === req.user!.userId) return;
  if (isCoordinator(role) || isAdmin(role)) {
    const tw = tenantWhere(req);
    if (tw.organizationId === '__no_tenant__') {
      throw new AppError('No organization assigned to this account.', 403);
    }
    if (
      tw.organizationId &&
      intake.organizationId !== tw.organizationId
    ) {
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
          familyUser: { select: { id: true, name: true, email: true } },
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
        const episode = await tx.careEpisode.create({
          data: {
            coordinatorId: req.user!.userId,
            patientId: intake.familyUserId,
            careRecipientId: intake.careRecipientId,
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

        const linked = await tx.intakeRecord.update({
          where: { id: intake.id },
          data: {
            status: 'episode_created',
            careEpisodeId: episode.id,
          },
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
        reviewSummary,
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

    res.json({ data: result });
  }
}
