jest.mock('../../config/env', () => ({
  env: {
    AI_SERVICE_URL: 'https://ai.example.test',
    AI_SERVICE_API_KEY: 'test-api-key',
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

const mockPost = jest.fn();
const mockCreate = jest.fn(() => ({ post: mockPost }));

jest.mock('axios', () => {
  const actual = jest.requireActual('axios') as typeof import('axios');
  return {
    __esModule: true,
    default: {
      ...actual,
      create: (...args: unknown[]) => mockCreate(...(args as Parameters<typeof mockCreate>)),
      isAxiosError: actual.isAxiosError,
    },
    isAxiosError: actual.isAxiosError,
  };
});

import axios from 'axios';
import { RiayahAiClient, RiayahAiError } from '../../services/RiayahAiClient';

describe('RiayahAiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    RiayahAiClient.resetClient();
    mockCreate.mockReturnValue({ post: mockPost });
  });

  it('summarizeIntake posts to /v1/intake/:id/summarize with X-API-Key', async () => {
    mockPost.mockResolvedValue({
      data: {
        episodeId: 'ep-1',
        status: 'draft',
        summary: {
          keyConcerns: ['mobility'],
          urgencyIndicators: [],
          suggestedServiceCategories: ['physical_therapy'],
          flaggedRiskFactors: [],
          clinicalImpressions: 'Stable',
          confidence: 'medium',
        },
        model: 'test-model',
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    });

    const result = await RiayahAiClient.summarizeIntake('ep-1', {
      careEpisode: { title: 'Home care', reasonForCare: 'Fall risk' },
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://ai.example.test',
        headers: expect.objectContaining({
          'X-API-Key': 'test-api-key',
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(mockPost).toHaveBeenCalledWith('/v1/intake/ep-1/summarize', {
      profileName: 'intake_summary',
      outputLanguage: 'en',
      careEpisode: { title: 'Home care', reasonForCare: 'Fall risk' },
    });
    expect(result.summary?.keyConcerns).toEqual(['mobility']);
    expect(result.totalTokens).toBe(30);
  });

  it('requestCarePlanDraft posts to /v1/careplan/:id/draft', async () => {
    mockPost.mockResolvedValue({
      data: {
        episodeId: 'ep-2',
        status: 'draft',
        draft: {
          goals: [{ title: 'Walk daily' }],
          services: [{ serviceType: 'PT', category: 'rehab' }],
          riskFlags: [],
          currency: 'QAR',
        },
      },
    });

    const result = await RiayahAiClient.requestCarePlanDraft('ep-2', {
      familyConsultationNotes: 'Family prefers mornings',
    });

    expect(mockPost).toHaveBeenCalledWith('/v1/careplan/ep-2/draft', {
      profileName: 'careplan_draft',
      outputLanguage: 'en',
      familyConsultationNotes: null,
      metadata: { familyConsultationNotes: 'Family prefers mornings' },
    });
    expect(result.draft?.goals[0].title).toBe('Walk daily');
  });

  it('wraps axios failures as RiayahAiError without throwing raw axios', async () => {
    const axiosErr = {
      isAxiosError: true,
      message: 'Request failed',
      response: { status: 503, data: { detail: 'upstream unavailable' } },
    };
    Object.setPrototypeOf(axiosErr, Object.getPrototypeOf(new axios.AxiosError('x')));
    mockPost.mockRejectedValue(axiosErr);
    // Force isAxiosError true for our fake
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    await expect(RiayahAiClient.summarizeIntake('ep-fail')).rejects.toBeInstanceOf(RiayahAiError);
    await expect(RiayahAiClient.summarizeIntake('ep-fail')).rejects.toMatchObject({
      statusCode: 503,
      episodeId: 'ep-fail',
    });
  });

  it('processRecording returns httpStatus for 202 and 409 without throwing', async () => {
    mockPost.mockResolvedValueOnce({
      status: 202,
      data: {
        recordingId: 'rec-1',
        jobId: 'recording:rec-1:v1',
        status: 'queued',
        pipelineVersion: 'v1',
        reused: false,
      },
    });

    const queued = await RiayahAiClient.processRecording({
      recordingId: 'rec-1',
      sourceType: 'mixed',
      mediaUrl: 'https://example.com/a.mp4',
      pipelineVersion: 'v1',
    });
    expect(queued.httpStatus).toBe(202);
    expect(queued.data.status).toBe('queued');
    expect(mockPost).toHaveBeenCalledWith(
      '/v1/recordings/process',
      expect.objectContaining({ recordingId: 'rec-1' }),
      expect.objectContaining({ validateStatus: expect.any(Function) }),
    );

    mockPost.mockResolvedValueOnce({
      status: 409,
      data: {
        recordingId: 'rec-1',
        jobId: 'recording:rec-1:v1',
        status: 'failed',
        pipelineVersion: 'v1',
        reused: true,
      },
    });
    const conflict = await RiayahAiClient.processRecording({
      recordingId: 'rec-1',
      sourceType: 'mixed',
      mediaUrl: 'https://example.com/a.mp4',
      pipelineVersion: 'v1',
    });
    expect(conflict.httpStatus).toBe(409);
    expect(conflict.data.reused).toBe(true);
  });
});
