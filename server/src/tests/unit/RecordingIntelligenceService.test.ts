jest.mock('../../config/env', () => ({
  env: {
    AI_SERVICE_URL: 'https://ai.example.test',
    AI_SERVICE_API_KEY: 'test-api-key',
    RECORDING_INTELLIGENCE_ENABLED: true,
    RECORDING_INTELLIGENCE_PIPELINE_VERSION: '2026-09-recording-v1',
    RECORDING_INTELLIGENCE_MEDIA_URL_TTL_SECONDS: 7200,
    AWS_BUCKET: 'test-bucket',
    RECORDING_TRANSCRIPT_ENCRYPTION_KEY: 'unit-test-key',
    isDev: true,
    isProd: false,
  },
}));

jest.mock('../../config/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockUpsertRun = jest.fn();
const mockUpdateRun = jest.fn();
const mockFindUniqueRun = jest.fn();
const mockUpsertArtifact = jest.fn();
const mockFindUniqueSession = jest.fn();
const mockFindUniqueMeeting = jest.fn();

jest.mock('../../config/database', () => ({
  prisma: {
    recordingIntelligenceRun: {
      upsert: (...args: unknown[]) => mockUpsertRun(...args),
      update: (...args: unknown[]) => mockUpdateRun(...args),
      findUnique: (...args: unknown[]) => mockFindUniqueRun(...args),
      findMany: jest.fn(),
    },
    recordingIntelligenceArtifact: {
      upsert: (...args: unknown[]) => mockUpsertArtifact(...args),
    },
    session: {
      findUnique: (...args: unknown[]) => mockFindUniqueSession(...args),
    },
    meeting: {
      findUnique: (...args: unknown[]) => mockFindUniqueMeeting(...args),
    },
  },
}));

jest.mock('../../services/RiayahAiClient', () => ({
  RiayahAiClient: {
    processRecording: jest.fn(),
  },
}));

jest.mock('../../services/TelehealthRecordingService', () => ({
  s3KeyFromRecordingUrl: jest.fn(() => null),
  isS3Configured: jest.fn(() => false),
}));

import { RiayahAiClient } from '../../services/RiayahAiClient';
import { RecordingIntelligenceService } from '../../services/RecordingIntelligenceService';
import { encryptJson } from '../../utils/recordingIntelligenceCrypto';
import type { RecordingCallbackPayload } from '../../services/recordingIntelligenceTypes';

const processRecording = RiayahAiClient.processRecording as jest.MockedFunction<
  typeof RiayahAiClient.processRecording
>;

function baseCallback(
  overrides: Partial<RecordingCallbackPayload> = {},
): RecordingCallbackPayload {
  return {
    recordingId: 'session-1',
    jobId: 'recording:session-1:2026-09-recording-v1',
    pipelineVersion: '2026-09-recording-v1',
    status: 'completed',
    outputLanguage: 'en',
    analysisStrategy: 'single_pass',
    artifacts: {
      transcript: {
        status: 'completed',
        artifact: {
          segments: [{ segmentId: 'session-1-utt-0001', text: 'hello' }],
          attributionMode: 'inferred',
          isDraft: true,
          reviewStatus: 'draft',
          warnings: [],
          gaps: [],
          providerMetadata: {},
        },
      },
      summary: {
        status: 'failed',
        errorCode: 'RecordingSummaryError',
        errorMessage: 'Summary generation failed',
      },
      clinicalDraftNote: {
        status: 'completed',
        artifact: {
          recordingId: 'session-1',
          sections: [],
          warnings: [],
          sourceHasGaps: false,
          isDraft: true,
          requiresReview: true,
          promptTokens: 1,
          completionTokens: 2,
          totalTokens: 3,
        },
      },
      risk: {
        status: 'skipped',
      },
    },
    ...overrides,
  };
}

describe('RecordingIntelligenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsertRun.mockResolvedValue({
      id: 'run-1',
      recordingId: 'session-1',
      pipelineVersion: '2026-09-recording-v1',
      status: 'processing',
    });
    mockUpdateRun.mockResolvedValue({});
    mockUpsertArtifact.mockResolvedValue({});
    mockFindUniqueSession.mockResolvedValue({
      id: 'session-1',
      recordingUrl: 'https://cdn.example/rec.mp4',
      recordingStatus: 'available',
    });
  });

  describe('handleCallback', () => {
    it('upserts run and artifacts idempotently (unique key)', async () => {
      const result = await RecordingIntelligenceService.handleCallback(baseCallback());

      expect(result.runId).toBe('run-1');
      expect(result.status).toBe('available');
      expect(result.artifactStatuses).toEqual({
        transcript: 'completed',
        summary: 'failed',
        clinicalDraftNote: 'completed',
        risk: 'skipped',
      });

      expect(mockUpsertRun).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            recordingId_pipelineVersion: {
              recordingId: 'session-1',
              pipelineVersion: '2026-09-recording-v1',
            },
          },
          update: expect.objectContaining({
            status: 'available',
            jobId: 'recording:session-1:2026-09-recording-v1',
            callbackReceivedAt: expect.any(Date),
          }),
        }),
      );

      expect(mockUpsertArtifact).toHaveBeenCalledTimes(4);
      expect(mockUpsertArtifact).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            recordingId_pipelineVersion_artifactType: {
              recordingId: 'session-1',
              pipelineVersion: '2026-09-recording-v1',
              artifactType: 'transcript',
            },
          },
          create: expect.objectContaining({
            status: 'completed',
            payloadEnc: expect.stringMatching(/^enc:v1:/),
          }),
          update: expect.objectContaining({
            status: 'completed',
            payloadEnc: expect.stringMatching(/^enc:v1:/),
          }),
        }),
      );
      expect(mockUpsertArtifact).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            recordingId_pipelineVersion_artifactType: {
              recordingId: 'session-1',
              pipelineVersion: '2026-09-recording-v1',
              artifactType: 'summary',
            },
          },
          create: expect.objectContaining({
            status: 'failed',
            errorCode: 'RecordingSummaryError',
            payloadEnc: null,
          }),
        }),
      );

      // Second delivery with same business keys — still upserts (idempotent)
      await RecordingIntelligenceService.handleCallback(baseCallback());
      expect(mockUpsertRun).toHaveBeenCalledTimes(2);
      expect(mockUpsertArtifact).toHaveBeenCalledTimes(8);
    });

    it('marks run failed when top-level status is failed', async () => {
      await RecordingIntelligenceService.handleCallback(
        baseCallback({
          status: 'failed',
          artifacts: {
            transcript: {
              status: 'failed',
              errorCode: 'SttError',
              errorMessage: 'transcription failed',
            },
            summary: {
              status: 'failed',
              errorCode: 'SttError',
              errorMessage: 'transcription failed',
            },
            clinicalDraftNote: {
              status: 'failed',
              errorCode: 'SttError',
              errorMessage: 'transcription failed',
            },
            risk: {
              status: 'failed',
              errorCode: 'SttError',
              errorMessage: 'transcription failed',
            },
          },
        }),
      );

      expect(mockUpsertRun).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ status: 'failed' }),
        }),
      );
    });
  });

  describe('process response handling', () => {
    it('keeps processing on 202', async () => {
      processRecording.mockResolvedValue({
        httpStatus: 202,
        data: {
          recordingId: 'session-1',
          jobId: 'recording:session-1:2026-09-recording-v1',
          status: 'queued',
          pipelineVersion: '2026-09-recording-v1',
          reused: false,
        },
      });

      const result = await RecordingIntelligenceService.triggerForSession('session-1');

      expect(result?.runStatus).toBe('processing');
      expect(result?.httpStatus).toBe(202);
      expect(mockUpdateRun).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'processing',
            jobId: 'recording:session-1:2026-09-recording-v1',
          }),
        }),
      );
    });

    it('marks failed on 409 without throwing', async () => {
      processRecording.mockResolvedValue({
        httpStatus: 409,
        data: {
          recordingId: 'session-1',
          jobId: 'recording:session-1:2026-09-recording-v1',
          status: 'failed',
          pipelineVersion: '2026-09-recording-v1',
          reused: true,
          message: 'prior failure',
        },
      });

      const result = await RecordingIntelligenceService.triggerForSession('session-1');

      expect(result?.runStatus).toBe('failed');
      expect(result?.httpStatus).toBe(409);
      expect(mockUpdateRun).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            errorCode: 'AiJobConflict',
          }),
        }),
      );
    });

    it('reconciles 200 completed without stored artifacts as delivery_failed', async () => {
      processRecording.mockResolvedValue({
        httpStatus: 200,
        data: {
          recordingId: 'session-1',
          jobId: 'recording:session-1:2026-09-recording-v1',
          status: 'completed',
          pipelineVersion: '2026-09-recording-v1',
          reused: true,
        },
      });
      mockFindUniqueRun.mockResolvedValue({
        id: 'run-1',
        status: 'processing',
        callbackReceivedAt: null,
        jobId: null,
        artifacts: [],
      });

      const result = await RecordingIntelligenceService.triggerForSession('session-1');

      expect(result?.runStatus).toBe('delivery_failed');
      expect(mockUpdateRun).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'delivery_failed',
            errorCode: 'MissingCallback',
          }),
        }),
      );
    });

    it('leaves available on 200 when artifacts already exist', async () => {
      processRecording.mockResolvedValue({
        httpStatus: 200,
        data: {
          recordingId: 'session-1',
          jobId: 'recording:session-1:2026-09-recording-v1',
          status: 'completed',
          pipelineVersion: '2026-09-recording-v1',
          reused: true,
        },
      });
      mockFindUniqueRun.mockResolvedValue({
        id: 'run-1',
        status: 'available',
        callbackReceivedAt: new Date(),
        jobId: 'recording:session-1:2026-09-recording-v1',
        artifacts: [{ id: 'art-1' }],
      });

      const result = await RecordingIntelligenceService.triggerForSession('session-1');

      expect(result?.runStatus).toBe('available');
    });
  });

  describe('getRun', () => {
    it('decrypts completed artifact payloads', async () => {
      const payload = { segments: [], attributionMode: 'inferred' };
      mockFindUniqueRun.mockResolvedValue({
        id: 'run-1',
        recordingId: 'session-1',
        pipelineVersion: '2026-09-recording-v1',
        sourceKind: 'session',
        jobId: 'job-1',
        status: 'available',
        sessionId: 'session-1',
        meetingId: null,
        outputLanguage: 'en',
        analysisStrategy: 'single_pass',
        errorCode: null,
        errorMessage: null,
        requestedAt: new Date(),
        callbackReceivedAt: new Date(),
        artifacts: [
          {
            artifactType: 'transcript',
            status: 'completed',
            payloadEnc: encryptJson(payload),
            errorCode: null,
            errorMessage: null,
            isDraft: true,
            requiresReview: true,
            model: null,
            promptVersion: null,
            promptTokens: null,
            completionTokens: null,
            totalTokens: null,
            updatedAt: new Date(),
          },
        ],
      });

      const run = await RecordingIntelligenceService.getRun('session-1');
      expect(run?.artifacts[0]?.artifact).toEqual(payload);
    });
  });
});
