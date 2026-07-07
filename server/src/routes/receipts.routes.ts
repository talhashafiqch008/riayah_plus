import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import controller from '../controllers/ReceiptController';

const router = Router();

router.use(authenticate);

router.get('/topup/:topupId', controller.topupReceipt.bind(controller));
router.get('/payout/:payoutId', controller.payoutReceipt.bind(controller));

export default router;
