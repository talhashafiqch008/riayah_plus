import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { assertTenantOrgAccess } from '../../middleware/tenantAccess';
import { optionalSanitizedString } from '../../utils/sanitize';
import {
  AiCarePlanDraftService,
  carePlanDraftCallbackSchema,
  toPublicCarePlan,
} from '../../services/AiCarePlanDraftService';
import { AuditService } from '../../services/AuditService';

const triggerSchema = z.object({
  familyConsultationNotes: optionalSanitizedString(),
  outputLanguage: z.string().min(2).max(10).optional(),
});

/**
 * AI care-plan draft: callback (API key) + coordinator trigger (session auth).
 */
export class CarePlanDraftCallbackController {
  /** POST /ai/callbacks/care-plan-draft — server-to-server from Riayah AI */
  static async handle(req: Request, res: Response): Promise<void> {
    const body = carePlanDraftCallbackSchema.parse(req.body);
    const result = await AiCarePlanDraftService.handleCallback(body);

    await AuditService.log({
      userId: 'ai-service',
      action: 'ai_care_plan_callback',
      entity: 'CarePlan',
      entityId: result.carePlanId,
      after: {
        episodeId: result.episodeId,
        created: result.created,
        idempotentReplay: result.idempotentReplay,
        status: result.status,
        version: result.version,
      },
      req,
    });

    res.status(result.created ? 201 : 200).json({
      message: result.idempotentReplay
        ? 'AI care plan draft already applied (idempotent).'
        : 'AI care plan draft persisted.',
      data: result,
    });
  }

  /**
   * POST /episodes/:id/ai-care-plan-draft — coordinator explicit trigger (M3-2.4)
   */
  static async trigger(req: Request, res: Response): Promise<void> {
    const episodeId = req.params.id;
    const body = triggerSchema.parse(req.body ?? {});

    const episode = await prisma.careEpisode.findUnique({
      where: { id: episodeId },
      select: { id: true, organizationId: true },
    });
    if (!episode) throw new AppError('Episode not found.', 404);
    assertTenantOrgAccess(req, episode.organizationId);

    const result = await AiCarePlanDraftService.requestFromCoordinator({
      episodeId,
      actorId: req.user!.userId,
      familyConsultationNotes: body.familyConsultationNotes,
      outputLanguage: body.outputLanguage,
    });

    const plan = await prisma.carePlan.findUnique({
      where: { id: result.carePlanId },
      include: { goals: true, items: true },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'care_plan_ai_draft_requested',
      entity: 'CarePlan',
      entityId: result.carePlanId,
      after: {
        episodeId,
        created: result.created,
        model: result.ai.model,
        totalTokens: result.ai.totalTokens,
      },
      req,
    });

    res.status(result.created ? 201 : 200).json({
      message: result.created
        ? 'AI care plan draft generated. Review and edit before submitting to family.'
        : 'AI care plan draft updated. Review and edit before submitting to family.',
      data: {
        carePlanId: result.carePlanId,
        episodeId: result.episodeId,
        created: result.created,
        idempotentReplay: result.idempotentReplay,
        status: result.status,
        version: result.version,
        ai: { status: result.ai.status },
        carePlan: plan ? toPublicCarePlan(plan) : plan,
      },
    });
  }
}
