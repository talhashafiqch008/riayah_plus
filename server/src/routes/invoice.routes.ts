import { Router, Request, Response, NextFunction } from 'express';
import { InvoiceController } from '../controllers/billing/InvoiceController';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireCareCoordinator } from '../middleware/rbac';
import { paymentLimiter } from '../middleware/rateLimiter';
import { InvoicePDFService } from '../services/InvoicePDFService';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../config/database';
import { isAdminRole, isBillingStaffRole, isFamilyRole } from '../utils/careAccess';

const router = Router();
router.use(authenticate);

router.get('/', InvoiceController.index);
router.post('/', requireCareCoordinator, InvoiceController.store);
router.get('/:id', InvoiceController.show);
router.post('/:id/send', requireCareCoordinator, InvoiceController.send);
router.post('/:id/mark-paid', requireAdmin, paymentLimiter, InvoiceController.markPaid);
router.post('/:id/pay', paymentLimiter, InvoiceController.pay);
router.post('/:id/pay/confirm', paymentLimiter, InvoiceController.confirmPay);
router.post('/:id/dispute', InvoiceController.dispute);

router.get('/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) throw new AppError('Invoice not found.', 404);

    const role = req.user!.role;
    const userId = req.user!.userId;

    if (isAdminRole(role)) {
      // ok
    } else if (isFamilyRole(role)) {
      if (invoice.clientId !== userId) throw new AppError('Invoice not found.', 404);
    } else if (isBillingStaffRole(role)) {
      const [client, caller] = await Promise.all([
        prisma.user.findUnique({ where: { id: invoice.clientId }, select: { organizationId: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } }),
      ]);
      if (!client?.organizationId || client.organizationId !== caller?.organizationId) {
        throw new AppError('Invoice not found.', 404);
      }
    } else {
      throw new AppError('Invoice not found.', 404);
    }

    const pdfBuffer = await InvoicePDFService.generatePdfBuffer(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber || 'document'}.pdf"`,
    );
    res.status(200).send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

export default router;
