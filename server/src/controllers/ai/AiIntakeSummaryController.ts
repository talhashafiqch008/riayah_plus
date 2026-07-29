import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { assertTenantOrgAccess } from '../../middleware/tenantAccess';
import { AiIntakeSummaryService } from '../../services/AiIntakeSummaryService';
import { AuditService } from '../../services/AuditService';

async function loadEpisodeForCoordinator(req: Request, episodeId: string) {
  const episode = await prisma.careEpisode.findUnique({
    where: { id: episodeId },
    select: { id: true, organizationId: true },
  });
  if (!episode) throw new AppError('Episode not found.', 404);
  assertTenantOrgAccess(req, episode.organizationId);
  return episode;
}

/**
 * Coordinator read/approve for AI intake summaries (M3-2.6).
 */
export class AiIntakeSummaryController {
  /** GET /episodes/:id/ai-intake-summary */
  static async show(req: Request, res: Response): Promise<void> {
    await loadEpisodeForCoordinator(req, req.params.id);
    const summary = await AiIntakeSummaryService.getByEpisodeId(req.params.id);
    if (!summary) {
      throw new AppError('AI intake summary not found for this episode.', 404);
    }
    res.json({ data: summary });
  }

  /** POST /episodes/:id/ai-intake-summary/approve */
  static async approve(req: Request, res: Response): Promise<void> {
    await loadEpisodeForCoordinator(req, req.params.id);

    const { summary, alreadyApproved } = await AiIntakeSummaryService.approve({
      episodeId: req.params.id,
      approverId: req.user!.userId,
    });

    if (!alreadyApproved) {
      await AuditService.log({
        userId: req.user!.userId,
        action: 'ai_intake_summary_approved',
        entity: 'AiIntakeSummary',
        entityId: summary.id,
        after: {
          careEpisodeId: summary.careEpisodeId,
          status: summary.status,
          approvedAt: summary.approvedAt,
        },
        req,
      });
    }

    res.json({
      message: alreadyApproved
        ? 'AI intake summary was already approved.'
        : 'AI intake summary approved.',
      data: summary,
    });
  }
}
