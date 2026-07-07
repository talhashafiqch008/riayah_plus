import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class AdminDocumentController {
  // GET /admin/documents/pending
  async listPending(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', type } = req.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where: Record<string, unknown> = { status: 'pending' };
      if (type) where.type = type;

      const [docs, total] = await Promise.all([
        prisma.document.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.document.count({ where }),
      ]);
      res.json({ data: docs, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/documents/statistics
  async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const [total, pending, approved, rejected, expired] = await Promise.all([
        prisma.document.count(),
        prisma.document.count({ where: { status: 'pending' } }),
        prisma.document.count({ where: { status: 'approved' } }),
        prisma.document.count({ where: { status: 'rejected' } }),
        prisma.document.count({ where: { status: 'expired' } }),
      ]);
      res.json({ data: { total, pending, approved, rejected, expired } });
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/documents/:id/approve
  async approveDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) throw new AppError('Document not found', 404);
      if (doc.status !== 'pending') throw new AppError('Document is not pending review', 400);

      const updated = await prisma.document.update({
        where: { id },
        data: { status: 'approved', verifiedAt: new Date(), verifierId: req.user!.userId },
      });
      res.json({ data: updated, message: 'Document approved' });
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/documents/:id/reject
  async rejectDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) throw new AppError('Document not found', 404);

      const updated = await prisma.document.update({
        where: { id },
        data: { status: 'rejected', rejectionNotes: reason },
      });
      res.json({ data: updated, message: 'Document rejected' });
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/documents/:id/verify
  async verifyDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) throw new AppError('Document not found', 404);

      const updated = await prisma.document.update({
        where: { id },
        data: { status: 'approved', verifiedAt: new Date(), verifierId: req.user!.userId },
      });
      res.json({ data: updated, message: 'Document verified' });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/document-requests
  async listDocumentRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', status } = req.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where: Record<string, unknown> = {};
      if (status) where.status = status;

      const [requests, total] = await Promise.all([
        prisma.documentRequest.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            requestedBy: { select: { id: true, name: true, email: true } },
            targetUser: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.documentRequest.count({ where }),
      ]);
      res.json({ data: requests, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/document-requests/pending
  async listPendingDocumentRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const requests = await prisma.documentRequest.findMany({
        where: { status: 'pending' },
        include: {
          requestedBy: { select: { id: true, name: true, email: true } },
          targetUser: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      res.json({ data: requests });
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/document-requests/:id/approve
  async approveDocumentRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const request = await prisma.documentRequest.findUnique({ where: { id } });
      if (!request) throw new AppError('Document request not found', 404);
      const updated = await prisma.documentRequest.update({
        where: { id },
        data: { status: 'approved', fulfilledAt: new Date() },
      });
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/document-requests/:id/reject
  async rejectDocumentRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const request = await prisma.documentRequest.findUnique({ where: { id } });
      if (!request) throw new AppError('Document request not found', 404);
      const updated = await prisma.documentRequest.update({
        where: { id },
        data: { status: 'rejected', notes: reason },
      });
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
}

export default new AdminDocumentController();
