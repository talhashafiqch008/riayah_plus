import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { z } from 'zod';

const pricingSchema = z.object({
  serviceType: z.string().min(1),
  rateType: z.enum(['hourly', 'daily', 'fixed', 'per_session']).default('hourly'),
  baseRate: z.number().positive(),
  currency: z.string().default('QAR'),
  minHours: z.number().positive().optional(),
  maxHours: z.number().positive().optional(),
  weekendRate: z.number().positive().optional(),
  nightRate: z.number().positive().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

const pricingRuleSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  value: z.number(),
  currency: z.string().default('QAR'),
  conditions: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
});

export class ProviderPricingController {
  // GET /provider/pricing
  async listPricing(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const pricing = await prisma.providerPricing.findMany({
        where: { providerId },
        orderBy: { serviceType: 'asc' },
      });
      res.json({ data: pricing });
    } catch (err) {
      next(err);
    }
  }

  // POST /provider/pricing
  async createPricing(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const parsed = pricingSchema.parse(req.body);

      const existing = await prisma.providerPricing.findFirst({
        where: { providerId, serviceType: parsed.serviceType, isActive: true },
      });
      if (existing) throw new AppError('Active pricing already exists for this service type. Update it instead.', 409);

      const pricing = await prisma.providerPricing.create({
        data: { providerId, ...parsed },
      });
      res.status(201).json({ data: pricing });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /provider/pricing/:id
  async deletePricing(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { id } = req.params;
      const pricing = await prisma.providerPricing.findFirst({ where: { id, providerId } });
      if (!pricing) throw new AppError('Not found', 404);
      await prisma.providerPricing.delete({ where: { id } });
      res.json({ message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }

  // POST /provider/pricing/calculate
  async calculatePrice(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { serviceType, hours = 1, isWeekend = false, isNight = false } = req.body;

      const pricing = await prisma.providerPricing.findFirst({
        where: { providerId, serviceType, isActive: true },
      });
      if (!pricing) throw new AppError('No pricing configured for this service type', 404);

      let rate = Number(pricing.baseRate);

      const subtotal = rate * hours;
      const platformFee = subtotal * 0.1;
      const total = subtotal + platformFee;

      res.json({
        data: {
          serviceType,
          hours,
          rateUsed: rate,
          currency: pricing.currency,
          subtotal,
          platformFee,
          total,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /provider/pricing-rules
  async listRules(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const rules = await prisma.providerPricingRule.findMany({
        where: { providerId },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ data: rules });
    } catch (err) {
      next(err);
    }
  }

  // POST /provider/pricing-rules
  async createRule(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const parsed = pricingRuleSchema.parse(req.body);
      const rule = await prisma.providerPricingRule.create({
        data: { providerId, ...parsed, conditions: parsed.conditions ? parsed.conditions as Prisma.InputJsonValue : undefined },
      });
      res.status(201).json({ data: rule });
    } catch (err) {
      next(err);
    }
  }

  // PUT /provider/pricing-rules/:id
  async updateRule(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { id } = req.params;
      const rule = await prisma.providerPricingRule.findFirst({ where: { id, providerId } });
      if (!rule) throw new AppError('Not found', 404);
      const parsed = pricingRuleSchema.partial().parse(req.body);
      const updated = await prisma.providerPricingRule.update({
        where: { id },
        data: { ...parsed, conditions: parsed.conditions ? parsed.conditions as Prisma.InputJsonValue : undefined },
      });
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /provider/pricing-rules/:id
  async deleteRule(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { id } = req.params;
      const rule = await prisma.providerPricingRule.findFirst({ where: { id, providerId } });
      if (!rule) throw new AppError('Not found', 404);
      await prisma.providerPricingRule.delete({ where: { id } });
      res.json({ message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }
}

export default new ProviderPricingController();
