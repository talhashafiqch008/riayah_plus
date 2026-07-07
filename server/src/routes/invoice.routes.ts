import { Router, Request, Response, NextFunction } from 'express';
import { InvoiceController } from '../controllers/billing/InvoiceController';
import { authenticate } from '../middleware/auth';
import { paymentLimiter } from '../middleware/rateLimiter';
import { InvoicePDFService } from '../services/InvoicePDFService';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/', InvoiceController.index);
router.post('/', InvoiceController.store);
router.get('/:id', InvoiceController.show);
router.post('/:id/send', InvoiceController.send);
router.post('/:id/mark-paid', paymentLimiter, InvoiceController.markPaid);

// PDF download / generation
router.get('/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await (await import('../config/database')).prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) throw new AppError('Invoice not found.', 404);

    // Access check: client or admin
    const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);
    if (invoice.clientId !== req.user!.userId && !isAdmin) throw new AppError('Forbidden.', 403);

    // Return existing PDF if already generated
    if (invoice.pdfUrl) { res.json({ success: true, pdfUrl: invoice.pdfUrl }); return; }

    const pdfUrl = await InvoicePDFService.generateAndUpload(req.params.id);
    res.json({ success: true, pdfUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
