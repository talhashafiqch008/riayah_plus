import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { SessionScheduleController } from '../controllers/scheduling/SessionScheduleController';
import { FamilySessionController } from '../controllers/scheduling/FamilySessionController';

const router = Router();
router.use(authenticate);

router.get('/staff', (req, res, next) => {
  SessionScheduleController.listStaff(req, res).catch(next);
});

router.get('/family/open-slots', (req, res, next) => {
  FamilySessionController.openSlots(req, res).catch(next);
});

router.get('/family/clinician', (req, res, next) => {
  FamilySessionController.assignedClinician(req, res).catch(next);
});

router.post('/family/sessions', (req, res, next) => {
  FamilySessionController.store(req, res).catch(next);
});

router.get('/sessions', (req, res, next) => {
  SessionScheduleController.index(req, res).catch(next);
});

router.post('/sessions', (req, res, next) => {
  SessionScheduleController.store(req, res).catch(next);
});

router.post('/sessions/recurring', (req, res, next) => {
  SessionScheduleController.storeRecurring(req, res).catch(next);
});

router.get('/sessions/:id', (req, res, next) => {
  SessionScheduleController.show(req, res).catch(next);
});

router.patch('/sessions/:id', (req, res, next) => {
  SessionScheduleController.update(req, res).catch(next);
});

router.delete('/sessions/:id', (req, res, next) => {
  SessionScheduleController.destroy(req, res).catch(next);
});

export default router;
