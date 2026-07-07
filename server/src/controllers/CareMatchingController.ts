import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const findProvidersSchema = z.object({
  serviceType: z.string().min(1),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  budget: z.number().optional(),
  scheduledAt: z.string().optional(),
  durationHours: z.number().optional(),
  requiredLanguages: z.array(z.string()).optional(),
});

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class CareMatchingController {
  // POST /matching/find-providers
  async findProviders(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = findProvidersSchema.parse(req.body);
      const providerRoles = ['provider', 'doctor', 'nurse', 'physiotherapist',
        'occupational_therapist', 'speech_therapist', 'psychologist', 'dietitian',
        'support_worker', 'caregiver', 'therapist'];

      const providers = await prisma.user.findMany({
        where: {
          role: { in: providerRoles as UserRole[] },
          verificationStatus: 'approved',
          deletedAt: null,
        },
        include: {
          providerProfile: true,
          providerProfileExt: true,
          pricing: { where: { serviceType: parsed.serviceType, isActive: true }, take: 1 },
        },
      });

      const scored = providers
        .filter((p) => {
          if (parsed.budget && p.pricing[0] && Number(p.pricing[0].baseRate) > parsed.budget) return false;
          if (parsed.requiredLanguages?.length && p.providerProfile) {
            const langs = p.providerProfile.languages;
            if (!parsed.requiredLanguages.every((l) => langs.includes(l))) return false;
          }
          return true;
        })
        .map((p) => {
          let score = 50;
          if (p.providerProfileExt) {
            score += p.providerProfileExt.averageRating * 8;
            score += Math.min(p.providerProfileExt.reviewCount, 50);
          }
          if (parsed.latitude && parsed.longitude && p.providerProfile?.latitude && p.providerProfile?.longitude) {
            const dist = haversineKm(
              parsed.latitude, parsed.longitude,
              Number(p.providerProfile.latitude), Number(p.providerProfile.longitude)
            );
            score -= Math.min(dist, 50);
          }
          return { ...p, matchScore: Math.round(score) };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 20)
        .map(({ pricing, providerProfile, providerProfileExt, ...rest }) => ({
          id: rest.id,
          name: rest.name,
          role: rest.role,
          matchScore: rest.matchScore,
          rating: providerProfileExt?.averageRating ?? 0,
          reviewCount: providerProfileExt?.reviewCount ?? 0,
          hourlyRate: pricing[0] ? Number(pricing[0].baseRate) : null,
          location: providerProfile?.location,
          languages: providerProfile?.languages ?? [],
        }));

      res.json({ data: scored });
    } catch (err) {
      next(err);
    }
  }

  // POST /matching/save
  async saveMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { providerId, careNeedId, criteria } = req.body;
      if (!providerId) throw new AppError('providerId is required', 400);

      const match = await prisma.providerMatch.create({
        data: {
          careseekerIdValue: req.user!.userId,
          providerId,
          criteria,
          savedAt: new Date(),
        },
      });
      res.status(201).json({ data: match });
    } catch (err) {
      next(err);
    }
  }

  // GET /matching/history/:careseekerId
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { careseekerId } = req.params;
      if (careseekerId !== req.user!.userId && req.user!.role !== 'admin') {
        throw new AppError('Forbidden', 403);
      }

      const history = await prisma.providerMatch.findMany({
        where: { careseekerIdValue: careseekerId },
        include: { provider: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json({ data: history });
    } catch (err) {
      next(err);
    }
  }
}

export default new CareMatchingController();
