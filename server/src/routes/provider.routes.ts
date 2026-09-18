import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, optionalAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { parsePagination } from '../utils/pagination';
import { queryString } from '../utils/queryScalar';

const router = Router();

// Public: list providers/doctors
router.get('/doctors', optionalAuth, async (req: Request, res: Response) => {
        const { page, limit, skip, take } = parsePagination(req.query);
      const search = queryString(req.query.search);
      const serviceType = queryString(req.query.serviceType);

  const where: Record<string, unknown> = {
    isActive: true,
    role: { in: ['doctor', 'provider', 'nurse', 'physiotherapist', 'occupational_therapist',
      'speech_therapist', 'psychologist', 'dietitian', 'caregiver', 'therapist'] },
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { providerProfile: { bio: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [providers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { providerProfile: true },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ data: providers, total });
});

router.get('/doctors/:id', optionalAuth, async (req: Request, res: Response) => {
  const provider = await prisma.user.findUnique({
    where: { id: req.params.id, deletedAt: null },
    include: { providerProfile: true, availabilitySlots: true, receivedReviews: { take: 10, orderBy: { createdAt: 'desc' } } },
  });
  if (!provider) throw new AppError('Provider not found.', 404);
  res.json({ data: provider });
});

// Public: availability
router.get('/:providerId/availability', optionalAuth, async (req: Request, res: Response) => {
  const slots = await prisma.providerAvailabilitySlot.findMany({
    where: { providerId: req.params.providerId, isAvailable: true },
  });
  res.json({ data: slots });
});

// Authenticated routes
router.use(authenticate);

// Matched providers
router.get('/matched', async (req: Request, res: Response) => {
  const { page, limit, skip, take } = parsePagination(req.query);

  const where: Record<string, unknown> = {
    isActive: true,
    role: { in: ['provider', 'doctor', 'nurse', 'caregiver', 'therapist', 'support_worker', 'companion'] },
    deletedAt: null,
  };

  const [providers, total] = await Promise.all([
    prisma.user.findMany({ where, include: { providerProfile: true }, skip, take }),
    prisma.user.count({ where }),
  ]);

  res.json({ data: providers, total, page, limit });
});

// Provider profile (self)
router.get('/profile', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { providerProfile: true, availabilitySlots: true },
  });
  res.json({ data: user });
});

router.put('/profile', async (req: Request, res: Response) => {
  const data = z.object({
    bio: z.string().optional(),
    specializations: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    hourlyRate: z.number().optional(),
    isAvailable: z.boolean().optional(),
  }).parse(req.body);

  const profile = await prisma.serviceProvider.upsert({
    where: { userId: req.user!.userId },
    create: { userId: req.user!.userId, ...data, specializations: data.specializations ?? [], languages: data.languages ?? [] },
    update: data,
  });

  res.json({ data: profile });
});

// Availability management
router.get('/availability', async (req: Request, res: Response) => {
  const slots = await prisma.providerAvailabilitySlot.findMany({ where: { providerId: req.user!.userId } });
  res.json({ data: slots });
});

router.post('/availability', async (req: Request, res: Response) => {
  const data = z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string(),
    endTime: z.string(),
    isAvailable: z.boolean().default(true),
  })).parse(req.body);

  await prisma.providerAvailabilitySlot.deleteMany({ where: { providerId: req.user!.userId } });
  const slots = await prisma.providerAvailabilitySlot.createMany({
    data: data.map((s) => ({ ...s, providerId: req.user!.userId })),
  });

  res.json({ created: slots.count });
});

// Provider reviews
router.get('/:id/reviews', async (req: Request, res: Response) => {
  const reviews = await prisma.review.findMany({
    where: { providerId: req.params.id },
    include: { client: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: reviews });
});

export default router;
