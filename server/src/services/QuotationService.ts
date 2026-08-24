import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { notifyBillingEvent } from './BillingNotificationService';
import { AuditService } from './AuditService';
import { InvoicePDFService } from './InvoicePDFService';
import { catalogUnitPrice } from './ServiceCatalog';

const DEFAULT_TAX_RATE = 0.05;
const DEFAULT_CURRENCY = 'QAR';

export type QuotationLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  serviceType: string;
  category?: string;
};

export type CarePlanQuotationResult =
  | { created: false; reason: 'already_exists' | 'no_billable_items'; quotationId?: string }
  | { created: true; quotationId: string; invoiceNumber: string; total: number; currency: string };

function generateQuotationNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `QUO-${timestamp}-${random}`;
}

/** Parse a quantity from frequency/duration strings (e.g. "3x/week", "2 sessions"). */
export function parseServiceQuantity(frequency?: string | null, duration?: string | null): number {
  const sources = [frequency, duration].filter(Boolean).join(' ');
  if (!sources) return 1;
  const match =
    sources.match(/(\d+)\s*[x×]/i) ||
    sources.match(/(\d+)\s*(?:times|sessions|visits|hrs?|hours?)/i) ||
    sources.match(/^(\d+)$/);
  if (match) {
    const n = parseInt(match[1], 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }
  return 1;
}

function carePlanMarker(carePlanId: string): string {
  return `carePlanId=${carePlanId}`;
}

/**
 * Builds QAR quotation line items from care plan services.
 * Rates: ServiceType.baseRate (catalog) wins; item.unitCost only if no catalog rate.
 * Spec: backend-calculated; tampered client prices cannot underpay.
 */
export async function buildQuotationLineItems(
  items: Array<{
    serviceType: string;
    frequency: string | null;
    duration: string | null;
    unitCost: { toNumber?: () => number } | number | null;
    notes: string | null;
  }>,
): Promise<QuotationLineItem[]> {
  if (!items.length) return [];

  const serviceTypes = await prisma.serviceType.findMany({
    where: { isActive: true },
    select: { code: true, name: true, baseRate: true, category: true, currency: true },
  });

  const byCode = new Map(serviceTypes.map((s) => [s.code.toLowerCase(), s]));
  const byName = new Map(serviceTypes.map((s) => [s.name.toLowerCase(), s]));

  const lines: QuotationLineItem[] = [];

  for (const item of items) {
    const key = item.serviceType.trim();
    const catalog =
      byCode.get(key.toLowerCase()) ||
      byName.get(key.toLowerCase()) ||
      null;

    let submitted: number | null = null;
    if (item.unitCost != null) {
      const n =
        typeof item.unitCost === 'number'
          ? item.unitCost
          : item.unitCost.toNumber?.() ?? Number(item.unitCost);
      if (Number.isFinite(n) && n > 0) submitted = n;
    }
    const catalogRate = catalog ? Number(catalog.baseRate) : null;
    const unitPrice = catalogUnitPrice(
      catalogRate != null && Number.isFinite(catalogRate) ? catalogRate : null,
      submitted,
    );
    if (unitPrice == null) {
      logger.warn('Quotation: skipping care plan item without resolvable rate', {
        serviceType: item.serviceType,
      });
      continue;
    }

    const quantity = parseServiceQuantity(item.frequency, item.duration);
    const category = catalog?.category ?? 'general';
    const label = catalog?.name ?? item.serviceType;
    const freqNote = item.frequency ? ` (${item.frequency})` : '';
    const extra = item.notes ? ` — ${item.notes}` : '';

    lines.push({
      description: `${label}${freqNote}${extra}`.slice(0, 500),
      quantity,
      unitPrice,
      serviceType: item.serviceType,
      category,
    });
  }

  // Spec: grouped by category
  lines.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.description.localeCompare(b.description));
  return lines;
}

function calculateTotals(lineItems: QuotationLineItem[], taxRate: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount,
    total,
  };
}

/**
 * Auto-generate a QAR quotation when a care plan is approved.
 * Idempotent per carePlanId. Never throws for "already exists" / empty items —
 * callers should not fail clinical approval if billing is skipped.
 */
export class QuotationService {
  static async createFromCarePlanApproval(carePlanId: string, actorUserId?: string): Promise<CarePlanQuotationResult> {
    const plan = await prisma.carePlan.findUnique({
      where: { id: carePlanId },
      include: {
        items: true,
        episode: {
          select: {
            id: true,
            patientId: true,
            careUnit: { select: { familyUserId: true } },
          },
        },
      },
    });

    if (!plan) throw new AppError('Care plan not found.', 404);

    const marker = carePlanMarker(carePlanId);
    const existing = await prisma.invoice.findFirst({
      where: {
        type: 'quotation',
        episodeId: plan.episodeId,
        notes: { contains: marker },
      },
      select: { id: true },
    });
    if (existing) {
      return { created: false, reason: 'already_exists', quotationId: existing.id };
    }

    const lineItems = await buildQuotationLineItems(plan.items);
    if (!lineItems.length) {
      logger.warn('Quotation skipped — no billable care plan items', { carePlanId });
      return { created: false, reason: 'no_billable_items' };
    }

    const taxRate = DEFAULT_TAX_RATE;
    const { subtotal, taxAmount, total } = calculateTotals(lineItems, taxRate);
    const clientId = plan.episode.careUnit?.familyUserId ?? plan.episode.patientId;
    if (!clientId) {
      throw new AppError('Cannot create quotation: episode has no family/patient client.', 422);
    }

    const invoiceNumber = generateQuotationNumber();
    const quotation = await prisma.invoice.create({
      data: {
        clientId,
        episodeId: plan.episodeId,
        invoiceNumber,
        type: 'quotation',
        status: 'sent',
        currency: DEFAULT_CURRENCY,
        subtotal,
        taxRate,
        taxAmount,
        total,
        sentAt: new Date(),
        notes: `Auto-generated on care plan approval. ${marker}. Plan: ${plan.title} (v${plan.version}).`,
        lineItems: lineItems.map(({ description, quantity, unitPrice, serviceType, category }) => ({
          description,
          quantity,
          unitPrice,
          serviceType,
          category,
        })),
      },
    });

    await notifyBillingEvent({
      userId: clientId,
      type: 'quotation_generated',
      title: 'Quotation ready',
      body: `A quotation (${invoiceNumber}) for ${DEFAULT_CURRENCY} ${total.toFixed(2)} is ready for your care plan.`,
      data: { quotationId: quotation.id, carePlanId, episodeId: plan.episodeId, invoiceNumber },
      invoiceNumber,
      amount: total.toFixed(2),
      currency: DEFAULT_CURRENCY,
    });

    if (actorUserId) {
      try {
        await AuditService.log({
          userId: actorUserId,
          action: 'quotation_auto_created',
          entity: 'Invoice',
          entityId: quotation.id,
          after: { carePlanId, invoiceNumber, total, currency: DEFAULT_CURRENCY },
        });
      } catch (err) {
        logger.warn('Quotation audit failed', { quotationId: quotation.id, err });
      }
    }

    // Best-effort PDF (S3 may be unset in local) — never fail approval path
    void InvoicePDFService.generateAndUpload(quotation.id).catch((err) => {
      logger.warn('Quotation PDF upload skipped/failed', {
        quotationId: quotation.id,
        message: err instanceof Error ? err.message : String(err),
      });
    });

    return {
      created: true,
      quotationId: quotation.id,
      invoiceNumber,
      total,
      currency: DEFAULT_CURRENCY,
    };
  }
}
