import { Router } from 'express';
import multer from 'multer';
import { VoiceRecordingController } from '../controllers/voice/VoiceRecordingController';
import { authenticate } from '../middleware/auth';
import { VOICE_RECORDING_MAX_BYTES } from '../utils/uploadAllowlist';

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: VOICE_RECORDING_MAX_BYTES },
});

router.get('/', (req, res, next) => {
  VoiceRecordingController.list(req, res).catch(next);
});

router.get('/patients', (req, res, next) => {
  VoiceRecordingController.listPatients(req, res).catch(next);
});

router.post('/', upload.single('file'), (req, res, next) => {
  VoiceRecordingController.create(req, res).catch(next);
});

router.get('/:id/playback', (req, res, next) => {
  VoiceRecordingController.playback(req, res).catch(next);
});

router.delete('/:id', (req, res, next) => {
  VoiceRecordingController.destroy(req, res).catch(next);
});

export default router;
