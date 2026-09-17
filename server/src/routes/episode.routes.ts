import { Router, Request, Response, NextFunction } from 'express';
import { CareEpisodeController } from '../controllers/patients/CareEpisodeController';
import { CarePlanDraftCallbackController } from '../controllers/ai/CarePlanDraftCallbackController';
import { AiIntakeSummaryController } from '../controllers/ai/AiIntakeSummaryController';
import { authenticate } from '../middleware/auth';
import { requireCareCoordinator, requireCareUser } from '../middleware/rbac';
import { CareSummaryPDFService } from '../services/CareSummaryPDFService';
import { AppError } from '../middleware/errorHandler';
import { assertTenantOrgAccess } from '../middleware/tenantAccess';
import { isFamilyRole } from '../utils/careAccess';

const router = Router();
router.use(authenticate);

router.get('/', requireCareUser, CareEpisodeController.index);
router.post('/', requireCareCoordinator, CareEpisodeController.store);
router.get('/coordinators', requireCareCoordinator, CareEpisodeController.coordinators);
router.get('/:id', requireCareUser, CareEpisodeController.show);
router.patch('/:id', requireCareCoordinator, CareEpisodeController.update);
router.patch('/:id/assign-coordinator', requireCareCoordinator, CareEpisodeController.assignCoordinator);
router.post('/:id/submit-intake', requireCareCoordinator, CareEpisodeController.submitIntake);
router.get(
  '/:id/ai-intake-summary',
  requireCareCoordinator,
  (req: Request, res: Response, next: NextFunction) => {
    AiIntakeSummaryController.show(req, res).catch(next);
  },
);
router.post(
  '/:id/ai-intake-summary/approve',
  requireCareCoordinator,
  (req: Request, res: Response, next: NextFunction) => {
    AiIntakeSummaryController.approve(req, res).catch(next);
  },
);
router.post(
  '/:id/ai-care-plan-draft',
  requireCareCoordinator,
  (req: Request, res: Response, next: NextFunction) => {
    CarePlanDraftCallbackController.trigger(req, res).catch(next);
  },
);

// Care summary PDF — tenant + party checks (C-5)
router.get('/:id/summary-pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const episode = await prisma.careEpisode.findUnique({
      where: { id: req.params.id },
      include: { careUnit: { select: { familyUserId: true } } },
    });
    if (!episode) throw new AppError('Care episode not found.', 404);

    const role = req.user!.role;
    if (isFamilyRole(role)) {
      const owns =
        episode.patientId === req.user!.userId ||
        episode.careUnit?.familyUserId === req.user!.userId;
      if (!owns) throw new AppError('Forbidden.', 403);
    } else if (['admin', 'super_admin', 'care_coordinator'].includes(role)) {
      assertTenantOrgAccess(req, episode.organizationId);
    } else if (episode.coordinatorId === req.user!.userId) {
      assertTenantOrgAccess(req, episode.organizationId);
    } else {
      throw new AppError('Forbidden.', 403);
    }

    if (episode.summaryPdfUrl) {
      const pdfUrl = await CareSummaryPDFService.getSignedDownloadUrl(episode.summaryPdfUrl);
      res.json({ success: true, pdfUrl, expiresIn: 300 });
      return;
    }

    await CareSummaryPDFService.generateForEpisode(req.params.id);
    const refreshed = await prisma.careEpisode.findUnique({
      where: { id: req.params.id },
      select: { summaryPdfUrl: true },
    });
    if (!refreshed?.summaryPdfUrl) {
      throw new AppError('Failed to generate care summary PDF.', 500);
    }
    const pdfUrl = await CareSummaryPDFService.getSignedDownloadUrl(refreshed.summaryPdfUrl);
    res.json({ success: true, pdfUrl, expiresIn: 300 });
  } catch (err) {
    next(err);
  }
});

export default router;
