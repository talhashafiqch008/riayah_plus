import { Router } from 'express';
import { TelehealthController } from '../controllers/telehealth/TelehealthController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/token', TelehealthController.generateToken);
router.post('/rooms', TelehealthController.createRoom);
router.get('/sessions/:sessionId/lobby', (req, res, next) => {
  TelehealthController.lobby(req, res).catch(next);
});
router.get('/sessions/:sessionId/context', (req, res, next) => {
  TelehealthController.context(req, res).catch(next);
});
router.post('/sessions/:sessionId/notes', (req, res, next) => {
  TelehealthController.addNote(req, res).catch(next);
});
router.post('/sessions/:sessionId/admit', (req, res, next) => {
  TelehealthController.admit(req, res).catch(next);
});
router.post('/sessions/:sessionId/recording/start', (req, res, next) => {
  TelehealthController.startRecording(req, res).catch(next);
});
router.post('/sessions/:sessionId/recording/stop', (req, res, next) => {
  TelehealthController.stopRecording(req, res).catch(next);
});
router.get('/sessions/:sessionId/recording', (req, res, next) => {
  TelehealthController.getRecording(req, res).catch(next);
});
router.get('/rooms/:roomName', TelehealthController.getRoomInfo);
router.post('/checkin', TelehealthController.sessionCheckin);
router.post('/checkout', TelehealthController.sessionCheckout);

export default router;
