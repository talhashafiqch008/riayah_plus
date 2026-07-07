// Load test env before anything else
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Silence logger output during tests
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Silence Sentry
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn(),
  Handlers: { requestHandler: () => (_req: unknown, _res: unknown, next: () => void) => next(), errorHandler: () => (_err: unknown, _req: unknown, _res: unknown, next: () => void) => next() },
}));

// Silence Firebase
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  messaging: () => ({ send: jest.fn().mockResolvedValue('mock-message-id'), sendMulticast: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0, responses: [] }) }),
}));

// Keep test timeouts reasonable
jest.setTimeout(15000);
