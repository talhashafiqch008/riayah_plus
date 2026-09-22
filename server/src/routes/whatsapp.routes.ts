import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { WhatsAppService } from '../services/WhatsAppService';
import { WhatsAppBookingFlowService } from '../services/WhatsAppBookingFlowService';
import { webhookLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import {
  parseWhatsAppRawBody,
  verifyWhatsAppSignature,
} from '../middleware/whatsappSignature';
import { sanitizePlainText } from '../utils/sanitize';
import { parsePagination } from '../utils/pagination';
import { logger } from '../config/logger';

const router = Router();

// Webhook verification (GET)
router.get('/', webhookLimiter, (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Webhook handler (POST) — INJ-10: require Meta X-Hub-Signature-256 over raw body
router.post('/', webhookLimiter, verifyWhatsAppSignature, async (req: Request, res: Response) => {
  let body: {
    entry?: Array<{
      changes?: Array<{
        value?: { messages?: Array<Record<string, unknown>> };
      }>;
    }>;
  };
  try {
    body = parseWhatsAppRawBody(req) as typeof body;
  } catch {
    res.sendStatus(400);
    return;
  }

  res.sendStatus(200); // Always respond 200 immediately after auth

  try {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0] as
      | {
          from?: string;
          id?: string;
          type?: string;
          text?: { body?: string };
        }
      | undefined;

    if (!message?.from || !message.id || !message.type) return;

    const phone = String(message.from).slice(0, 32);
    const rawText = message.type === 'text' ? message.text?.body : null;
    const text =
      typeof rawText === 'string' ? sanitizePlainText(rawText).slice(0, 4000) : null;

    await prisma.whatsAppMessage.create({
      data: {
        phone,
        direction: 'inbound',
        messageId: String(message.id).slice(0, 128),
        type: String(message.type).slice(0, 64),
        content: text,
        status: 'received',
        metadata: message as object,
      },
    });

    await prisma.whatsAppConversation.upsert({
      where: { phone },
      create: { phone, state: 'idle', context: {} },
      update: {},
    });

    await WhatsAppBookingFlowService.handleInbound(phone, text ?? message.type, message.type);
  } catch (err) {
    logger.error('WhatsApp webhook error', {
      err: err instanceof Error ? err.message : String(err),
    });
  }
});

// ── Authenticated WhatsApp API routes ─────────────────────────────────────────

// GET /api/whatsapp/messages — user's own inbound/outbound message history
router.get('/messages', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { phone: true } });
    if (!user?.phone) { res.json({ success: true, messages: [] }); return; }

    const phone = user.phone.replace(/\D/g, '');
    const messages = await prisma.whatsAppMessage.findMany({
      where: { phone: { contains: phone.slice(-9) } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, messages });
  } catch (err) {
    next(err);
  }
});

// POST /api/whatsapp/send-template — outbound appointment reminder template
router.post('/send-template', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, type, data } = z.object({
      phone: z.string(),
      type: z.enum(['appointment_reminder', 'booking_confirmed', 'payment_received', 'care_summary']),
      data: z.record(z.string()).optional(),
    }).parse(req.body);

    const templates: Record<string, string> = {
      appointment_reminder: `📅 *Appointment Reminder*\nYour appointment is scheduled for ${data?.date ?? 'soon'}. Please be ready.\n\nRiayah Plus`,
      booking_confirmed: `✅ *Booking Confirmed*\nYour booking #${data?.bookingId ?? ''} has been confirmed.\n\nRiayah Plus`,
      payment_received: `💰 *Payment Received*\nWe received your payment of ${data?.amount ?? ''} ${data?.currency ?? 'QAR'}.\n\nRiayah Plus`,
      care_summary: `📋 *Care Summary Ready*\nYour care summary for episode #${data?.episodeId ?? ''} is available. Log in to view.\n\nRiayah Plus`,
    };

    await WhatsAppService.sendText(phone, templates[type]);
    await prisma.whatsAppMessage.create({
      data: { phone, direction: 'outbound', type: 'template', content: templates[type], status: 'sent', metadata: { templateType: type, data } },
    });

    res.json({ success: true, message: 'Template sent.' });
  } catch (err) {
    next(err);
  }
});

// ── Admin WhatsApp routes ──────────────────────────────────────────────────────

// GET /api/whatsapp/admin/conversations — all conversations browser
router.get('/admin/conversations', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const [conversations, total] = await Promise.all([
      prisma.whatsAppConversation.findMany({ orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.whatsAppConversation.count(),
    ]);
    res.json({ success: true, conversations, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// POST /api/whatsapp/admin/messages/search — lookup by phone in body (G-23: no PII in URL)
router.post('/admin/messages/search', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = z.object({ phone: z.string().min(5) }).parse(req.body);
    const messages = await prisma.whatsAppMessage.findMany({
      where: { phone },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, messages });
  } catch (err) {
    next(err);
  }
});

// Legacy path kept temporarily — redirects clients to body-based search without echoing phone in new APIs
router.get('/admin/messages/:phone', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(410).json({
      message: 'This endpoint is deprecated because phone numbers must not appear in URLs. Use POST /api/whatsapp/admin/messages/search with { phone }.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/whatsapp/admin/send — admin sends a message to any phone
router.post('/admin/send', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, message } = z.object({ phone: z.string(), message: z.string().min(1) }).parse(req.body);
    await WhatsAppService.sendText(phone, message);
    await prisma.whatsAppMessage.create({
      data: { phone, direction: 'outbound', type: 'text', content: message, status: 'sent', metadata: { sentBy: req.user!.userId } },
    });
    res.json({ success: true, message: 'Message sent.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/whatsapp/messages/stats — admin message stats
router.get('/messages/stats', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [total, inbound, outbound, todayCount] = await Promise.all([
      prisma.whatsAppMessage.count(),
      prisma.whatsAppMessage.count({ where: { direction: 'inbound' } }),
      prisma.whatsAppMessage.count({ where: { direction: 'outbound' } }),
      prisma.whatsAppMessage.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
    ]);
    const uniquePhones = await prisma.whatsAppMessage.groupBy({ by: ['phone'], _count: true });
    res.json({ data: { total, inbound, outbound, today: todayCount, uniqueConversations: uniquePhones.length } });
  } catch (err) {
    next(err);
  }
});

// GET /api/whatsapp/messages/:id — single message
router.get('/messages/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const msg = await prisma.whatsAppMessage.findUnique({ where: { id: req.params.id } });
    if (!msg) { res.status(404).json({ error: 'Message not found' }); return; }
    res.json({ data: msg });
  } catch (err) {
    next(err);
  }
});

// POST /api/whatsapp/send-welcome — send welcome template
router.post('/send-welcome', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, name } = z.object({ phone: z.string(), name: z.string() }).parse(req.body);
    const message = `Welcome to Raiyah, ${name}! We're here to help you find quality care. Reply HELP for assistance.`;
    await WhatsAppService.sendText(phone, message);
    await prisma.whatsAppMessage.create({
      data: { phone, direction: 'outbound', type: 'template', content: message, status: 'sent', metadata: { template: 'welcome', name } },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/whatsapp/send-interactive — send interactive template
router.post('/send-interactive', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, body, buttons } = z.object({
      phone: z.string(),
      body: z.string(),
      buttons: z.array(z.object({ id: z.string(), title: z.string() })).max(3),
    }).parse(req.body);
    await WhatsAppService.sendText(phone, body);
    await prisma.whatsAppMessage.create({
      data: { phone, direction: 'outbound', type: 'interactive', content: body, status: 'sent', metadata: { buttons } },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
