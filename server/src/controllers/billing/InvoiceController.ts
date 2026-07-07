import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { NotificationService } from '../../services/NotificationService';
import { EmailService } from '../../services/EmailService';
import { AuditService } from '../../services/AuditService';

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  serviceType: z.string().optional(),
});

const createInvoiceSchema = z.object({
  clientId: z.string(),
  episodeId: z.string().optional(),
  sessionId: z.string().optional(),
  type: z.enum(['invoice', 'quotation']).default('invoice'),
  currency: z.string().default('QAR'),
  taxRate: z.number().default(0.05),
  lineItems: z.array(lineItemSchema),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${timestamp}-${random}`;
}

function calculateTotals(lineItems: z.infer<typeof lineItemSchema>[], taxRate: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

export class InvoiceController {
  static async index(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '20', status, clientId } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    if (['client', 'consumer', 'family', 'patient'].includes(req.user!.role)) {
      where.clientId = req.user!.userId;
    } else if (clientId) {
      where.clientId = clientId;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { client: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ data: invoices, total, page: parseInt(page), limit: parseInt(limit) });
  }

  static async store(req: Request, res: Response): Promise<void> {
    const data = createInvoiceSchema.parse(req.body);
    const { subtotal, taxAmount, total } = calculateTotals(data.lineItems, data.taxRate);

    const invoice = await prisma.invoice.create({
      data: {
        clientId: data.clientId,
        episodeId: data.episodeId,
        sessionId: data.sessionId,
        invoiceNumber: generateInvoiceNumber(),
        type: data.type,
        currency: data.currency,
        taxRate: data.taxRate,
        subtotal,
        taxAmount,
        total,
        notes: data.notes,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        lineItems: data.lineItems as object,
        status: 'draft',
      },
    });

    await AuditService.log({ userId: req.user!.userId, action: 'invoice_created', entity: 'Invoice', entityId: invoice.id, req });
    res.status(201).json({ data: invoice });
  }

  static async show(req: Request, res: Response): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: true, payments: true },
    });
    if (!invoice) throw new AppError('Invoice not found.', 404);
    res.json({ data: invoice });
  }

  static async send(req: Request, res: Response): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: true },
    });
    if (!invoice) throw new AppError('Invoice not found.', 404);

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'sent', sentAt: new Date() },
    });

    await EmailService.sendInvoice(invoice.client.email, {
      name: invoice.client.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.total.toString(),
      currency: invoice.currency,
    });

    await NotificationService.create({
      userId: invoice.clientId,
      title: `Invoice ${invoice.invoiceNumber}`,
      body: `You have a new invoice for ${invoice.currency} ${invoice.total}`,
      type: 'invoice_sent',
      data: { invoiceId: invoice.id },
    });

    res.json({ data: updated });
  }

  static async markPaid(req: Request, res: Response): Promise<void> {
    const { gatewayRef, method } = z
      .object({ gatewayRef: z.string().optional(), method: z.string().optional() })
      .parse(req.body);

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: 'paid', paidAt: new Date() },
    });

    if (gatewayRef) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          userId: invoice.clientId,
          amount: invoice.total,
          currency: invoice.currency,
          status: 'paid',
          gateway: method ?? 'manual',
          gatewayRef,
        },
      });
    }

    await AuditService.log({ userId: req.user!.userId, action: 'invoice_paid', entity: 'Invoice', entityId: invoice.id, req });
    res.json({ data: invoice });
  }
}
