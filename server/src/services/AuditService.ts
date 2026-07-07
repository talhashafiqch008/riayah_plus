import { prisma } from '../config/database';
import { Request } from 'express';

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

export class AuditService {
  static async log(opts: AuditOptions) {
    return prisma.auditLog.create({
      data: {
        userId: opts.userId,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        ipAddress: opts.req?.ip,
        userAgent: opts.req?.headers['user-agent'],
        before: opts.before ? (opts.before as object) : undefined,
        after: opts.after ? (opts.after as object) : undefined,
        metadata: opts.metadata as any,
      },
    });
  }

  static async getAll(filters: {
    userId?: string;
    entity?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...where } = filters;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }
}
