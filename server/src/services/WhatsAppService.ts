import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';

export class WhatsAppService {
  static async sendText(phone: string, message: string): Promise<void> {
    try {
      await axios.post(
        `${env.WHATSAPP_BASE_URL}/${env.WHATSAPP_PHONE_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (err) {
      logger.error('WhatsApp send failed', {
        phoneLast4: phone.slice(-4),
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  static async sendInteractive(
    phone: string,
    header: string,
    body: string,
    buttons: { id: string; title: string }[]
  ): Promise<void> {
    await axios.post(
      `${env.WHATSAPP_BASE_URL}/${env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: { type: 'text', text: header },
          body: { text: body },
          action: { buttons: buttons.map((b) => ({ type: 'reply', reply: b })) },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
