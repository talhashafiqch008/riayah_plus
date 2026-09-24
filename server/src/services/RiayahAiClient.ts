import axios, { AxiosError, AxiosInstance } from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';
import type {
  RecordingProcessRequest,
  RecordingProcessResponse,
} from './recordingIntelligenceTypes';

/** Thrown when the Riayah AI HTTP call fails (callers should catch — never fail intake). */
export class RiayahAiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly episodeId?: string,
  ) {
    super(message);
    this.name = 'RiayahAiError';
  }
}

// ── Request / response shapes (aligned with staging OpenAPI) ─────────────────

export interface PatientInput {
  dateOfBirth?: string | null;
  gender?: string | null;
  language?: string | null;
  diagnoses?: string[];
  allergies?: string[];
  medicalHistory?: string | null;
}

export interface CareEpisodeInput {
  title?: string | null;
  reasonForCare?: string | null;
  urgencyLevel?: string | null;
  serviceInterests?: string[];
  medicalHistory?: string | null;
  currentMeds?: string[];
  diagnoses?: string[];
  observedChallenges?: string[];
  developmentalMilestones?: string | null;
  preferredLanguage?: string | null;
  [key: string]: unknown;
}

export interface IntakeSummarisationPayload {
  metadata?: Record<string, unknown> | null;
  patient?: PatientInput | null;
  careEpisode?: CareEpisodeInput | null;
  profileName?: string;
  outputLanguage?: string;
}

export interface FlaggedRiskFactor {
  factor: string;
  severity: string;
  evidence: string;
  recommendedAction?: string | null;
}

export interface IntakeSummary {
  keyConcerns: string[];
  urgencyIndicators: string[];
  suggestedServiceCategories: string[];
  flaggedRiskFactors: FlaggedRiskFactor[];
  clinicalImpressions?: string | null;
  confidence?: string | null;
}

export interface IntakeSummarisationResponse {
  episodeId?: string | null;
  summary?: IntakeSummary | null;
  model?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  status?: string;
  rawResponse?: Record<string, unknown> | null;
}

export interface AssessmentInput {
  type: string;
  findings?: string | null;
  recommendations?: string[];
}

export interface CarePlanPayload {
  metadata?: Record<string, unknown> | null;
  patient?: Record<string, unknown> | null;
  episode?: Record<string, unknown> | null;
  assessments?: AssessmentInput[];
  familyConsultationNotes?: string | null;
  profileName?: string;
  outputLanguage?: string;
}

export interface SmartGoal {
  title: string;
  description?: string | null;
  targetDate?: string | null;
  measurementCriteria?: string | null;
  status?: string;
}

export interface PlannedService {
  serviceType: string;
  category: string;
  frequency?: string | null;
  durationMinutes?: number | null;
  unitCost?: number | null;
  assignedStaffRole?: string | null;
  notes?: string | null;
  status?: string;
}

export interface CarePlanDraft {
  goals: SmartGoal[];
  services: PlannedService[];
  riskFlags: FlaggedRiskFactor[];
  reviewCycle?: string | null;
  clinicalNotes?: string | null;
  estimatedTotalCost?: number | null;
  currency?: string;
}

export interface CarePlanResponse {
  episodeId?: string | null;
  draft?: CarePlanDraft | null;
  model?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  status?: string;
  rawResponse?: Record<string, unknown> | null;
}

const DEFAULT_TIMEOUT_MS = 90_000;

/**
 * Thin HTTP client for Momen's Riayah AI staging service.
 * Uses `AI_SERVICE_URL` + `AI_SERVICE_API_KEY` (`X-API-Key`).
 */
export class RiayahAiClient {
  private static axiosInstance: AxiosInstance | null = null;

  /** Reset cached axios instance (tests / env reload). */
  static resetClient(): void {
    this.axiosInstance = null;
  }

  private static getHttp(): AxiosInstance {
    if (!this.axiosInstance) {
      const baseURL = (env.AI_SERVICE_URL || '').replace(/\/$/, '');
      if (!baseURL) {
        throw new RiayahAiError('AI_SERVICE_URL is not configured.');
      }
      this.axiosInstance = axios.create({
        baseURL,
        timeout: DEFAULT_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          ...(env.AI_SERVICE_API_KEY ? { 'X-API-Key': env.AI_SERVICE_API_KEY } : {}),
        },
      });
    }
    return this.axiosInstance;
  }

  private static wrapError(err: unknown, episodeId: string, operation: string): never {
    if (err instanceof RiayahAiError) throw err;

    if (axios.isAxiosError(err)) {
      const ax = err as AxiosError<{ detail?: unknown; message?: string }>;
      const status = ax.response?.status;
      const detail = ax.response?.data?.detail ?? ax.response?.data?.message ?? ax.message;
      const detailStr =
        typeof detail === 'string' ? detail : detail != null ? JSON.stringify(detail).slice(0, 200) : 'unknown';

      logger.warn(`Riayah AI ${operation} failed`, {
        episodeId,
        status,
        // Avoid logging full clinical payload/response bodies
        detail: detailStr,
      });

      throw new RiayahAiError(
        `Riayah AI ${operation} failed${status ? ` (${status})` : ''}: ${detailStr}`,
        status,
        episodeId,
      );
    }

    const message = err instanceof Error ? err.message : 'unknown error';
    logger.warn(`Riayah AI ${operation} failed`, { episodeId, detail: message });
    throw new RiayahAiError(`Riayah AI ${operation} failed: ${message}`, undefined, episodeId);
  }

  /**
   * POST /v1/intake/{episode_id}/summarize
   */
  static async summarizeIntake(
    episodeId: string,
    payload: IntakeSummarisationPayload = {},
  ): Promise<IntakeSummarisationResponse> {
    try {
      const { data } = await this.getHttp().post<IntakeSummarisationResponse>(
        `/v1/intake/${encodeURIComponent(episodeId)}/summarize`,
        {
          profileName: 'intake_summary',
          outputLanguage: 'en',
          ...payload,
        },
      );
      return data;
    } catch (err) {
      this.wrapError(err, episodeId, 'summarizeIntake');
    }
  }

  /**
   * POST /v1/careplan/{episode_id}/draft
   * AI may also POST the draft to our callback asynchronously.
   *
   * Staging quirk: the model sometimes echoes `familyConsultationNotes` into the
   * CarePlanDraft output (which forbids extra keys) → 422. We keep that field as
   * `null` on the wire and put real notes under `metadata` instead.
   */
  static async requestCarePlanDraft(
    episodeId: string,
    payload: CarePlanPayload = {},
  ): Promise<CarePlanResponse> {
    const notes =
      typeof payload.familyConsultationNotes === 'string'
        ? payload.familyConsultationNotes.trim()
        : '';
    const safePayload: CarePlanPayload = {
      ...payload,
      // Always send null — non-null / omitted both trigger intermittent 422s upstream.
      familyConsultationNotes: null,
      metadata: {
        ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}),
        ...(notes ? { familyConsultationNotes: notes } : {}),
      },
    };

    try {
      const { data } = await this.getHttp().post<CarePlanResponse>(
        `/v1/careplan/${encodeURIComponent(episodeId)}/draft`,
        {
          profileName: 'careplan_draft',
          outputLanguage: 'en',
          ...safePayload,
        },
      );
      return data;
    } catch (err) {
      this.wrapError(err, episodeId, 'requestCarePlanDraft');
    }
  }

  /**
   * POST /v1/recordings/process
   *
   * Always returns `{ httpStatus, data }` when the AI service responds (including
   * 202 queued, 200 completed/reused, and 409 failed/reused). Does not throw on 409.
   * Throws {@link RiayahAiError} only on network failures or missing response body.
   */
  static async processRecording(
    payload: RecordingProcessRequest,
  ): Promise<{ httpStatus: number; data: RecordingProcessResponse }> {
    try {
      const response = await this.getHttp().post<RecordingProcessResponse>(
        '/v1/recordings/process',
        payload,
        {
          // Caller owns 202/200/409 (+ other HTTP) semantics — never throw on status alone.
          validateStatus: () => true,
        },
      );

      const data = (response.data ?? {}) as RecordingProcessResponse;
      logger.info('Riayah AI processRecording response', {
        recordingId: payload.recordingId,
        pipelineVersion: payload.pipelineVersion,
        httpStatus: response.status,
        jobId: data.jobId,
        status: data.status,
        reused: data.reused,
      });

      return { httpStatus: response.status, data };
    } catch (err) {
      this.wrapError(err, payload.recordingId, 'processRecording');
    }
  }
}
