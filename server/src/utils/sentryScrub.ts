import type { ErrorEvent, Event } from '@sentry/node';
import { redactForAudit } from './auditRedact';

/** Strip PHI/PII from Sentry events before upload (G7 / HP12). */
export function scrubSentryEvent<T extends Event>(event: T): T | null {
  if (event.request) {
    if (event.request.headers) {
      const headers = { ...event.request.headers };
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'cookie') {
          headers[key] = '[REDACTED]';
        }
      }
      event.request.headers = headers;
    }
    if (event.request.data) {
      try {
        const raw = event.request.data;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        event.request.data = JSON.stringify(redactForAudit(parsed));
      } catch {
        event.request.data = '[REDACTED]';
      }
    }
    if (event.request.query_string && typeof event.request.query_string === 'string') {
      event.request.query_string = '[REDACTED]';
    }
  }

  if (event.extra) {
    event.extra = redactForAudit(event.extra) as Record<string, unknown>;
  }
  if (event.contexts) {
    event.contexts = redactForAudit(event.contexts) as typeof event.contexts;
  }

  return event;
}

export function beforeSendScrub(event: ErrorEvent): ErrorEvent | null {
  return scrubSentryEvent(event) as ErrorEvent | null;
}
