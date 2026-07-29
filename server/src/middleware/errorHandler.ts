import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, detailsOrOperational?: unknown, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    // Back-compat: third arg was boolean isOperational
    if (typeof detailsOrOperational === 'boolean') {
      this.isOperational = detailsOrOperational;
    } else {
      this.details = detailsOrOperational;
      this.isOperational = isOperational;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found.` });
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    const flattened = err.flatten();
    res.status(400).json({
      message: 'Validation failed.',
      errors: flattened.fieldErrors,
      formErrors: flattened.formErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { errorId: err.name, statusCode: err.statusCode });
    }
    const body: { message: string; details?: unknown } = { message: err.message };
    if (err.details !== undefined) body.details = err.details;
    res.status(err.statusCode).json(body);
    return;
  }

  // G-24: do not write stack traces into application logs
  logger.error('Unhandled error', { message: err.message, name: err.name });
  if (process.env.NODE_ENV !== 'production') {
    // Dev-only console for debugging — not persisted as structured app log PII
    console.error(err);
  }
  res.status(500).json({ message: 'Internal server error.' });
}
