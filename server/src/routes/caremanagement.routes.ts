import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { CareRecipientController } from '../controllers/caremanagement/CareRecipientController';
import { ConsentController } from '../controllers/caremanagement/ConsentController';
import { FamilyMemberController } from '../controllers/caremanagement/FamilyMemberController';
import { ClientProfileController } from '../controllers/caremanagement/ClientProfileController';
import { ClientReportController } from '../controllers/caremanagement/ClientReportController';
import { DashboardAggregationService } from '../services/DashboardAggregationService';
import { prisma } from '../config/database';

const router = Router();
router.use(authenticate);

// Care recipients
router.post('/care-recipients', CareRecipientController.create);
router.get('/care-recipients', CareRecipientController.list);
router.get('/care-recipients/:id', CareRecipientController.show);
router.patch('/care-recipients/:id', CareRecipientController.update);
router.delete('/care-recipients/:id', CareRecipientController.delete);

// Consents
router.post('/consents', ConsentController.grant);
router.get('/consents', ConsentController.list);
router.delete('/consents/:consentType', ConsentController.revoke);

// Consent alias paths (POST /consent/record, GET /consent/status, GET /consent/history)
router.post('/consent/record', ConsentController.grant);
router.get('/consent/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { type } = req.query as Record<string, string>;
    const where: Record<string, unknown> = { userId, granted: true };
    if (type) where.consentType = type;
    const consents = await prisma.consent.findMany({ where });
    res.json({ data: { consents, hasAllRequired: consents.length > 0 } });
  } catch (err) { next(err); }
});
router.get('/consent/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const history = await prisma.consentLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: history });
  } catch (err) { next(err); }
});

// Family members
router.post('/family-members', FamilyMemberController.create);
router.get('/family-members', FamilyMemberController.list);
router.patch('/family-members/:id', FamilyMemberController.update);
router.delete('/family-members/:id', FamilyMemberController.delete);

// Client profile (careseeker-specific fields)
router.get('/profile', ClientProfileController.show);
router.put('/profile', ClientProfileController.upsert);

// Client reports (activity, hours, spend)
router.get('/report', ClientReportController.summary);
router.get('/report/provider/:providerId', ClientReportController.byProvider);

// Client dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const stats = await DashboardAggregationService.getClientStats(req.user!.userId);
    res.json({ success: true, dashboard: stats });
  } catch (err) {
    next(err);
  }
});

export default router;
