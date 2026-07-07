import { Router, Request, Response, NextFunction } from 'express';
import { CareEpisodeController } from '../controllers/patients/CareEpisodeController';
import { authenticate } from '../middleware/auth';
import { requireCareCoordinator } from '../middleware/rbac';
import { CareSummaryPDFService } from '../services/CareSummaryPDFService';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/', CareEpisodeController.index);
router.post('/', requireCareCoordinator, CareEpisodeController.store);
router.get('/:id', CareEpisodeController.show);
router.patch('/:id', requireCareCoordinator, CareEpisodeController.update);
router.post('/:id/submit-intake', requireCareCoordinator, CareEpisodeController.submitIntake);

// Care summary PDF
router.get('/:id/summary-pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../config/database');
    const episode = await prisma.careEpisode.findUnique({ where: { id: req.params.id } });
    if (!episode) throw new AppError('Care episode not found.', 404);

    const isAdmin = ['admin', 'super_admin', 'care_coordinator'].includes(req.user!.role);
    const isParty = episode.patientId === req.user!.userId || episode.coordinatorId === req.user!.userId;
    if (!isParty && !isAdmin) throw new AppError('Forbidden.', 403);

    if (episode.summaryPdfUrl) { res.json({ success: true, pdfUrl: episode.summaryPdfUrl }); return; }

    const pdfUrl = await CareSummaryPDFService.generateForEpisode(req.params.id);
    res.json({ success: true, pdfUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
