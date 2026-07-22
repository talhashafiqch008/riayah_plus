import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { NotificationService } from '../../services/NotificationService';
import { AppError } from '../../middleware/errorHandler';
import { assertTenantOrgAccess } from '../../middleware/tenantAccess';
import { isAdminRole, isCoordinatorRole } from '../../utils/careAccess';

const DOCUMENT_TYPES = [
  'medical_report',
  'referral',
  'prior_assessment',
  'insurance',
  'consent',
  'other',
] as const;

const createRequestSchema = z.object({
  targetUserId: z.string().min(1),
  documentType: z.enum(DOCUMENT_TYPES),
  description: z.string().max(2000).optional(),
  dueDate: z.string().optional(),
});

export class DocumentRequestController {
  // POST /api/document-requests — coordinator/admin only, same-tenant target (Z-6)
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const role = req.user!.role;
      if (!isCoordinatorRole(role) && !isAdminRole(role)) {
        throw new AppError('Care coordinator access required.', 403);
      }

      const body = createRequestSchema.parse(req.body);

      const target = await prisma.user.findUnique({
        where: { id: body.targetUserId },
        select: { id: true, organizationId: true, deletedAt: true },
      });
      if (!target || target.deletedAt) {
        throw new AppError('Target user not found.', 404);
      }

      if (target.organizationId) {
        assertTenantOrgAccess(req, target.organizationId);
      } else {
        // Family accounts may lack user.organizationId — allow if they own a unit in caller tenant.
        const twOrg = req.tenant?.organizationId;
        if (!twOrg && !isAdminRole(role)) {
          throw new AppError('No organization assigned to this account.', 403);
        }
        if (twOrg) {
          const unit = await prisma.careUnit.findFirst({
            where: {
              familyUserId: target.id,
              organizationId: twOrg,
              deletedAt: null,
            },
            select: { id: true },
          });
          if (!unit && !isAdminRole(role)) {
            throw new AppError('Target user is outside your organization.', 403);
          }
        }
      }

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
        body: `You have been asked to upload a ${body.documentType.replace(/_/g, ' ')} document.`,
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
      const role = req.user!.role;
      const isStaff = isCoordinatorRole(role) || isAdminRole(role);

      const requests = await prisma.documentRequest.findMany({
        where: isStaff
          ? {
              OR: [{ requestedById: userId }, { targetUserId: userId }],
            }
          : { targetUserId: userId },
        include: {
          requestedBy: { select: { id: true, name: true } },
          targetUser: { select: { id: true, name: true } },
        },
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
        body: `The requested ${request.documentType.replace(/_/g, ' ')} document has been uploaded.`,
        type: 'document_fulfilled',
      });

      res.json({ success: true, request: updated });
    } catch (err) {
      next(err);
    }
  }
}
