import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { z } from 'zod';
import { parsePagination } from '../../utils/pagination';
import { queryString } from '../../utils/queryScalar';

const reportSchema = z.object({
  clientId: z.string().optional(),
  bookingId: z.string().optional(),
  episodeId: z.string().optional(),
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(['progress', 'incident', 'assessment', 'care_summary', 'discharge']).default('progress'),
});

export class ProviderReportController {
  // GET /provider/reports
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
            const { page, limit, skip, take } = parsePagination(req.query);
      const type = queryString(req.query.type);
      const where: Record<string, unknown> = { providerId };
      if (type) where.type = type;

      const [reports, total] = await Promise.all([
        prisma.clientReport.findMany({
          where,
          skip,
          take,
          include: { client: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.clientReport.count({ where }),
      ]);
      res.json({ data: reports, meta: { total, page, limit } });
    } catch (err) {
      next(err);
    }
  }

  // POST /provider/reports
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const parsed = reportSchema.parse(req.body);
      const report = await prisma.clientReport.create({
        data: {
          providerId,
          clientId: parsed.clientId,
          bookingId: parsed.bookingId,
          title: parsed.title,
          content: parsed.content,
          type: parsed.type,
          status: 'submitted',
        },
      });
      res.status(201).json({ data: report });
    } catch (err) {
      next(err);
    }
  }

  // GET /provider/reports/:id
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { id } = req.params;
      const report = await prisma.clientReport.findFirst({
        where: { id, providerId },
        include: { client: { select: { id: true, name: true } } },
      });
      if (!report) throw new AppError('Report not found', 404);
      res.json({ data: report });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /provider/reports/:id
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { id } = req.params;
      const report = await prisma.clientReport.findFirst({ where: { id, providerId } });
      if (!report) throw new AppError('Report not found', 404);
      if (report.status === 'approved') throw new AppError('Cannot delete an approved report', 400);
      await prisma.clientReport.delete({ where: { id } });
      res.json({ message: 'Report deleted' });
    } catch (err) {
      next(err);
    }
  }
}

export default new ProviderReportController();
