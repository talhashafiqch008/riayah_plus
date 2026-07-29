import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { assertTenantOrgAccess } from '../../middleware/tenantAccess';
import { AuditService } from '../../services/AuditService';
import {
  assertValidAvailabilityRange,
} from '../../services/SchedulingConflictService';

const slotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  isAvailable: z.boolean().default(true),
});

const replaceSchema = z.object({
  slots: z.array(slotSchema).max(50),
});

function assertCanManageProvider(req: Request, providerId: string, providerOrgId: string | null) {
  const role = req.user!.role;
  const isSelf = req.user!.userId === providerId;
  const isCoordOrAdmin = [
    'care_coordinator',
    'admin',
    'super_admin',
    'support_admin',
  ].includes(role);

  if (!isSelf && !isCoordOrAdmin) {
    throw new AppError('Forbidden. Only the provider or a care coordinator can manage availability.', 403);
  }
  if (!isSelf) {
    assertTenantOrgAccess(req, providerOrgId);
  }
}

async function loadProviderOrThrow(providerId: string) {
  const provider = await prisma.user.findFirst({
    where: { id: providerId, deletedAt: null, isActive: true },
    select: { id: true, organizationId: true, role: true, name: true, email: true },
  });
  if (!provider) throw new AppError('Provider not found.', 404);
  return provider;
}

export class AvailabilityController {
  /** GET /availability?providerId= — list slots */
  static async index(req: Request, res: Response): Promise<void> {
    const providerId =
      (typeof req.query.providerId === 'string' && req.query.providerId) ||
      req.user!.userId;

    const provider = await loadProviderOrThrow(providerId);
    const role = req.user!.role;
    const isSelf = req.user!.userId === providerId;
    const isStaff = [
      'care_coordinator',
      'admin',
      'super_admin',
      'support_admin',
      'clinical_staff',
    ].includes(role);

    if (!isSelf && !isStaff) {
      throw new AppError('Forbidden.', 403);
    }
    if (!isSelf) {
      assertTenantOrgAccess(req, provider.organizationId);
    }

    const slots = await prisma.providerAvailabilitySlot.findMany({
      where: { providerId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.json({ providerId, provider: { id: provider.id, name: provider.name, role: provider.role }, slots });
  }

  /** PUT /availability/:providerId — replace all slots for provider */
  static async replace(req: Request, res: Response): Promise<void> {
    const { slots } = replaceSchema.parse(req.body);
    const provider = await loadProviderOrThrow(req.params.providerId);
    assertCanManageProvider(req, provider.id, provider.organizationId);

    for (const s of slots) {
      assertValidAvailabilityRange(s.startTime, s.endTime);
    }

    const created = await prisma.$transaction(async (tx) => {
      await tx.providerAvailabilitySlot.deleteMany({ where: { providerId: provider.id } });
      if (slots.length === 0) return [];
      await tx.providerAvailabilitySlot.createMany({
        data: slots.map((s) => ({
          providerId: provider.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isAvailable: s.isAvailable,
        })),
      });
      return tx.providerAvailabilitySlot.findMany({
        where: { providerId: provider.id },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'availability_replaced',
      entity: 'ProviderAvailabilitySlot',
      entityId: provider.id,
      after: { count: created.length },
      req,
    });

    res.json({ providerId: provider.id, slots: created });
  }

  /** POST /availability — create one slot (body.providerId optional → self) */
  static async store(req: Request, res: Response): Promise<void> {
    const body = slotSchema.extend({ providerId: z.string().optional() }).parse(req.body);
    const providerId = body.providerId ?? req.user!.userId;
    const provider = await loadProviderOrThrow(providerId);
    assertCanManageProvider(req, provider.id, provider.organizationId);
    assertValidAvailabilityRange(body.startTime, body.endTime);

    const slot = await prisma.providerAvailabilitySlot.create({
      data: {
        providerId: provider.id,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        isAvailable: body.isAvailable,
      },
    });

    res.status(201).json({ slot });
  }

  /** PATCH /availability/slots/:slotId */
  static async updateSlot(req: Request, res: Response): Promise<void> {
    const data = slotSchema.partial().parse(req.body);
    const existing = await prisma.providerAvailabilitySlot.findUnique({
      where: { id: req.params.slotId },
    });
    if (!existing) throw new AppError('Availability slot not found.', 404);

    const provider = await loadProviderOrThrow(existing.providerId);
    assertCanManageProvider(req, provider.id, provider.organizationId);

    const startTime = data.startTime ?? existing.startTime;
    const endTime = data.endTime ?? existing.endTime;
    assertValidAvailabilityRange(startTime, endTime);

    const slot = await prisma.providerAvailabilitySlot.update({
      where: { id: existing.id },
      data,
    });
    res.json({ slot });
  }

  /** DELETE /availability/slots/:slotId */
  static async destroySlot(req: Request, res: Response): Promise<void> {
    const existing = await prisma.providerAvailabilitySlot.findUnique({
      where: { id: req.params.slotId },
    });
    if (!existing) throw new AppError('Availability slot not found.', 404);

    const provider = await loadProviderOrThrow(existing.providerId);
    assertCanManageProvider(req, provider.id, provider.organizationId);

    await prisma.providerAvailabilitySlot.delete({ where: { id: existing.id } });
    res.json({ message: 'Availability slot deleted.' });
  }
}
