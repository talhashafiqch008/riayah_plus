/**
 * Creates a fresh Express app instance for integration tests.
 * External I/O (Stripe, WhatsApp, S3, Redis) is mocked by default.
 */
import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { json } from 'express';
import { apiRouter } from '../../routes';
import { errorHandler } from '../../middleware/errorHandler';

let app: express.Application | null = null;

export function getTestApp(): express.Application {
  if (app) return app;

  app = express();
  // Match production INJ-04 control
  app.set('query parser', 'simple');
  app.use(helmet());
  app.use(cors());
  app.use(json());
  app.use('/api', apiRouter);
  app.use(errorHandler);

  return app;
}

export function resetTestApp(): void {
  app = null;
}
