import { z } from 'zod';

/** Contract §51 processing-stage vocabulary (AI job + callback top-level). */
export const processingStageSchema = z.enum([
  'queued',
  'acquiring_media',
  'validating_media',
  'preprocessing',
  'transcribing',
  'normalizing',
  'analyzing',
  'callback',
  'completed',
  'partial',
  'failed',
]);

export type ProcessingStage = z.infer<typeof processingStageSchema>;

export const mediaSourceTypeSchema = z.enum(['mixed', 'participant', 'track']);
export type MediaSourceType = z.infer<typeof mediaSourceTypeSchema>;

export const attributionModeSchema = z.enum(['unknown', 'inferred', 'deterministic']);
export type AttributionMode = z.infer<typeof attributionModeSchema>;

export const outputLanguageSchema = z.enum(['en', 'ar']);
export type OutputLanguage = z.infer<typeof outputLanguageSchema>;

export const analysisStrategySchema = z.enum(['single_pass', 'hierarchical']);
export type AnalysisStrategy = z.infer<typeof analysisStrategySchema>;

export const artifactTypeSchema = z.enum([
  'transcript',
  'summary',
  'clinicalDraftNote',
  'risk',
]);
export type ArtifactType = z.infer<typeof artifactTypeSchema>;

/** Artifact wrapper status (Backend persistence + callback). */
export const artifactWrapperStatusSchema = z.enum(['completed', 'failed', 'skipped']);
export type ArtifactWrapperStatus = z.infer<typeof artifactWrapperStatusSchema>;

export const recordingProcessTimingSchema = z
  .object({
    startedAtMs: z.number().int().nullable().optional(),
    endedAtMs: z.number().int().nullable().optional(),
    durationMs: z.number().int().nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

/** POST /v1/recordings/process request body. */
export const recordingProcessRequestSchema = z
  .object({
    recordingId: z.string().min(1),
    sourceType: mediaSourceTypeSchema,
    mediaUrl: z.string().url(),
    sessionId: z.string().nullable().optional(),
    meetingId: z.string().nullable().optional(),
    participantId: z.string().nullable().optional(),
    participantRole: z.string().nullable().optional(),
    pipelineVersion: z.string().min(1),
    languageHint: z.string().nullable().optional(),
    timing: recordingProcessTimingSchema,
    metadata: z.record(z.unknown()).optional(),
  })
  .passthrough();

export type RecordingProcessRequest = z.infer<typeof recordingProcessRequestSchema>;

/** Immediate response from POST /v1/recordings/process (202 / 200 / 409). */
export const recordingProcessResponseSchema = z
  .object({
    recordingId: z.string().min(1),
    jobId: z.string().min(1),
    status: processingStageSchema,
    pipelineVersion: z.string().min(1),
    reused: z.boolean(),
    message: z.string().optional(),
  })
  .passthrough();

export type RecordingProcessResponse = z.infer<typeof recordingProcessResponseSchema>;

/**
 * Artifact wrapper: completed → artifact present; failed → error fields;
 * skipped → neither required. Unknown optional fields pass through.
 */
export const artifactWrapperSchema = z
  .object({
    status: artifactWrapperStatusSchema,
    artifact: z.record(z.unknown()).nullable().optional(),
    errorCode: z.string().nullable().optional(),
    errorMessage: z.string().nullable().optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    if (val.status === 'completed' && (val.artifact == null || typeof val.artifact !== 'object')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'completed artifact wrapper requires an artifact object',
        path: ['artifact'],
      });
    }
    if (val.status === 'failed') {
      if (!val.errorCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'failed artifact wrapper requires errorCode',
          path: ['errorCode'],
        });
      }
      if (!val.errorMessage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'failed artifact wrapper requires errorMessage',
          path: ['errorMessage'],
        });
      }
    }
  });

export type ArtifactWrapper = z.infer<typeof artifactWrapperSchema>;

export const recordingCallbackArtifactsSchema = z
  .object({
    transcript: artifactWrapperSchema,
    summary: artifactWrapperSchema,
    clinicalDraftNote: artifactWrapperSchema,
    risk: artifactWrapperSchema,
  })
  .passthrough();

/**
 * POST /ai/callbacks/recording-intelligence body (contract §23 / §51–52).
 * Top-level status is typically completed | failed; allow full ProcessingStage for forward-compat.
 */
export const recordingCallbackPayloadSchema = z
  .object({
    recordingId: z.string().min(1),
    jobId: z.string().min(1),
    pipelineVersion: z.string().min(1),
    status: processingStageSchema,
    outputLanguage: outputLanguageSchema,
    analysisStrategy: analysisStrategySchema,
    artifacts: recordingCallbackArtifactsSchema,
  })
  .passthrough();

export type RecordingCallbackPayload = z.infer<typeof recordingCallbackPayloadSchema>;

/** Backend run status (contract §42) — distinct from media/egress status. */
export type RecordingIntelligenceRunStatus =
  | 'processing'
  | 'available'
  | 'failed'
  | 'delivery_failed';

export const ARTIFACT_TYPES: ArtifactType[] = [
  'transcript',
  'summary',
  'clinicalDraftNote',
  'risk',
];
