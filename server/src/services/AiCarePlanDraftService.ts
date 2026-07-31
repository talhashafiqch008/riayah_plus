import { z } from 'zod';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { NotificationService } from './NotificationService';
import { logger } from '../config/logger';
import {
  RiayahAiClient,
  RiayahAiError,
  type CarePlanPayload,
  type CarePlanResponse,
} from './RiayahAiClient';

/** Marker stored in CarePlan.notes so AI drafts can be found for idempotent upserts. */
export const AI_DRAFT_MARKER = '[riayah-ai-draft]';

/** Stable draftKey for coordinator-triggered AI drafts (regenerate upserts same plan). */
export const COORDINATOR_TRIGGER_DRAFT_ID = 'coordinator-trigger';

const URGENCY_TO_AI: Record<string, string> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'critical',
};

const smartGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  measurementCriteria: z.string().nullable().optional(),
  status: z.string().optional(),
});

const plannedServiceSchema = z.object({
  serviceType: z.string().min(1),
  category: z.string().optional(),
  frequency: z.string().nullable().optional(),
  durationMinutes: z.number().nullable().optional(),
  unitCost: z.number().nullable().optional(),
  assignedStaffRole: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.string().optional(),
});

const riskFlagSchema = z.object({
  factor: z.string(),
  severity: z.string(),
  evidence: z.string(),
  recommendedAction: z.string().nullable().optional(),
});

const draftSchema = z.object({
  goals: z.array(smartGoalSchema).default([]),
  services: z.array(plannedServiceSchema).default([]),
  riskFlags: z.array(riskFlagSchema).optional().default([]),
  reviewCycle: z.string().nullable().optional(),
  clinicalNotes: z.string().nullable().optional(),
  estimatedTotalCost: z.number().nullable().optional(),
  currency: z.string().optional().default('QAR'),
});

/** Body accepted from Riayah AI (CarePlanResponse-shaped + optional draftId). */
export const carePlanDraftCallbackSchema = z.object({
  episodeId: z.string().min(1),
  draftId: z.string().min(1).optional(),
  idempotencyKey: z.string().min(1).optional(),
  draft: draftSchema.nullable().optional(),
  model: z.string().nullable().optional(),
  status: z.string().optional(),
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  totalTokens: z.number().optional(),
  rawResponse: z.record(z.unknown()).nullable().optional(),
});

export type CarePlanDraftCallbackInput = z.infer<typeof carePlanDraftCallbackSchema>;

function draftKey(episodeId: string, draftId?: string, idempotencyKey?: string): string {
  return idempotencyKey || draftId || `episode:${episodeId}`;
}

function buildNotes(params: {
  key: string;
  model?: string | null;
  clinicalNotes?: string | null;
  reviewCycle?: string | null;
  riskFlags?: z.infer<typeof riskFlagSchema>[];
}): string {
  const lines = [
    AI_DRAFT_MARKER,
    `draftKey=${params.key}`,
    params.model ? `model=${params.model}` : null,
    params.reviewCycle ? `reviewCycle=${params.reviewCycle}` : null,
  ].filter(Boolean);

  if (params.riskFlags?.length) {
    lines.push(`riskFlags=${params.riskFlags.length}`);
  }

  lines.push('---');
  if (params.clinicalNotes?.trim()) {
    lines.push(params.clinicalNotes.trim());
  } else {
    lines.push('AI-generated care plan draft. Coordinator must review before submit-for-approval.');
  }

  return lines.join('\n');
}

function formatDuration(minutes: number | null | undefined): string | undefined {
  if (minutes == null) return undefined;
  return `${minutes}min`;
}

/**
 * Idempotent upsert of an AI care-plan draft for an episode.
 * Same episode + draftKey → update existing draft; never creates duplicate AI drafts.
 * Never auto-submits to family.
 */
export class AiCarePlanDraftService {
  static async handleCallback(raw: CarePlanDraftCallbackInput): Promise<{
    carePlanId: string;
    episodeId: string;
    created: boolean;
    idempotentReplay: boolean;
    status: string;
    version: number;
  }> {
    const episode = await prisma.careEpisode.findUnique({
      where: { id: raw.episodeId },
      select: {
        id: true,
        title: true,
        coordinatorId: true,
      },
    });
    if (!episode) {
      throw new AppError('Episode not found.', 404);
    }

    const draft = raw.draft;
    if (!draft) {
      throw new AppError('Callback payload missing draft content.', 422);
    }

    const key = draftKey(raw.episodeId, raw.draftId, raw.idempotencyKey);
    const notes = buildNotes({
      key,
      model: raw.model,
      clinicalNotes: draft.clinicalNotes,
      reviewCycle: draft.reviewCycle,
      riskFlags: draft.riskFlags,
    });
    const title = `AI Draft — ${episode.title}`.slice(0, 200);

    const existing = await prisma.carePlan.findFirst({
      where: {
        episodeId: episode.id,
        status: 'draft',
        notes: { contains: `draftKey=${key}` },
      },
      orderBy: { version: 'desc' },
    });

    const goalCreates = draft.goals.map((g) => ({
      title: g.title,
      description: g.description ?? undefined,
      measurement: g.measurementCriteria ?? undefined,
      measurableOutcome: g.measurementCriteria ?? undefined,
      targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
      userId: episode.coordinatorId,
    }));

    const itemCreates = draft.services.map((s) => ({
      serviceType: s.serviceType,
      frequency: s.frequency ?? undefined,
      duration: formatDuration(s.durationMinutes),
      unitCost: s.unitCost ?? undefined,
      currency: draft.currency ?? 'QAR',
      assignedRole: s.assignedStaffRole ?? undefined,
      notes: s.notes ?? (s.category ? `category:${s.category}` : undefined),
    }));

    if (existing) {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.goal.deleteMany({ where: { carePlanId: existing.id } });
        await tx.carePlanItem.deleteMany({ where: { carePlanId: existing.id } });

        if (goalCreates.length) {
          await tx.goal.createMany({
            data: goalCreates.map((g) => ({ ...g, carePlanId: existing.id })),
          });
        }
        if (itemCreates.length) {
          await tx.carePlanItem.createMany({
            data: itemCreates.map((i) => ({ ...i, carePlanId: existing.id })),
          });
        }

        return tx.carePlan.update({
          where: { id: existing.id },
          data: {
            title,
            notes,
            status: 'draft',
            isCurrentVersion: true,
            submittedAt: null,
            approvedAt: null,
            approvedById: null,
            rejectionNotes: null,
          },
          select: { id: true, status: true, version: true },
        });
      });

      logger.info('AI care plan draft callback upserted (idempotent)', {
        episodeId: episode.id,
        carePlanId: updated.id,
        draftKey: key,
      });

      return {
        carePlanId: updated.id,
        episodeId: episode.id,
        created: false,
        idempotentReplay: true,
        status: updated.status,
        version: updated.version,
      };
    }

    const maxVersion = await prisma.carePlan.aggregate({
      where: { episodeId: episode.id },
      _max: { version: true },
    });
    const nextVersion = (maxVersion._max.version ?? 0) + 1;

    const created = await prisma.$transaction(async (tx) => {
      const currentPlans = await tx.carePlan.findMany({
        where: { episodeId: episode.id, isCurrentVersion: true },
        select: { id: true, notes: true, status: true },
      });

      const blocking = currentPlans.find(
        (p) =>
          p.status !== 'draft' || !(p.notes ?? '').includes(AI_DRAFT_MARKER),
      );
      if (blocking) {
        throw new AppError(
          'A care plan already exists for this episode. Finish, reject, or supersede it before accepting a new AI draft.',
          409,
        );
      }

      // Only demote other AI draft rows (idempotent regenerate path).
      await tx.carePlan.updateMany({
        where: {
          episodeId: episode.id,
          isCurrentVersion: true,
          status: 'draft',
          notes: { contains: AI_DRAFT_MARKER },
        },
        data: { isCurrentVersion: false },
      });

      return tx.carePlan.create({
        data: {
          episodeId: episode.id,
          coordinatorId: episode.coordinatorId,
          title,
          notes,
          status: 'draft',
          version: nextVersion,
          isCurrentVersion: true,
          goals: goalCreates.length ? { create: goalCreates } : undefined,
          items: itemCreates.length ? { create: itemCreates } : undefined,
        },
        select: { id: true, status: true, version: true },
      });
    });

    await NotificationService.create({
      userId: episode.coordinatorId,
      title: 'AI Care Plan Draft Ready',
      body: 'An AI-generated care plan draft is ready for your review. Edit and submit when ready — it will not go to the family until you submit.',
      type: 'care_plan_ai_draft',
      data: { carePlanId: created.id, episodeId: episode.id, draftKey: key },
    }).catch(() => undefined);

    logger.info('AI care plan draft callback created', {
      episodeId: episode.id,
      carePlanId: created.id,
      draftKey: key,
      version: created.version,
    });

    return {
      carePlanId: created.id,
      episodeId: episode.id,
      created: true,
      idempotentReplay: false,
      status: created.status,
      version: created.version,
    };
  }

  /**
   * Coordinator explicit trigger: call Riayah AI draft endpoint, then persist via handleCallback.
   * Does not auto-submit to family. Prefer this over silent auto-generation.
   */
  static async requestFromCoordinator(params: {
    episodeId: string;
    actorId: string;
    familyConsultationNotes?: string | null;
    outputLanguage?: string;
  }): Promise<{
    carePlanId: string;
    episodeId: string;
    created: boolean;
    idempotentReplay: boolean;
    status: string;
    version: number;
    ai: { model: string | null; totalTokens: number; status: string };
  }> {
    const episode = await prisma.careEpisode.findUnique({
      where: { id: params.episodeId },
      include: {
        careRecipient: {
          select: { dateOfBirth: true, gender: true, diagnosisCodes: true },
        },
        assessments: {
          where: { status: 'completed' },
          orderBy: { completedAt: 'desc' },
          take: 10,
          select: {
            type: true,
            findings: true,
            recommendations: true,
          },
        },
      },
    });
    if (!episode) throw new AppError('Episode not found.', 404);

    const payload = buildCarePlanPayloadFromEpisode(episode, {
      familyConsultationNotes: params.familyConsultationNotes,
      outputLanguage: params.outputLanguage,
    });

    let aiResponse: CarePlanResponse | null = null;
    let lastAiError: RiayahAiError | null = null;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        aiResponse = await RiayahAiClient.requestCarePlanDraft(episode.id, payload);
        break;
      } catch (err) {
        if (!(err instanceof RiayahAiError)) throw err;
        lastAiError = err;
        const detail = err.message || '';
        const schemaEcho =
          err.statusCode === 422 &&
          detail.includes('familyConsultationNotes') &&
          detail.includes('Extra inputs are not permitted');
        if (!schemaEcho || attempt === maxAttempts) break;
        logger.warn('AI care plan draft schema echo — retrying', {
          episodeId: episode.id,
          attempt,
          detail: detail.slice(0, 200),
        });
      }
    }

    if (!aiResponse) {
      const detail = lastAiError?.message || 'AI care plan draft request failed.';
      const schemaEcho =
        lastAiError?.statusCode === 422 &&
        detail.includes('familyConsultationNotes') &&
        detail.includes('Extra inputs are not permitted');
      throw new AppError(
        schemaEcho
          ? 'AI draft failed due to an upstream schema issue (familyConsultationNotes echoed into the draft). Please retry, or create the care plan manually.'
          : detail,
        lastAiError?.statusCode && lastAiError.statusCode >= 400 && lastAiError.statusCode < 600
          ? lastAiError.statusCode
          : 502,
      );
    }

    if (!aiResponse.draft) {
      throw new AppError('AI service returned no care plan draft.', 502);
    }

    const persisted = await this.handleCallback({
      episodeId: episode.id,
      draftId: COORDINATOR_TRIGGER_DRAFT_ID,
      draft: {
        goals: aiResponse.draft.goals ?? [],
        services: aiResponse.draft.services ?? [],
        riskFlags: aiResponse.draft.riskFlags ?? [],
        reviewCycle: aiResponse.draft.reviewCycle,
        clinicalNotes: aiResponse.draft.clinicalNotes,
        estimatedTotalCost: aiResponse.draft.estimatedTotalCost,
        currency: aiResponse.draft.currency ?? 'QAR',
      },
      model: aiResponse.model,
      status: aiResponse.status ?? 'draft',
      promptTokens: aiResponse.promptTokens,
      completionTokens: aiResponse.completionTokens,
      totalTokens: aiResponse.totalTokens,
    });

    logger.info('Coordinator requested AI care plan draft', {
      episodeId: episode.id,
      actorId: params.actorId,
      carePlanId: persisted.carePlanId,
      created: persisted.created,
      model: aiResponse.model,
      totalTokens: aiResponse.totalTokens,
    });

    return {
      ...persisted,
      ai: {
        model: aiResponse.model ?? null,
        totalTokens: aiResponse.totalTokens ?? 0,
        status: aiResponse.status ?? 'draft',
      },
    };
  }
}

function stringifyFindings(findings: unknown): string | null {
  if (findings == null) return null;
  if (typeof findings === 'string') return findings;
  try {
    return JSON.stringify(findings);
  } catch {
    return String(findings);
  }
}

function buildCarePlanPayloadFromEpisode(
  episode: {
    id: string;
    title: string;
    reasonForCare: string | null;
    urgencyLevel: string | null;
    medicalHistory: string | null;
    currentMeds: string | null;
    diagnoses: string[];
    serviceInterests: string[];
    observedChallenges: string[];
    careRecipient: {
      dateOfBirth: Date | null;
      gender: string | null;
      diagnosisCodes: string[];
    } | null;
    assessments: Array<{
      type: string;
      findings: unknown;
      recommendations: string | null;
    }>;
  },
  options?: { familyConsultationNotes?: string | null; outputLanguage?: string },
): CarePlanPayload {
  const diagnoses = [
    ...new Set([
      ...(episode.diagnoses ?? []),
      ...(episode.careRecipient?.diagnosisCodes ?? []),
    ].filter(Boolean)),
  ];

  const recs = (raw: string | null): string[] => {
    if (!raw?.trim()) return [];
    return raw
      .split(/[\n;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  return {
    profileName: 'careplan_draft',
    outputLanguage: options?.outputLanguage ?? 'en',
    // Keep top-level notes null — staging LLM sometimes echoes a string notes field
    // into CarePlanDraft (additionalProperties: false) and returns 422.
    familyConsultationNotes: null,
    metadata: {
      ...(options?.familyConsultationNotes?.trim()
        ? { familyConsultationNotes: options.familyConsultationNotes.trim() }
        : {}),
    },
    patient: {
      dateOfBirth: episode.careRecipient?.dateOfBirth
        ? episode.careRecipient.dateOfBirth.toISOString().slice(0, 10)
        : null,
      gender: episode.careRecipient?.gender ?? null,
      diagnoses,
      ...(episode.medicalHistory ? { medicalHistory: episode.medicalHistory } : {}),
    },
    episode: {
      title: episode.title,
      reasonForCare: episode.reasonForCare,
      urgencyLevel: episode.urgencyLevel
        ? URGENCY_TO_AI[episode.urgencyLevel] ?? episode.urgencyLevel
        : null,
      serviceInterests: episode.serviceInterests,
      ...(episode.medicalHistory ? { medicalHistory: episode.medicalHistory } : {}),
      currentMeds: episode.currentMeds
        ? episode.currentMeds.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
        : [],
      diagnoses,
      observedChallenges: episode.observedChallenges ?? [],
    },
    assessments: episode.assessments.map((a) => ({
      type: a.type,
      findings: stringifyFindings(a.findings),
      recommendations: recs(a.recommendations),
    })),
  };
}
