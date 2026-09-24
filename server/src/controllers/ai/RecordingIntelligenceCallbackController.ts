import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import {
  assertRunFound,
  RecordingIntelligenceService,
} from '../../services/RecordingIntelligenceService';
import { recordingCallbackPayloadSchema } from '../../services/recordingIntelligenceTypes';
import {
  canViewRecording,
} from '../../services/TelehealthRecordingService';
import type { TelehealthActor } from '../../services/LiveKitAccess';
import { AuditService } from '../../services/AuditService';

function actorFromReq(req: Request): TelehealthActor {
  return {
    userId: req.user!.userId,
    role: req.user!.role,
    organizationId: req.tenant?.organizationId,
  };
}

/**
 * AI recording-intelligence: callback (API key) + optional clinician GET.
 * Never writes ClinicalNote — drafts stay in RecordingIntelligenceArtifact.
 */
export class RecordingIntelligenceCallbackController {
  /** POST /ai/callbacks/recording-intelligence — server-to-server from Riayah AI */
  static async handle(req: Request, res: Response): Promise<void> {
    const body = recordingCallbackPayloadSchema.parse(req.body);
    const result = await RecordingIntelligenceService.handleCallback(body);

    // S2S callback — no User row; leave userId null (FK) and tag actor in metadata.
    await AuditService.log({
      action: 'ai_recording_intelligence_callback',
      entity: 'RecordingIntelligenceRun',
      entityId: result.runId,
      after: {
        recordingId: result.recordingId,
        pipelineVersion: result.pipelineVersion,
        status: result.status,
        artifactStatuses: result.artifactStatuses,
      },
      metadata: { actor: 'ai-service' },
      req,
    });

    res.status(200).json({
      message: 'Recording intelligence callback accepted.',
      data: {
        recordingId: result.recordingId,
        pipelineVersion: result.pipelineVersion,
        runId: result.runId,
        status: result.status,
        artifactStatuses: result.artifactStatuses,
      },
    });
  }

  /**
   * GET /telehealth/sessions/:sessionId/recording-intelligence
   * Staff-only clinician read of AI drafts (authz via recording view rules).
   */
  static async getForSession(req: Request, res: Response): Promise<void> {
    const sessionId = req.params.sessionId;
    const query = z
      .object({
        pipelineVersion: z.string().min(1).optional(),
      })
      .parse(req.query ?? {});

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { episode: { select: { coordinatorId: true, organizationId: true } } },
    });
    if (!session) throw new AppError('Session not found.', 404);

    const actor = actorFromReq(req);
    if (!canViewRecording('session', session, actor)) {
      throw new AppError('Forbidden.', 403);
    }

    const run = assertRunFound(
      await RecordingIntelligenceService.getRun(sessionId, query.pipelineVersion),
    );

    await AuditService.log({
      userId: actor.userId,
      action: 'ai_recording_intelligence_viewed',
      entity: 'RecordingIntelligenceRun',
      entityId: run.id,
      after: {
        recordingId: run.recordingId,
        pipelineVersion: run.pipelineVersion,
        status: run.status,
      },
      req,
    });

    const { logPhiRead } = await import('../../utils/phiReadLog');
    await logPhiRead({
      userId: actor.userId,
      role: actor.role,
      purpose: 'recording_intelligence_view',
      entity: 'RecordingIntelligenceRun',
      entityId: run.id,
      metadata: { recordingId: run.recordingId, sessionId },
      req,
    });

    res.status(200).json({
      success: true,
      data: run,
    });
  }
}
