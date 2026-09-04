/**
 * Sentry Configuration — gated behind cookie consent (G7 / HP12).
 */

import * as Sentry from '@sentry/react';

let sentryInitialized = false;

function analyticsConsented(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as unknown as { __RAIYAH_ANALYTICS__?: boolean }).__RAIYAH_ANALYTICS__ === true;
}

export function initializeSentryIfConsented(): void {
  if (sentryInitialized) return;
  if (import.meta.env.MODE !== 'production') return;
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  if (!analyticsConsented()) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,

    environment: import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    tracesSampleRate: 0.1,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    beforeSend(event) {
      if (event.request?.headers) {
        const headers = { ...event.request.headers };
        for (const key of Object.keys(headers)) {
          if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'cookie') {
            headers[key] = '[REDACTED]';
          }
        }
        event.request.headers = headers;
      }
      return event;
    },

    initialScope: {
      tags: {
        platform: 'raiyah-plus',
        component: 'web-portal',
      },
    },
  });

  sentryInitialized = true;
}

/** @deprecated use initializeSentryIfConsented */
export function initializeSentry(): void {
  initializeSentryIfConsented();
}

export function captureException(
  error: Error,
  context?: {
    userId?: string;
    page?: string;
    action?: string;
    metadata?: Record<string, unknown>;
  },
) {
  if (!sentryInitialized) return;

  Sentry.withScope((scope) => {
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }
    if (context?.page) {
      scope.setTag('page', context.page);
    }
    if (context?.action) {
      scope.setTag('action', context.action);
    }
    if (context?.metadata) {
      scope.setContext('metadata', context.metadata);
    }
    Sentry.captureException(error);
  });
}
