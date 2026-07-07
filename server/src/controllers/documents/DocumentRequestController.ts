import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { NotificationService } from '../../services/NotificationService';
import { AppError } from '../../middleware/errorHandler';

const createRequestSchema = z.object({
  targetUserId: z.string(),
  documentType: z.string(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

export class DocumentRequestController {
  // POST /api/document-requests — admin/coordinator requests a document
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createRequestSchema.parse(req.body);

      const request = await prisma.documentRequest.create({
        data: {
          requestedById: req.user!.userId,
          targetUserId: body.targetUserId,
          documentType: body.documentType,
          description: body.description,
          dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
          status: 'pending',
        },
      });

      await NotificationService.create({
        userId: body.targetUserId,
        title: 'Document Required',
        body: `You have been asked to upload a ${body.documentType} document.`,
        type: 'document_request',
        data: { requestId: request.id, documentType: body.documentType },
      });

      res.status(201).json({ success: true, request });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/document-requests — list requests for current user
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const isAdmin = ['admin', 'super_admin', 'care_coordinator'].includes(req.user!.role);

      const requests = await prisma.documentRequest.findMany({
        where: isAdmin ? { requestedById: userId } : { targetUserId: userId },
        include: { requestedBy: { select: { id: true, name: true } }, targetUser: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, requests });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/document-requests/:id/fulfill — user uploads a document against a request
  static async fulfill(req: Request, res: Response, next: NextFunction) {
    try {
      const { documentId } = z.object({ documentId: z.string() }).parse(req.body);
      const request = await prisma.documentRequest.findUnique({ where: { id: req.params.id } });
      if (!request) throw new AppError('Document request not found.', 404);
      if (request.targetUserId !== req.user!.userId) throw new AppError('Forbidden.', 403);

      const updated = await prisma.documentRequest.update({
        where: { id: req.params.id },
        data: { status: 'fulfilled', documentId, fulfilledAt: new Date() },
      });

      await NotificationService.create({
        userId: request.requestedById,
        title: 'Document Received',
        body: `The requested ${request.documentType} document has been uploaded.`,
        type: 'document_fulfilled',
        data: { requestId: request.id },
      });

      res.json({ success: true, request: updated });
    } catch (err) {
      next(err);
    }
  }
}
