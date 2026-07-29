import { Prisma, ServiceCategory, UrgencyLevel } from '@prisma/client';
import { logger } from '../config/logger';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  RiayahAiClient,
  RiayahAiError,
  type IntakeSummarisationPayload,
  type IntakeSummarisationResponse,
} from './RiayahAiClient';

/** Prisma → Riayah AI urgency (`urgent` is our enum; AI uses `critical`). */
const URGENCY_TO_AI: Record<string, string> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'critical',
};

/** Prisma ServiceCategory → AI ServiceInterest (only overlapping / mapped values). */
const SERVICE_TO_AI: Partial<Record<ServiceCategory, string>> = {
  speech_therapy: 'speech_therapy',
  occupational_therapy: 'occupational_therapy',
  behavioral_support: 'behavioral_support',
  physiotherapy: 'physical_therapy',
  nursing: 'medical_consult',
  companion_care: 'respite_care',
};

const AI_GENDERS = new Set(['male', 'female', 'non_binary', 'prefer_not_to_say', 'other']);

function mapGender(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, '_');
  if (AI_GENDERS.has(normalized)) return normalized;
  if (normalized === 'm') return 'male';
  if (normalized === 'f') return 'female';
  return 'other';
}

function mapServiceInterests(categories: ServiceCategory[]): string[] {
  const out: string[] = [];
  for (const cat of categories) {
    const mapped = SERVICE_TO_AI[cat];
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
}

function splitMeds(currentMeds: string | null | undefined): string[] {
  if (!currentMeds?.trim()) return [];
  return currentMeds
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type IntakeForAiSummary = {
  reasonForCare: string;
  urgencyLevel: UrgencyLevel | null;
  medicalHistory: string | null;
  currentMeds: string | null;
  diagnoses: string[];
  serviceInterests: ServiceCategory[];
};

export type CareRecipientForAiSummary = {
  dateOfBirth: Date | null;
  gender: string | null;
  diagnosisCodes?: string[];
};

/**
 * Builds the OpenAPI IntakeSummarisationPayload from local intake/recipient data.
 * De-identified — no name/email/phone.
 */
export function buildIntakeSummarisePayload(
  intake: IntakeForAiSummary,
  recipient: CareRecipientForAiSummary,
  options?: { outputLanguage?: string },
): IntakeSummarisationPayload {
  const diagnoses = [
    ...new Set([...(intake.diagnoses ?? []), ...(recipient.diagnosisCodes ?? [])].filter(Boolean)),
  ];

  return {
    profileName: 'intake_summary',
    outputLanguage: options?.outputLanguage ?? 'en',
    patient: {
      dateOfBirth: recipient.dateOfBirth
        ? recipient.dateOfBirth.toISOString().slice(0, 10)
        : null,
      gender: mapGender(recipient.gender),
      language: options?.outputLanguage ?? 'en',
      diagnoses,
      allergies: [],
      medicalHistory: intake.medicalHistory,
    },
    careEpisode: {
      title: null,
      reasonForCare: intake.reasonForCare,
      urgencyLevel: intake.urgencyLevel
        ? URGENCY_TO_AI[intake.urgencyLevel] ?? 'medium'
        : null,
      serviceInterests: mapServiceInterests(intake.serviceInterests),
      medicalHistory: intake.medicalHistory,
      currentMeds: splitMeds(intake.currentMeds),
      diagnoses,
      observedChallenges: [],
    },
  };
}

function suggestedCategoriesFromResponse(res: IntakeSummarisationResponse): string[] {
  const raw = res.summary?.suggestedServiceCategories ?? [];
  return raw.map((c) => (typeof c === 'string' ? c : String(c)));
}

/**
 * Calls Riayah AI summarize and upserts `AiIntakeSummary` as `draft`.
 * Throws RiayahAiError / Prisma errors — callers must catch (non-blocking).
 */
export class AiIntakeSummaryService {
  static async summarizeAndPersist(params: {
    episodeId: string;
    intake: IntakeForAiSummary;
    careRecipient: CareRecipientForAiSummary;
  }): Promise<{ id: string; status: string }> {
    const payload = buildIntakeSummarisePayload(params.intake, params.careRecipient);
    const response = await RiayahAiClient.summarizeIntake(params.episodeId, payload);

    const summary = response.summary;
    const row = await prisma.aiIntakeSummary.upsert({
      where: { careEpisodeId: params.episodeId },
      create: {
        careEpisodeId: params.episodeId,
        model: response.model ?? 'unknown',
        promptTokens: response.promptTokens ?? 0,
        completionTokens: response.completionTokens ?? 0,
        totalTokens: response.totalTokens ?? 0,
        keyConcerns: summary?.keyConcerns ?? [],
        urgencyIndicators: summary?.urgencyIndicators ?? [],
        suggestedServiceCategories: suggestedCategoriesFromResponse(response),
        flaggedRiskFactors: summary?.flaggedRiskFactors
          ? (summary.flaggedRiskFactors as unknown as Prisma.InputJsonValue)
          : undefined,
        clinicalImpressions: summary?.clinicalImpressions ?? null,
        confidence: summary?.confidence ?? null,
        status: 'draft',
      },
      update: {
        model: response.model ?? 'unknown',
        promptTokens: response.promptTokens ?? 0,
        completionTokens: response.completionTokens ?? 0,
        totalTokens: response.totalTokens ?? 0,
        keyConcerns: summary?.keyConcerns ?? [],
        urgencyIndicators: summary?.urgencyIndicators ?? [],
        suggestedServiceCategories: suggestedCategoriesFromResponse(response),
        flaggedRiskFactors: summary?.flaggedRiskFactors
          ? (summary.flaggedRiskFactors as unknown as Prisma.InputJsonValue)
          : undefined,
        clinicalImpressions: summary?.clinicalImpressions ?? null,
        confidence: summary?.confidence ?? null,
        // Keep draft until coordinator explicitly approves (M3-2.6)
        status: 'draft',
        approvedById: null,
        approvedAt: null,
      },
      select: { id: true, status: true },
    });

    logger.info('AI intake summary persisted', {
      episodeId: params.episodeId,
      summaryId: row.id,
      status: row.status,
      model: response.model,
      totalTokens: response.totalTokens,
    });

    return row;
  }

  /** Non-blocking wrapper — never throws to the caller. */
  static async summarizeAndPersistSafe(params: {
    episodeId: string;
    intake: IntakeForAiSummary;
    careRecipient: CareRecipientForAiSummary;
  }): Promise<void> {
    try {
      await this.summarizeAndPersist(params);
    } catch (err) {
      const message =
        err instanceof RiayahAiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'unknown';
      logger.warn('AI intake summarize failed (non-blocking)', {
        episodeId: params.episodeId,
        error: message,
        statusCode: err instanceof RiayahAiError ? err.statusCode : undefined,
      });
    }
  }

  static async getByEpisodeId(episodeId: string) {
    return prisma.aiIntakeSummary.findUnique({ where: { careEpisodeId: episodeId } });
  }

  /**
   * Human-in-the-loop approval (Art. 22 posture): draft → approved.
   * Idempotent if already approved.
   */
  static async approve(params: {
    episodeId: string;
    approverId: string;
  }): Promise<{ summary: Awaited<ReturnType<typeof prisma.aiIntakeSummary.findUniqueOrThrow>>; alreadyApproved: boolean }> {
    const existing = await prisma.aiIntakeSummary.findUnique({
      where: { careEpisodeId: params.episodeId },
    });
    if (!existing) {
      throw new AppError('AI intake summary not found for this episode.', 404);
    }

    if (existing.status === 'approved') {
      return { summary: existing, alreadyApproved: true };
    }

    if (existing.status !== 'draft') {
      throw new AppError(
        `Cannot approve AI intake summary while status is "${existing.status}".`,
        422,
      );
    }

    const summary = await prisma.aiIntakeSummary.update({
      where: { id: existing.id },
      data: {
        status: 'approved',
        approvedById: params.approverId,
        approvedAt: new Date(),
      },
    });

    logger.info('AI intake summary approved', {
      episodeId: params.episodeId,
      summaryId: summary.id,
      approverId: params.approverId,
    });

    return { summary, alreadyApproved: false };
  }
}
