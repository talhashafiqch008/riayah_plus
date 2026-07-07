import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';

const router = Router();

router.get('/services', async (_req: Request, res: Response) => {
  const settings = await prisma.setting.findMany({ where: { group: 'services' } });
  res.json({ data: settings });
});

router.get('/privacy-policy', (_req: Request, res: Response) => {
  res.json({ title: 'Privacy Policy', content: 'Please contact support@riayahplus.com for our privacy policy.' });
});

router.get('/terms-of-service', (_req: Request, res: Response) => {
  res.json({ title: 'Terms of Service', content: 'Please contact support@riayahplus.com for our terms of service.' });
});

// Payment webhook routes (mounted at /api prefix in app.ts with raw body)
router.get('/up', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

export default router;
