import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { StaffController } from '../controllers/staff/StaffController';

const router = Router();
router.use(authenticate);

// Staff management
router.post('/staff', StaffController.create);
router.get('/staff', StaffController.list);
router.get('/staff/:id', StaffController.show);
router.patch('/staff/:id', StaffController.update);
router.delete('/staff/:id', StaffController.delete);

// Assignments
router.post('/assignments', StaffController.assign);
router.get('/assignments', StaffController.listAssignments);
router.patch('/assignments/:id', StaffController.updateAssignment);
router.delete('/assignments/:id', StaffController.deleteAssignment);

export default router;
