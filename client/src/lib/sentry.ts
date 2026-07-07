/**
 * Sentry Configuration for Next.js
 * Frontend error tracking
 */

import * as Sentry from '@sentry/react';

export function initializeSentry() {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN || '',

        // Environment
        environment: process.env.NODE_ENV || 'development',

        // Release version
        release: import.meta.env.VITE_APP_VERSION || '1.0.0',

        // Performance Monitoring
        tracesSampleRate: 0.1,

        // Replay Sessions
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Error filtering
        beforeSend(event, hint) {
            // Filter out certain errors
            const error = hint.originalException;

            // Don't send network errors
            if (error && error.toString().includes('NetworkError')) {
                return null;
            }

            return event;
        },

        // Custom tags
        initialScope: {
            tags: {
                platform: 'raiyah-plus',
                component: 'web-portal',
            },
        },
    });
}

/**
 * Capture exception with context
 */
export function captureException(
    error: Error,
    context?: {
        userId?: string;
        page?: string;
        action?: string;
        metadata?: Record<string, any>;
    }
) {
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
