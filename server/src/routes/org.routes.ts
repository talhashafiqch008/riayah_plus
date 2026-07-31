import { Router } from 'express';
import { OrgPortalController } from '../controllers/org/OrgPortalController';
import { authenticate } from '../middleware/auth';
import { requireOrgAdmin } from '../middleware/rbac';
import { attachTenantContext } from '../middleware/tenantScope';

const router = Router();

router.use(authenticate);
router.use(attachTenantContext);
router.use(requireOrgAdmin);

router.get('/dashboard', OrgPortalController.dashboard);
router.get('/nav-badges', OrgPortalController.navBadges);

router.get('/coordinators', OrgPortalController.listCoordinators);
router.post('/coordinators', OrgPortalController.createCoordinator);
router.patch('/coordinators/:id', OrgPortalController.updateCoordinator);
router.post('/coordinators/:id/resend-invite', OrgPortalController.resendCoordinatorInvite);

router.get('/staff', OrgPortalController.listStaff);
router.post('/staff', OrgPortalController.createStaff);
router.patch('/staff/:id', OrgPortalController.updateStaff);
router.post('/staff/:id/resend-invite', OrgPortalController.resendStaffInvite);

router.get('/families', OrgPortalController.listFamilies);
router.patch('/families/:id/coordinator', OrgPortalController.assignFamilyCoordinator);

router.get('/pending-intakes', OrgPortalController.pendingIntakes);

export default router;
