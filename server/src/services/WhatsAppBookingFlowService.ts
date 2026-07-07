import { prisma } from '../config/database';
import { WhatsAppService } from './WhatsAppService';
import { NotificationService } from './NotificationService';
import { logger } from '../config/logger';

/**
 * State-machine for WhatsApp-driven booking flow.
 * Sessions are stored in the `whatsAppSessions` table keyed by phone number.
 * 
 * States:
 *   WELCOME → SELECT_SERVICE → ENTER_DATE → SELECT_PROVIDER → CONFIRM → DONE
 */

type SessionState = 'WELCOME' | 'SELECT_SERVICE' | 'ENTER_DATE' | 'SELECT_PROVIDER' | 'CONFIRM' | 'DONE';

interface SessionData {
  state: SessionState;
  serviceType?: string;
  date?: string;
  providerId?: string;
  clientId?: string;
  providersCache?: string;
}

export class WhatsAppBookingFlowService {
  static async handleInbound(phone: string, messageBody: string, messageType: string): Promise<void> {
    const normalised = phone.replace(/\D/g, '');

    // Find user by phone
    const user = await prisma.user.findFirst({ where: { phone: { contains: normalised.slice(-9) } } });
    if (!user) {
      await WhatsAppService.sendText(phone, 'Welcome to Riayah Plus! Please register at https://riayahplus.com to use this service.');
      return;
    }

    // Load or create session
    let sessionRecord = await prisma.whatsAppSession.findUnique({ where: { phone } });
    let session: SessionData = sessionRecord
      ? (sessionRecord.data as unknown as SessionData)
      : { state: 'WELCOME', clientId: user.id };

    const text = messageBody.trim().toLowerCase();

    // Handle reset keyword
    if (text === 'menu' || text === 'start' || text === 'hi' || text === 'hello') {
      session = { state: 'WELCOME', clientId: user.id };
    }

    session = await WhatsAppBookingFlowService.processState(phone, session, text, messageType);

    await prisma.whatsAppSession.upsert({
      where: { phone },
      create: { phone, data: session as object, userId: user.id },
      update: { data: session as object, updatedAt: new Date() },
    });
  }

  private static async processState(
    phone: string,
    session: SessionData,
    text: string,
    messageType: string
  ): Promise<SessionData> {
    switch (session.state) {
      case 'WELCOME': {
        await WhatsAppService.sendInteractive(
          phone,
          '🏥 Riayah Plus',
          'Welcome! What would you like to do?',
          [
            { id: 'book_service', title: '📅 Book a Service' },
            { id: 'my_bookings', title: '📋 My Bookings' },
            { id: 'emergency', title: '🚨 Emergency Help' },
          ]
        );
        return { ...session, state: 'SELECT_SERVICE' };
      }

      case 'SELECT_SERVICE': {
        if (text.includes('book') || text === 'book_service') {
          await WhatsAppService.sendInteractive(
            phone,
            '🏥 Book a Service',
            'Please select the type of care you need:',
            [
              { id: 'nursing', title: '👩‍⚕️ Nursing' },
              { id: 'physiotherapy', title: '🦴 Physiotherapy' },
              { id: 'home_care', title: '🏠 Home Care' },
            ]
          );
          return { ...session, state: 'SELECT_SERVICE' };
        }

        if (text === 'my_bookings') {
          const bookings = await prisma.booking.findMany({
            where: { clientId: session.clientId, status: { in: ['pending', 'accepted', 'in_progress'] } },
            take: 3,
            orderBy: { scheduledAt: 'asc' },
          });

          const msg = bookings.length > 0
            ? bookings.map(b => `• ${b.serviceType ?? 'Service'} — ${b.scheduledAt?.toLocaleDateString('en-QA') ?? 'TBD'} (${b.status})`).join('\n')
            : 'You have no upcoming bookings.';

          await WhatsAppService.sendText(phone, `📋 *Your Bookings:*\n${msg}\n\nReply *menu* to return.`);
          return { ...session, state: 'WELCOME' };
        }

        if (text === 'emergency') {
          await WhatsAppService.sendText(phone, '🚨 Emergency alert sent! Our care coordinator will contact you shortly. If this is life-threatening, call 999.');
          // Create emergency record
          if (session.clientId) {
            await prisma.emergencyRequest.create({
              data: { clientId: session.clientId, description: 'Emergency raised via WhatsApp', status: 'pending' },
            });
          }
          return { ...session, state: 'WELCOME' };
        }

        // Service type selected
        const serviceTypes: Record<string, string> = {
          nursing: 'nursing',
          physiotherapy: 'physiotherapy',
          home_care: 'home_care',
          'home care': 'home_care',
        };
        const serviceType = serviceTypes[text];
        if (serviceType) {
          await WhatsAppService.sendText(phone, `You selected *${text}*. Please enter your preferred date (e.g. *15/07/2026*):` );
          return { ...session, state: 'ENTER_DATE', serviceType };
        }

        await WhatsAppService.sendText(phone, 'Please select a valid option or reply *menu* to start over.');
        return session;
      }

      case 'ENTER_DATE': {
        // Parse date like DD/MM/YYYY or MM/DD/YYYY
        const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (dateMatch) {
          const date = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
          const providers = await prisma.user.findMany({
            where: { role: session.serviceType as any, verificationStatus: 'verified', deletedAt: null },
            select: { id: true, name: true },
            take: 3,
          });

          if (providers.length === 0) {
            await WhatsAppService.sendText(phone, `No verified providers found for *${session.serviceType}* on that date. Please try a different date or contact support.`);
            return { ...session, state: 'ENTER_DATE' };
          }

          const providerList = providers.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
          await WhatsAppService.sendText(phone, `Available providers for *${date}*:\n${providerList}\n\nReply with the provider's number (1, 2, or 3):`);

          return { ...session, state: 'SELECT_PROVIDER', date, providersCache: JSON.stringify(providers) };
        }

        await WhatsAppService.sendText(phone, 'Please enter a valid date in DD/MM/YYYY format.');
        return session;
      }

      case 'SELECT_PROVIDER': {
        const idx = parseInt(text) - 1;
        const cached = session.providersCache;
        const providers: { id: string; name: string }[] = cached ? JSON.parse(cached as string) : [];

        if (idx >= 0 && idx < providers.length) {
          const provider = providers[idx];
          await WhatsAppService.sendInteractive(
            phone,
            '✅ Confirm Booking',
            `Service: *${session.serviceType}*\nDate: *${session.date}*\nProvider: *${provider.name}*\n\nConfirm your booking?`,
            [
              { id: 'confirm_yes', title: '✅ Yes, Book' },
              { id: 'confirm_no', title: '❌ Cancel' },
            ]
          );
          return { ...session, state: 'CONFIRM', providerId: provider.id };
        }

        await WhatsAppService.sendText(phone, 'Please reply with a valid provider number.');
        return session;
      }

      case 'CONFIRM': {
        if (text.includes('yes') || text === 'confirm_yes') {
          if (session.clientId && session.providerId && session.date) {
            const booking = await prisma.booking.create({
              data: {
                clientId: session.clientId,
                providerId: session.providerId,
                serviceType: session.serviceType ?? 'general',
                scheduledAt: new Date(session.date),
                status: 'pending',
                notes: 'Booked via WhatsApp',
              },
            });

            await NotificationService.create({
              userId: session.providerId,
              title: 'New WhatsApp Booking',
              body: `A client has booked via WhatsApp. Service: ${session.serviceType}`,
              type: 'new_booking',
              data: { bookingId: booking.id },
            });

            await WhatsAppService.sendText(phone, `🎉 *Booking Confirmed!*\n\nBooking ID: ${booking.id}\nService: ${session.serviceType}\nDate: ${session.date}\n\nYou'll receive a confirmation shortly. Reply *menu* to start over.`);
          }
          return { state: 'WELCOME', clientId: session.clientId };
        }

        await WhatsAppService.sendText(phone, 'Booking cancelled. Reply *menu* to start over.');
        return { state: 'WELCOME', clientId: session.clientId };
      }

      default:
        return { state: 'WELCOME', clientId: session.clientId };
    }
  }
}
