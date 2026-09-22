import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildDeviceInfo } from '../utils/deviceInfo';
import { redactForAudit } from '../utils/auditRedact';
import { sanitizeClientIp } from '../utils/csvSafe';

interface AuditOptions {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  req?: Request;
}

interface HttpMutationAuditOptions {
  req: Request;
  res: Response;
  durationMs: number;
  entity?: string;
  entityId?: string;
}

function markExplicitAudit(req?: Request): void {
  if (req?.res) {
    req.res.locals.auditLogged = true;
  }
}

function auditContextFromRequest(req?: Request) {
  const deviceInfo = req ? buildDeviceInfo(req) : undefined;
  return {
    // INJ-03: never persist attacker-shaped XFF / formula strings as IP
    ipAddress: sanitizeClientIp(req?.ip) ?? undefined,
    userAgent: deviceInfo?.userAgent ?? req?.headers['user-agent'],
    deviceInfo: deviceInfo as object | undefined,
  };
}

export class AuditService {
  static async log(opts: AuditOptions) {
    markExplicitAudit(opts.req);
    const ctx = auditContextFromRequest(opts.req);

    return prisma.auditLog.create({
      data: {
        userId: opts.userId,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        deviceInfo: ctx.deviceInfo,
        before: opts.before ? (redactForAudit(opts.before) as object) : undefined,
        after: opts.after ? (redactForAudit(opts.after) as object) : undefined,
        metadata: opts.metadata ? (redactForAudit(opts.metadata) as object) : undefined,
      },
    });
  }

  static async logHttpMutation(opts: HttpMutationAuditOptions) {
    const { req, res, durationMs, entity, entityId } = opts;
    const path = req.originalUrl.split('?')[0];
    const action = `http.${req.method.toLowerCase()}`;

    return prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action,
        entity,
        entityId,
        ipAddress: sanitizeClientIp(req.ip) ?? undefined,
        userAgent: req.headers['user-agent'],
        deviceInfo: buildDeviceInfo(req) as object,
        metadata: {
          path,
          method: req.method,
          statusCode: res.statusCode,
          durationMs,
          params: redactForAudit(req.params),
          body: req.body ? redactForAudit(req.body) : undefined,
        } as object,
      },
    });
  }

  static async getAll(filters: {
    userId?: string;
    entity?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    /** Raise the hard take cap (e.g. CSV export). Default 100. */
    maxTake?: number;
  }) {
    const { page = 1, limit = 50, from, to, userId, entity, action, maxTake = 100 } = filters;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), maxTake);
    const skip = (safePage - 1) * safeLimit;

    const where: {
      userId?: string;
      entity?: string;
      action?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page: safePage, limit: safeLimit };
  }
}
