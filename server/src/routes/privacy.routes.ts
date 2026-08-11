import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { PrivacyController } from '../controllers/privacy/PrivacyController';
import { DocumentRequestController } from '../controllers/documents/DocumentRequestController';
import { EmergencyController } from '../controllers/emergency/EmergencyController';

const router = Router();
router.use(authenticate);

// GDPR / privacy
router.post('/privacy/data-export', PrivacyController.requestDataExport);
router.post('/privacy/data-export/:id/download', PrivacyController.downloadDataExport);
router.post('/privacy/delete-account', PrivacyController.requestAccountDeletion);
router.post('/privacy/restrict-processing', PrivacyController.restrictProcessing);
router.get('/privacy/consents', PrivacyController.listConsents);
router.get('/privacy/requests', PrivacyController.listRequests);

// Document requests
router.post('/document-requests', DocumentRequestController.create);
router.get('/document-requests', DocumentRequestController.list);
router.patch('/document-requests/:id/fulfill', DocumentRequestController.fulfill);

// Emergency
router.post('/emergency', EmergencyController.raise);
router.get('/emergency', EmergencyController.list);
router.post('/emergency/:id/respond', EmergencyController.respond);

export default router;
