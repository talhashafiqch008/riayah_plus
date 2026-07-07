import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${method} ${originalUrl} ${res.statusCode} ${ms}ms`, {
      ip,
      userId: req.user?.userId,
    });
  });

  next();
}

export function forceJson(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Content-Type', 'application/json');
  next();
}
