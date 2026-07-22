import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';

const router = Router();

router.get('/services', async (_req: Request, res: Response) => {
  const settings = await prisma.setting.findMany({ where: { group: 'services' } });
  res.json({ data: settings });
});

router.get('/privacy-policy', (_req: Request, res: Response) => {
  res.json({
    title: 'Privacy Policy',
    version: '2.0.0-m2',
    updatedAt: '2026-07-22',
    dpoEmail: 'privacy@riayahplus.com',
    content:
      'Riayah Plus processes personal and special-category health data to deliver care coordination. ' +
      'Lawful bases include contract, explicit consent (including guardian consent for care recipients), and vital interests for emergencies. ' +
      'You may access, rectify, export, restrict, or erase your data via /api/privacy/* endpoints or the in-app privacy settings. ' +
      'Retention: account anonymization 30 days after deletion request; emergency location 90 days after resolution; GPS logs 90 days; notifications 1 year; OTP 24 hours. ' +
      'Processors may include payment gateways (Stripe/PayTabs) and messaging providers. International transfers follow contractual safeguards. ' +
      'Full policy: see the Privacy page in the web app. Contact privacy@riayahplus.com for DPO inquiries.',
    cookiePolicy:
      'Essential cookies are required for authentication. Analytics/marketing cookies are used only with consent (cookie banner).',
  });
});

router.get('/terms-of-service', (_req: Request, res: Response) => {
  res.json({
    title: 'Terms of Service',
    version: '2.0.0-m2',
    updatedAt: '2026-07-22',
    content:
      'By using Riayah Plus you agree to these Terms. The Service provides care coordination tooling for families, coordinators, and clinical staff. ' +
      'Do not misuse the Service or attempt unauthorized access. Account deletion and data rights are described in the Privacy Policy.',
  });
});

// Payment webhook routes (mounted at /api prefix in app.ts with raw body)
router.get('/up', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

export default router;
