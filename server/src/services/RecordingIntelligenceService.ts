import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { createPhiS3Client } from '../utils/phiS3';
import { decryptJson, encryptJson } from '../utils/recordingIntelligenceCrypto';
import { RiayahAiClient } from './RiayahAiClient';
import {
  isS3Configured,
  s3KeyFromRecordingUrl,
} from './TelehealthRecordingService';
import {
  ARTIFACT_TYPES,
  recordingCallbackPayloadSchema,
  type ArtifactType,
  type ArtifactWrapper,
  type RecordingCallbackPayload,
  type RecordingIntelligenceRunStatus,
  type RecordingProcessRequest,
  type RecordingProcessResponse,
} from './recordingIntelligenceTypes';

type TriggerResult = {
  recordingId: string;
  pipelineVersion: string;
  runId: string;
  httpStatus: number;
  aiStatus?: string;
  runStatus: RecordingIntelligenceRunStatus;
};

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function extractArtifactMeta(artifact: Record<string, unknown> | null | undefined) {
  if (!artifact) {
    return {
      model: null as string | null,
      promptVersion: null as string | null,
      promptTokens: null as number | null,
      completionTokens: null as number | null,
      totalTokens: null as number | null,
      isDraft: true,
      requiresReview: true,
    };
  }
  return {
    model: strOrNull(artifact.model),
    promptVersion: strOrNull(artifact.promptVersion),
    promptTokens: numOrNull(artifact.promptTokens),
    completionTokens: numOrNull(artifact.completionTokens),
    totalTokens: numOrNull(artifact.totalTokens),
    isDraft: artifact.isDraft === false ? false : true,
    requiresReview: artifact.requiresReview === false ? false : true,
  };
}

/**
 * Recording Intelligence: trigger AI processing, persist callbacks idempotently,
 * and recover stale runs. Never writes to ClinicalNote — drafts stay in RI artifacts.
 */
export class RecordingIntelligenceService {
  static get DEFAULT_PIPELINE_VERSION(): string {
    return env.RECORDING_INTELLIGENCE_PIPELINE_VERSION || '2026-09-recording-v1';
  }

  static isEnabled(): boolean {
    return env.RECORDING_INTELLIGENCE_ENABLED === true;
  }

  /**
   * Presign S3 recordings with TTL from env; pass-through non-S3 URLs unchanged.
   * Does not log the URL (may contain query secrets).
   */
  static async buildMediaUrl(storedRecordingUrl: string): Promise<string> {
    const key = s3KeyFromRecordingUrl(storedRecordingUrl);
    if (!key || !isS3Configured()) return storedRecordingUrl;
    const expiresIn = Math.max(
      60,
      env.RECORDING_INTELLIGENCE_MEDIA_URL_TTL_SECONDS || 7200,
    );
    const s3 = createPhiS3Client();
    return getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }),
      { expiresIn },
    );
  }

  static async triggerForSession(
    sessionId: string,
    options?: { pipelineVersion?: string; languageHint?: string | null },
  ): Promise<TriggerResult | null> {
    if (!this.isEnabled()) {
      logger.info('Recording intelligence disabled; skip trigger', {
        recordingId: sessionId,
        sourceKind: 'session',
      });
      return null;
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, recordingUrl: true, recordingStatus: true },
    });
    if (!session?.recordingUrl) {
      logger.warn('Recording intelligence skip: no recordingUrl', {
        recordingId: sessionId,
        sourceKind: 'session',
      });
      return null;
    }
    if (session.recordingStatus && session.recordingStatus !== 'available') {
      logger.info('Recording intelligence skip: recording not available', {
        recordingId: sessionId,
        recordingStatus: session.recordingStatus,
      });
      return null;
    }

    return this.triggerProcess({
      recordingId: session.id,
      sourceKind: 'session',
      sourceType: 'mixed',
      storedRecordingUrl: session.recordingUrl,
      sessionId: session.id,
      meetingId: null,
      pipelineVersion: options?.pipelineVersion ?? this.DEFAULT_PIPELINE_VERSION,
      languageHint: options?.languageHint ?? null,
    });
  }

  static async triggerForMeeting(
    meetingId: string,
    options?: { pipelineVersion?: string; languageHint?: string | null },
  ): Promise<TriggerResult | null> {
    if (!this.isEnabled()) {
      logger.info('Recording intelligence disabled; skip trigger', {
        recordingId: meetingId,
        sourceKind: 'meeting',
      });
      return null;
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, recordingUrl: true, recordingStatus: true },
    });
    if (!meeting?.recordingUrl) {
      logger.warn('Recording intelligence skip: no recordingUrl', {
        recordingId: meetingId,
        sourceKind: 'meeting',
      });
      return null;
    }
    if (meeting.recordingStatus && meeting.recordingStatus !== 'available') {
      logger.info('Recording intelligence skip: recording not available', {
        recordingId: meetingId,
        recordingStatus: meeting.recordingStatus,
      });
      return null;
    }

    return this.triggerProcess({
      recordingId: meeting.id,
      sourceKind: 'meeting',
      sourceType: 'mixed',
      storedRecordingUrl: meeting.recordingUrl,
      sessionId: null,
      meetingId: meeting.id,
      pipelineVersion: options?.pipelineVersion ?? this.DEFAULT_PIPELINE_VERSION,
      languageHint: options?.languageHint ?? null,
    });
  }

  private static async triggerProcess(params: {
    recordingId: string;
    sourceKind: 'session' | 'meeting' | 'voice';
    sourceType: 'mixed' | 'participant' | 'track';
    storedRecordingUrl: string;
    sessionId: string | null;
    meetingId: string | null;
    pipelineVersion: string;
    languageHint: string | null;
  }): Promise<TriggerResult> {
    const {
      recordingId,
      sourceKind,
      sourceType,
      storedRecordingUrl,
      sessionId,
      meetingId,
      pipelineVersion,
      languageHint,
    } = params;

    const mediaUrl = await this.buildMediaUrl(storedRecordingUrl);

    const run = await prisma.recordingIntelligenceRun.upsert({
      where: {
        recordingId_pipelineVersion: { recordingId, pipelineVersion },
      },
      create: {
        recordingId,
        pipelineVersion,
        sourceKind,
        sourceType,
        status: 'processing',
        sessionId,
        meetingId,
        languageHint,
        requestedAt: new Date(),
      },
      update: {
        status: 'processing',
        sourceKind,
        sourceType,
        sessionId: sessionId ?? undefined,
        meetingId: meetingId ?? undefined,
        languageHint,
        errorCode: null,
        errorMessage: null,
        requestedAt: new Date(),
      },
    });

    const payload: RecordingProcessRequest = {
      recordingId,
      sourceType,
      mediaUrl,
      sessionId,
      meetingId,
      participantId: null,
      participantRole: null,
      pipelineVersion,
      languageHint,
      metadata: {
        ...(sessionId ? { sessionId } : {}),
        ...(meetingId ? { meetingId } : {}),
        sourceKind,
        requestedBy: 'backend_worker',
      },
    };

    logger.info('Recording intelligence process request', {
      recordingId,
      pipelineVersion,
      sourceKind,
      runId: run.id,
    });

    let httpStatus: number;
    let data: RecordingProcessResponse;
    try {
      const result = await RiayahAiClient.processRecording(payload);
      httpStatus = result.httpStatus;
      data = result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      await prisma.recordingIntelligenceRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          errorCode: 'AiClientError',
          errorMessage: message.slice(0, 500),
        },
      });
      logger.warn('Recording intelligence process call failed', {
        recordingId,
        pipelineVersion,
        runId: run.id,
        detail: message.slice(0, 200),
      });
      throw err;
    }

    return this.applyProcessHttpResult(run.id, recordingId, pipelineVersion, httpStatus, data);
  }

  /**
   * Map AI HTTP acknowledgement onto run status (contract §13–16).
   * 202 → keep processing + jobId; 200 completed reused → reconcile; 409 → failed.
   */
  static async applyProcessHttpResult(
    runId: string,
    recordingId: string,
    pipelineVersion: string,
    httpStatus: number,
    data: RecordingProcessResponse,
  ): Promise<TriggerResult> {
    const jobId = data?.jobId ?? null;

    if (httpStatus === 202) {
      await prisma.recordingIntelligenceRun.update({
        where: { id: runId },
        data: {
          status: 'processing',
          jobId,
          errorCode: null,
          errorMessage: null,
        },
      });
      logger.info('Recording intelligence queued', {
        recordingId,
        pipelineVersion,
        jobId,
        httpStatus,
        reused: data.reused,
      });
      return {
        recordingId,
        pipelineVersion,
        runId,
        httpStatus,
        aiStatus: data.status,
        runStatus: 'processing',
      };
    }

    if (httpStatus === 200) {
      const runStatus = await this.reconcileCompletedProcess(
        runId,
        recordingId,
        pipelineVersion,
        data,
      );
      return {
        recordingId,
        pipelineVersion,
        runId,
        httpStatus,
        aiStatus: data.status,
        runStatus,
      };
    }

    if (httpStatus === 409) {
      await prisma.recordingIntelligenceRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          jobId,
          errorCode: 'AiJobConflict',
          errorMessage: (data.message || 'AI job previously failed for this pipelineVersion').slice(
            0,
            500,
          ),
        },
      });
      logger.warn('Recording intelligence conflict (prior failure)', {
        recordingId,
        pipelineVersion,
        jobId,
        httpStatus,
      });
      return {
        recordingId,
        pipelineVersion,
        runId,
        httpStatus,
        aiStatus: data.status,
        runStatus: 'failed',
      };
    }

    await prisma.recordingIntelligenceRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        jobId,
        errorCode: `Http${httpStatus}`,
        errorMessage: (data?.message || `Unexpected AI status ${httpStatus}`).slice(0, 500),
      },
    });
    logger.warn('Recording intelligence unexpected process status', {
      recordingId,
      pipelineVersion,
      jobId,
      httpStatus,
    });
    return {
      recordingId,
      pipelineVersion,
      runId,
      httpStatus,
      aiStatus: data?.status,
      runStatus: 'failed',
    };
  }

  /**
   * 200 reused/completed: if we already have artifacts, leave available;
   * otherwise mark delivery_failed (processing finished but callback missing).
   */
  private static async reconcileCompletedProcess(
    runId: string,
    recordingId: string,
    pipelineVersion: string,
    data: RecordingProcessResponse,
  ): Promise<RecordingIntelligenceRunStatus> {
    const existing = await prisma.recordingIntelligenceRun.findUnique({
      where: { id: runId },
      include: {
        artifacts: {
          where: { status: 'completed' },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (existing?.status === 'available' && (existing.artifacts?.length ?? 0) > 0) {
      await prisma.recordingIntelligenceRun.update({
        where: { id: runId },
        data: { jobId: data.jobId ?? existing.jobId },
      });
      logger.info('Recording intelligence reconcile: artifacts already present', {
        recordingId,
        pipelineVersion,
        jobId: data.jobId,
      });
      return 'available';
    }

    if (existing?.callbackReceivedAt && existing.status === 'available') {
      return 'available';
    }

    await prisma.recordingIntelligenceRun.update({
      where: { id: runId },
      data: {
        jobId: data.jobId ?? existing?.jobId,
        status: 'delivery_failed',
        errorCode: 'MissingCallback',
        errorMessage:
          'AI reports completed but Backend has no callback artifacts yet. Retry same pipelineVersion.',
      },
    });
    logger.warn('Recording intelligence delivery gap', {
      recordingId,
      pipelineVersion,
      jobId: data.jobId,
    });
    return 'delivery_failed';
  }

  /**
   * Persist callback idempotently (recordingId + pipelineVersion + artifactType).
   * Encrypts completed artifact JSON. Never touches ClinicalNote.
   */
  static async handleCallback(raw: RecordingCallbackPayload): Promise<{
    recordingId: string;
    pipelineVersion: string;
    runId: string;
    status: RecordingIntelligenceRunStatus;
    artifactStatuses: Record<string, string>;
  }> {
    const payload = recordingCallbackPayloadSchema.parse(raw);
    const { recordingId, pipelineVersion, jobId, status, outputLanguage, analysisStrategy } =
      payload;

    const runStatus: RecordingIntelligenceRunStatus =
      status === 'failed' ? 'failed' : 'available';

    const run = await prisma.recordingIntelligenceRun.upsert({
      where: {
        recordingId_pipelineVersion: { recordingId, pipelineVersion },
      },
      create: {
        recordingId,
        pipelineVersion,
        sourceKind: 'session',
        sourceType: 'mixed',
        jobId,
        status: runStatus,
        outputLanguage,
        analysisStrategy,
        callbackReceivedAt: new Date(),
        errorCode: status === 'failed' ? 'ProcessingFailed' : null,
        errorMessage: status === 'failed' ? 'AI processing failed' : null,
      },
      update: {
        jobId,
        status: runStatus,
        outputLanguage,
        analysisStrategy,
        callbackReceivedAt: new Date(),
        errorCode: status === 'failed' ? 'ProcessingFailed' : null,
        errorMessage: status === 'failed' ? 'AI processing failed' : null,
      },
    });

    const artifactStatuses: Record<string, string> = {};

    for (const artifactType of ARTIFACT_TYPES) {
      const wrapper = payload.artifacts[artifactType] as ArtifactWrapper;
      artifactStatuses[artifactType] = wrapper.status;

      const artifactObj =
        wrapper.status === 'completed' && wrapper.artifact && typeof wrapper.artifact === 'object'
          ? (wrapper.artifact as Record<string, unknown>)
          : null;
      const meta = extractArtifactMeta(artifactObj);
      const payloadEnc =
        wrapper.status === 'completed' && artifactObj != null ? encryptJson(artifactObj) : null;

      await prisma.recordingIntelligenceArtifact.upsert({
        where: {
          recordingId_pipelineVersion_artifactType: {
            recordingId,
            pipelineVersion,
            artifactType,
          },
        },
        create: {
          runId: run.id,
          recordingId,
          pipelineVersion,
          artifactType,
          status: wrapper.status,
          payloadEnc,
          errorCode: wrapper.errorCode ?? null,
          errorMessage: wrapper.errorMessage ?? null,
          isDraft: meta.isDraft,
          requiresReview: meta.requiresReview,
          model: meta.model,
          promptVersion: meta.promptVersion,
          promptTokens: meta.promptTokens,
          completionTokens: meta.completionTokens,
          totalTokens: meta.totalTokens,
        },
        update: {
          runId: run.id,
          status: wrapper.status,
          payloadEnc,
          errorCode: wrapper.errorCode ?? null,
          errorMessage: wrapper.errorMessage ?? null,
          isDraft: meta.isDraft,
          requiresReview: meta.requiresReview,
          model: meta.model,
          promptVersion: meta.promptVersion,
          promptTokens: meta.promptTokens,
          completionTokens: meta.completionTokens,
          totalTokens: meta.totalTokens,
        },
      });
    }

    logger.info('Recording intelligence callback persisted', {
      recordingId,
      pipelineVersion,
      jobId,
      status: runStatus,
      artifactStatuses,
    });

    return {
      recordingId,
      pipelineVersion,
      runId: run.id,
      status: runStatus,
      artifactStatuses,
    };
  }

  /**
   * Clinician API helper — returns run + artifacts with decrypted JSON when completed.
   * Caller must enforce authz. Does not expose ClinicalNote.
   */
  static async getRun(recordingId: string, pipelineVersion?: string) {
    const version = pipelineVersion ?? this.DEFAULT_PIPELINE_VERSION;
    const run = await prisma.recordingIntelligenceRun.findUnique({
      where: {
        recordingId_pipelineVersion: { recordingId, pipelineVersion: version },
      },
      include: { artifacts: true },
    });
    if (!run) return null;

    const artifacts = run.artifacts.map((a) => {
      let artifact: unknown = null;
      if (a.status === 'completed' && a.payloadEnc) {
        try {
          artifact = decryptJson(a.payloadEnc);
        } catch (err) {
          logger.warn('Failed to decrypt RI artifact', {
            recordingId,
            pipelineVersion: version,
            artifactType: a.artifactType,
            detail: err instanceof Error ? err.message : 'unknown',
          });
        }
      }
      return {
        artifactType: a.artifactType as ArtifactType,
        status: a.status,
        artifact,
        errorCode: a.errorCode,
        errorMessage: a.errorMessage,
        isDraft: a.isDraft,
        requiresReview: a.requiresReview,
        model: a.model,
        promptVersion: a.promptVersion,
        promptTokens: a.promptTokens,
        completionTokens: a.completionTokens,
        totalTokens: a.totalTokens,
        updatedAt: a.updatedAt,
      };
    });

    return {
      id: run.id,
      recordingId: run.recordingId,
      pipelineVersion: run.pipelineVersion,
      sourceKind: run.sourceKind,
      jobId: run.jobId,
      status: run.status,
      sessionId: run.sessionId,
      meetingId: run.meetingId,
      outputLanguage: run.outputLanguage,
      analysisStrategy: run.analysisStrategy,
      errorCode: run.errorCode,
      errorMessage: run.errorMessage,
      requestedAt: run.requestedAt,
      callbackReceivedAt: run.callbackReceivedAt,
      artifacts,
    };
  }

  /**
   * Re-POST the same pipelineVersion for runs stuck in processing without a callback.
   * Safe status/recovery — does not invent a new pipelineVersion.
   */
  static async recoverStaleRuns(olderThanMinutes: number): Promise<{
    examined: number;
    triggered: number;
  }> {
    const cutoff = new Date(Date.now() - Math.max(1, olderThanMinutes) * 60_000);
    const stale = await prisma.recordingIntelligenceRun.findMany({
      where: {
        status: { in: ['processing', 'delivery_failed'] },
        callbackReceivedAt: null,
        requestedAt: { lt: cutoff },
      },
      take: 50,
    });

    let triggered = 0;
    for (const run of stale) {
      try {
        if (run.sessionId) {
          await this.triggerForSession(run.sessionId, {
            pipelineVersion: run.pipelineVersion,
            languageHint: run.languageHint,
          });
          triggered += 1;
        } else if (run.meetingId) {
          await this.triggerForMeeting(run.meetingId, {
            pipelineVersion: run.pipelineVersion,
            languageHint: run.languageHint,
          });
          triggered += 1;
        } else {
          logger.warn('Stale RI run has no session/meeting id', {
            recordingId: run.recordingId,
            pipelineVersion: run.pipelineVersion,
            runId: run.id,
          });
        }
      } catch (err) {
        logger.warn('Stale RI recovery failed', {
          recordingId: run.recordingId,
          pipelineVersion: run.pipelineVersion,
          detail: err instanceof Error ? err.message.slice(0, 200) : 'unknown',
        });
      }
    }

    logger.info('Recording intelligence stale recovery pass', {
      examined: stale.length,
      triggered,
      olderThanMinutes,
    });
    return { examined: stale.length, triggered };
  }
}

/** Thrown when clinician GET is requested for a missing run (optional use). */
export function assertRunFound<T>(run: T | null): T {
  if (!run) throw new AppError('Recording intelligence run not found.', 404);
  return run;
}
