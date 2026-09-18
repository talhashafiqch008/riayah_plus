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
import { assertAiCarePlanConsent } from '../utils/aiCarePlanConsent';
import { AuditService } from './AuditService';
import {
  nullableSanitizedString,
  sanitizedString,
  sanitizePlainText,
} from '../utils/sanitize';

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
  title: sanitizedString(z.string().min(1)),
  description: nullableSanitizedString(),
  targetDate: z.string().nullable().optional(),
  measurementCriteria: nullableSanitizedString(),
  status: z.string().optional(),
});

const plannedServiceSchema = z.object({
  serviceType: sanitizedString(z.string().min(1)),
  category: optionalSanitizedOrPlain(),
  frequency: nullableSanitizedString(),
  durationMinutes: z.number().nullable().optional(),
  unitCost: z.number().nullable().optional(),
  assignedStaffRole: nullableSanitizedString(),
  notes: nullableSanitizedString(),
  status: z.string().optional(),
});

const riskFlagSchema = z.object({
  factor: sanitizedString(z.string()),
  severity: sanitizedString(z.string()),
  evidence: sanitizedString(z.string()),
  recommendedAction: nullableSanitizedString(),
});

function optionalSanitizedOrPlain() {
  return z.preprocess(
    (val) => (typeof val === 'string' ? sanitizePlainText(val) : val),
    z.string().optional(),
  );
}

const draftSchema = z
  .object({
    goals: z.array(smartGoalSchema).optional(),
    smartGoals: z.array(smartGoalSchema).optional(),
    services: z.array(plannedServiceSchema).optional(),
    plannedServices: z.array(plannedServiceSchema).optional(),
    items: z.array(plannedServiceSchema).optional(),
    riskFlags: z.array(riskFlagSchema).optional(),
    reviewCycle: nullableSanitizedString(),
    clinicalNotes: nullableSanitizedString(),
    estimatedTotalCost: z.number().nullable().optional(),
    currency: z.string().optional(),
  })
  .passthrough();

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
});

export type CarePlanDraftCallbackInput = z.infer<typeof carePlanDraftCallbackSchema>;

type NormalizedAiDraft = {
  goals: z.infer<typeof smartGoalSchema>[];
  services: z.infer<typeof plannedServiceSchema>[];
  riskFlags: z.infer<typeof riskFlagSchema>[];
  reviewCycle: string | null;
  clinicalNotes: string | null;
  estimatedTotalCost: number | null;
  currency: string;
};

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
  const lines = [AI_DRAFT_MARKER, `draftKey=${params.key}`, '---'];
  if (params.clinicalNotes?.trim()) {
    lines.push(params.clinicalNotes.trim());
  } else {
    lines.push('AI-generated care plan draft. Coordinator must review before submit-for-approval.');
  }
  return lines.join('\n');
}

/** Hide upsert metadata from coordinators/family. Marker stays in DB. */
export function publicCarePlanNotes(notes: string | null | undefined): string | null {
  if (!notes) return notes ?? null;
  if (!notes.startsWith(AI_DRAFT_MARKER)) return notes;
  const idx = notes.indexOf('\n---\n');
  if (idx === -1) return null;
  const rest = notes.slice(idx + 5).trim();
  return rest || null;
}

export function mergeCarePlanNotesForSave(
  existing: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  if (incoming === undefined) return existing ?? null;
  if (!existing?.startsWith(AI_DRAFT_MARKER)) return incoming;
  const header = existing.split(/\n---\n/)[0] ?? AI_DRAFT_MARKER;
  return `${header}\n---\n${incoming?.trim() ?? ''}`;
}

export function toPublicCarePlan<T extends { notes?: string | null }>(plan: T): T {
  return { ...plan, notes: publicCarePlanNotes(plan.notes) };
}

function coerceGoals(raw: unknown): z.infer<typeof smartGoalSchema>[] {
  if (!Array.isArray(raw)) return [];
  const mapped = raw.map((row) => (typeof row === 'string' ? { title: row } : row));
  const parsed = z.array(smartGoalSchema).safeParse(mapped);
  return parsed.success ? parsed.data : [];
}

function coerceServices(raw: unknown): z.infer<typeof plannedServiceSchema>[] {
  if (!Array.isArray(raw)) return [];
  const mapped = raw.map((row) =>
    typeof row === 'string' ? { serviceType: row, category: 'general' } : row,
  );
  const parsed = z.array(plannedServiceSchema).safeParse(mapped);
  return parsed.success ? parsed.data : [];
}

function normalizeAiDraft(
  draft: CarePlanResponse['draft'] | CarePlanDraftCallbackInput['draft'],
): NormalizedAiDraft {
  const raw = (draft ?? {}) as Record<string, unknown>;
  return {
    goals: coerceGoals(raw.goals ?? raw.smartGoals ?? raw.SMARTGoals),
    services: coerceServices(raw.services ?? raw.plannedServices ?? raw.items),
    riskFlags: Array.isArray(raw.riskFlags) ? (raw.riskFlags as z.infer<typeof riskFlagSchema>[]) : [],
    reviewCycle: typeof raw.reviewCycle === 'string' ? raw.reviewCycle : null,
    clinicalNotes: typeof raw.clinicalNotes === 'string' ? raw.clinicalNotes : null,
    estimatedTotalCost: typeof raw.estimatedTotalCost === 'number' ? raw.estimatedTotalCost : null,
    currency: typeof raw.currency === 'string' ? raw.currency : 'QAR',
  };
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
    const AI_ALLOWED_EPISODE_STATUSES = ['validated', 'active'] as const;

    const episode = await prisma.careEpisode.findUnique({
      where: { id: raw.episodeId },
      select: {
        id: true,
        title: true,
        coordinatorId: true,
        organizationId: true,
        status: true,
      },
    });
    if (!episode) {
      throw new AppError('Episode not found.', 404);
    }
    if (!AI_ALLOWED_EPISODE_STATUSES.includes(episode.status as typeof AI_ALLOWED_EPISODE_STATUSES[number])) {
      throw new AppError(
        `AI care plan drafts are only permitted for validated or active episodes (current: ${episode.status}).`,
        422,
      );
    }

    const draft = raw.draft ? normalizeAiDraft(raw.draft as CarePlanResponse['draft']) : null;
    if (!draft) {
      throw new AppError('Callback payload missing draft content.', 422);
    }
    if (!draft.goals.length || !draft.services.length) {
      throw new AppError(
        'AI care plan draft is missing goals or services. The coordinator flow cannot continue with an empty plan.',
        422,
      );
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

    await assertAiCarePlanConsent(params.actorId);

    const payload = buildCarePlanPayloadFromEpisode(episode, {
      familyConsultationNotes: params.familyConsultationNotes,
      outputLanguage: params.outputLanguage,
    });

    let aiResponse: CarePlanResponse | null = null;
    let lastAiError: RiayahAiError | null = null;
    const maxAttempts = 3;

    await AuditService.log({
      userId: params.actorId,
      action: 'ai_care_plan_request',
      entity: 'care_episode',
      entityId: episode.id,
      metadata: {
        processor: 'riayah_ai',
        consentType: 'ai_care_plan',
        outputLanguage: params.outputLanguage ?? 'en',
      },
    });

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

    const draft = normalizeAiDraft(aiResponse.draft);
    if (!draft.goals.length || !draft.services.length) {
      throw new AppError(
        'AI service returned a draft with no goals or services. Please retry, or create the care plan manually.',
        502,
      );
    }

    const persisted = await this.handleCallback({
      episodeId: episode.id,
      draftId: COORDINATOR_TRIGGER_DRAFT_ID,
      draft,
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

export function buildCarePlanPayloadFromEpisode(
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
      gender: episode.careRecipient?.gender ?? null,
      diagnoses,
    },
    episode: {
      title: episode.title,
      reasonForCare: episode.reasonForCare,
      urgencyLevel: episode.urgencyLevel
        ? URGENCY_TO_AI[episode.urgencyLevel] ?? episode.urgencyLevel
        : null,
      serviceInterests: episode.serviceInterests,
      diagnoses,
      observedChallenges: episode.observedChallenges ?? [],
    },
    assessments: episode.assessments.map((a) => ({
      type: a.type,
      findings: null,
      recommendations: recs(a.recommendations),
    })),
  };
}
