import './config/env';
import 'express-async-errors';
import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';
import { attachRealtime } from './services/RealtimeService';
import * as Sentry from '@sentry/node';

import { env } from './config/env';
import { corsOriginDelegate } from './utils/frontendOrigins';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './config/logger';
import { requestLogger, forceJson } from './middleware/requestLogger';
import { notFound, errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { startScheduler } from './cron/scheduler';
import { verifySmtpTlsAtStartup } from './services/EmailService';
import { beforeSendScrub, scrubSentryEvent } from './utils/sentryScrub';
import apiRouter from './routes/index';
import { sanitizeForwardedForHeader } from './middleware/clientIp';

// ─── Process-level safety net ────────────────────────────────────────────────
// express-async-errors handles rejections thrown inside route handlers, but this
// catches anything else (cron jobs, socket handlers, stray promises) so a single
// unexpected error can't take down the whole API process.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
});

// ─── Sentry ──────────────────────────────────────────────────────────────────
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    tracesSampleRate: env.isProd ? 0.2 : 1.0,
    integrations: [Sentry.expressIntegration()],
    beforeSend: beforeSendScrub,
    beforeSendTransaction: scrubSentryEvent,
  });
}

// ─── Express app ─────────────────────────────────────────────────────────────
const app = express();

// INJ-04: reject qs bracket/object syntax (`?status[not]=…`) so query values stay scalars.
app.set('query parser', 'simple');

// Behind Nginx/ALB in deployed environments — required for per-client IP rate limits.
// TRUST_PROXY_HOPS must match reverse-proxy hops. Edge must overwrite client XFF
// (see mern/client/nginx.conf + docx/ops/TRUST_PROXY_TOPOLOGY.md). App also strips
// non-IP XFF entries and validates req.ip before audit/rate-limit use (D-02 / INJ-03).
if (env.TRUST_PROXY) {
  const hops = Number.isFinite(env.TRUST_PROXY_HOPS) && env.TRUST_PROXY_HOPS > 0
    ? env.TRUST_PROXY_HOPS
    : 1;
  app.set('trust proxy', hops);
}

const server = http.createServer(app);

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: corsOriginDelegate,
    credentials: true,
  },
});

app.locals.io = io;
attachRealtime(io);

// ─── Global middleware ───────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // A-7: explicit no-referrer so reset/verify tokens in URLs don't leak via Referer header
    referrerPolicy: { policy: 'no-referrer' },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", env.FRONTEND_URL, 'https:'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  }),
);
app.use(cookieParser());
// D-02: drop formula / non-IP XFF hops before trust-proxy + rate limits read them
app.use(sanitizeForwardedForHeader);
app.use(
  cors({
    origin: corsOriginDelegate,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  })
);

// Raw body for Stripe / PayTabs / LiveKit / WhatsApp signature verification
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/api/paytabs/webhook', express.raw({ type: 'application/json' }));
app.use('/api/wallet/paytabs/webhook', express.raw({ type: 'application/json' }));
app.use('/api/livekit/webhook', express.raw({ type: 'application/json' }));
app.use('/api/webhook/whatsapp', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(forceJson);
app.use(requestLogger);
app.use(apiLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─── SPA static file serving (production only) ───────────────────────────────
if (env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  // SPA fallback — return index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Error handling ──────────────────────────────────────────────────────────
app.use(notFound);
if (env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}
app.use(errorHandler);

// ─── Startup ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();
    await connectRedis();

    if (env.NODE_ENV !== 'test') {
      await verifySmtpTlsAtStartup();
      startScheduler();
    }

    server.listen(env.PORT, () => {
      logger.info(`Riayah Plus API running on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logger.error('Bootstrap failed', { message, stack });
    process.exit(1);
  }
}

// ─── Graceful shutdown ───────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
});

bootstrap();

export { app, io };
