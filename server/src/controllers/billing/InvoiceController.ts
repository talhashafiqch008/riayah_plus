import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';
import { notifyBillingEvent } from '../../services/BillingNotificationService';
import { isAdminRole, isBillingStaffRole, isFamilyRole } from '../../utils/careAccess';
import { normalizeLineItems } from '../../utils/invoiceLineItems';
import { assertInvoiceTransition } from '../../utils/stateMachine';
import { QatariPaymentService } from '../../services/QatariPaymentService';
import { env } from '../../config/env';
import { isAllowedFrontendOrigin } from '../../utils/frontendOrigins';
import { parsePagination } from '../../utils/pagination';
import { queryString } from '../../utils/queryScalar';

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

function generateInvoiceNumber(type: 'invoice' | 'quotation' = 'invoice'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const prefix = type === 'quotation' ? 'QUO' : 'INV';
  return `${prefix}-${timestamp}-${random}`;
}

function calculateTotals(lineItems: z.infer<typeof lineItemSchema>[], taxRate: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

async function assertCanAccessInvoice(
  req: Request,
  invoice: { clientId: string; episodeId: string | null },
): Promise<void> {
  const role = req.user!.role;
  const userId = req.user!.userId;

  if (isAdminRole(role)) return;

  if (isFamilyRole(role)) {
    if (invoice.clientId !== userId) throw new AppError('Invoice not found.', 404);
    return;
  }

  if (isBillingStaffRole(role)) {
    const client = await prisma.user.findUnique({
      where: { id: invoice.clientId },
      select: { organizationId: true },
    });
    const caller = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (!client?.organizationId || client.organizationId !== caller?.organizationId) {
      throw new AppError('Invoice not found.', 404);
    }
    return;
  }

  throw new AppError('Invoice not found.', 404);
}

async function assertCanBillClient(req: Request, clientId: string): Promise<void> {
  const role = req.user!.role;
  if (isAdminRole(role)) return;

  if (!isBillingStaffRole(role)) {
    throw new AppError('Forbidden. Insufficient permissions to create invoices.', 403);
  }

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, organizationId: true },
  });
  if (!client) throw new AppError('Client not found.', 404);

  const caller = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { organizationId: true },
  });
  if (!client.organizationId || client.organizationId !== caller?.organizationId) {
    throw new AppError('Forbidden. Client is not in your organization.', 403);
  }
}

export class InvoiceController {
  static async index(req: Request, res: Response): Promise<void> {
          const { page, limit, skip, take } = parsePagination(req.query);
      const status = queryString(req.query.status);
      const clientId = queryString(req.query.clientId);
      const type = queryString(req.query.type);
    const role = req.user!.role;
    const userId = req.user!.userId;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    if (isFamilyRole(role)) {
      where.clientId = userId;
    } else if (isAdminRole(role)) {
      if (clientId) where.clientId = clientId;
    } else if (isBillingStaffRole(role)) {
      const caller = await prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (!caller?.organizationId) throw new AppError('Organization context required.', 403);
      where.client = { organizationId: caller.organizationId };
      if (clientId) where.clientId = clientId;
    } else {
      throw new AppError('Forbidden.', 403);
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { client: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ data: invoices, total, page, limit });
  }

  static async store(req: Request, res: Response): Promise<void> {
    const data = createInvoiceSchema.parse(req.body);
    await assertCanBillClient(req, data.clientId);
    const lineItems = normalizeLineItems(data.lineItems);

    if (data.currency !== 'QAR' && data.currency !== 'USD') {
      throw new AppError('Unsupported currency. Use QAR or USD.', 400);
    }

    const { subtotal, taxAmount, total } = calculateTotals(lineItems, data.taxRate);

    const invoice = await prisma.invoice.create({
      data: {
        clientId: data.clientId,
        episodeId: data.episodeId,
        sessionId: data.sessionId,
        invoiceNumber: generateInvoiceNumber(data.type),
        type: data.type,
        currency: data.currency,
        taxRate: data.taxRate,
        subtotal,
        taxAmount,
        total,
        notes: data.notes,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        lineItems: lineItems as object,
        status: 'draft',
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'invoice_created',
      entity: 'Invoice',
      entityId: invoice.id,
      after: { clientId: invoice.clientId, total: invoice.total.toString(), currency: invoice.currency },
      req,
    });
    res.status(201).json({ data: invoice });
  }

  static async show(req: Request, res: Response): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: true, payments: true },
    });
    if (!invoice) throw new AppError('Invoice not found.', 404);
    await assertCanAccessInvoice(req, invoice);
    res.json({ data: invoice });
  }

  static async send(req: Request, res: Response): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: true },
    });
    if (!invoice) throw new AppError('Invoice not found.', 404);
    await assertCanAccessInvoice(req, invoice);

    if (isFamilyRole(req.user!.role)) {
      throw new AppError('Forbidden. Only staff can send invoices.', 403);
    }

    if (invoice.status === 'sent') {
      res.json({ data: invoice, message: 'Invoice already sent.' });
      return;
    }

    assertInvoiceTransition(invoice.status, 'sent');

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'sent', sentAt: new Date() },
    });

    await notifyBillingEvent({
      userId: invoice.clientId,
      type: 'invoice_sent',
      title: `Invoice ${invoice.invoiceNumber}`,
      body: `You have a new invoice for ${invoice.currency} ${invoice.total}`,
      data: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.total.toString(),
      currency: invoice.currency,
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'invoice_sent',
      entity: 'Invoice',
      entityId: invoice.id,
      req,
    });

    res.json({ data: updated });
  }

  /** Manual mark-paid — admin only. Gateway payments must use PayTabs webhook. */
  static async markPaid(req: Request, res: Response): Promise<void> {
    if (!isAdminRole(req.user!.role)) {
      throw new AppError('Forbidden. Only admins can manually mark invoices paid.', 403);
    }

    const { gatewayRef, method } = z
      .object({ gatewayRef: z.string().optional(), method: z.string().optional() })
      .parse(req.body);

    const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Invoice not found.', 404);

    if (existing.status === 'paid') {
      res.json({ data: existing, message: 'Invoice already paid.' });
      return;
    }

    assertInvoiceTransition(existing.status, 'paid');

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: 'paid', paidAt: new Date() },
    });

    if (gatewayRef) {
      const dup = await prisma.payment.findFirst({
        where: { gatewayRef, gateway: method ?? 'manual' },
      });
      if (!dup) {
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
    }

    await notifyBillingEvent({
      userId: invoice.clientId,
      type: 'payment_received',
      title: 'Payment received',
      body: `Payment for invoice ${invoice.invoiceNumber} was successful.`,
      data: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, method: method ?? 'manual' },
      invoiceNumber: invoice.invoiceNumber,
      amount: String(invoice.total),
      currency: invoice.currency,
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'invoice_paid_manual',
      entity: 'Invoice',
      entityId: invoice.id,
      after: { gatewayRef, method },
      req,
    });
    res.json({ data: invoice });
  }

  /** POST /api/invoices/:id/pay — family PayTabs checkout */
  static async pay(req: Request, res: Response): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: { select: { id: true, name: true, email: true, phone: true } } },
    });
    if (!invoice) throw new AppError('Invoice not found.', 404);
    await assertCanAccessInvoice(req, invoice);

    if (!isFamilyRole(req.user!.role) && !isAdminRole(req.user!.role)) {
      throw new AppError('Forbidden. Only the billed family can pay this invoice.', 403);
    }
    if (isFamilyRole(req.user!.role) && invoice.clientId !== req.user!.userId) {
      throw new AppError('Forbidden.', 403);
    }
    if (invoice.type === 'quotation') {
      throw new AppError('Quotations cannot be paid. Wait for the service invoice.', 400);
    }
    if (invoice.status === 'paid') {
      res.json({ success: true, alreadyPaid: true, invoiceId: invoice.id });
      return;
    }
    if (invoice.status === 'cancelled') {
      throw new AppError('This invoice is cancelled.', 400);
    }
    if (!['sent', 'overdue', 'disputed'].includes(invoice.status)) {
      throw new AppError('Invoice must be sent before it can be paid.', 422);
    }

    const existingPending = await prisma.payment.findFirst({
      where: { invoiceId: invoice.id, gateway: 'paytabs', status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    if (existingPending?.gatewayRef) {
      const stored = existingPending.gatewayResponse as { redirectUrl?: string } | null;
      if (stored?.redirectUrl) {
        res.json({
          success: true,
          gateway: 'paytabs',
          paymentUrl: stored.redirectUrl,
          reference: existingPending.gatewayRef,
          reusedPending: true,
        });
        return;
      }
    }

    const requestedReturn =
      typeof req.body?.returnUrl === 'string' ? req.body.returnUrl : '';
    const returnUrl = isAllowedFrontendOrigin(requestedReturn)
      ? requestedReturn
      : `${env.FRONTEND_URL.replace(/\/$/, '')}/family/billing/${invoice.id}`;

    const result = await QatariPaymentService.initiatePayment({
      invoiceId: invoice.id,
      amount: Number(invoice.total),
      currency: invoice.currency || 'QAR',
      description: `Invoice ${invoice.invoiceNumber}`,
      customerName: invoice.client.name,
      customerEmail: invoice.client.email,
      customerPhone: invoice.client.phone ?? undefined,
      returnUrl,
      callbackUrl: `${env.BACKEND_URL}/api/wallet/paytabs/webhook`,
    });

    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        userId: invoice.clientId,
        amount: invoice.total,
        currency: invoice.currency,
        status: 'pending',
        gateway: 'paytabs',
        gatewayRef: result.transactionRef,
        gatewayResponse: { redirectUrl: result.redirectUrl },
        description: `PayTabs checkout ${invoice.invoiceNumber}`,
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'invoice_pay_initiated',
      entity: 'Invoice',
      entityId: invoice.id,
      after: { gateway: 'paytabs', reference: result.transactionRef },
      req,
    });

    res.json({
      success: true,
      gateway: 'paytabs',
      paymentUrl: result.redirectUrl,
      reference: result.transactionRef,
    });
  }

  /** POST /api/invoices/:id/pay/confirm — family return from PayTabs hosted page */
  static async confirmPay(req: Request, res: Response): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      select: { id: true, clientId: true, episodeId: true, status: true },
    });
    if (!invoice) throw new AppError('Invoice not found.', 404);
    await assertCanAccessInvoice(req, invoice);

    if (!isFamilyRole(req.user!.role) && !isAdminRole(req.user!.role)) {
      throw new AppError('Forbidden.', 403);
    }
    if (isFamilyRole(req.user!.role) && invoice.clientId !== req.user!.userId) {
      throw new AppError('Forbidden.', 403);
    }

    const result = await QatariPaymentService.confirmInvoicePayment(invoice.id);
    const latest = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    res.json({ success: true, ...result, data: latest });
  }

  /** POST /api/invoices/:id/dispute — family or staff */
  static async dispute(req: Request, res: Response): Promise<void> {
    const { notes } = z.object({ notes: z.string().max(2000).optional() }).parse(req.body ?? {});
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) throw new AppError('Invoice not found.', 404);
    await assertCanAccessInvoice(req, invoice);

    if (invoice.status === 'disputed') {
      res.json({ data: invoice, message: 'Invoice already disputed.' });
      return;
    }

    assertInvoiceTransition(invoice.status, 'disputed');

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'disputed',
        notes: notes
          ? `${invoice.notes ? `${invoice.notes}\n` : ''}Dispute: ${notes}`
          : invoice.notes,
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'invoice_disputed',
      entity: 'Invoice',
      entityId: invoice.id,
      after: { notes },
      req,
    });

    res.json({ data: updated, message: 'Invoice marked as disputed.' });
  }
}
