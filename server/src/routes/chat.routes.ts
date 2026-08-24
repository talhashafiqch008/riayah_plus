import { Router } from 'express';
import multer from 'multer';
import { ChatController } from '../controllers/chat/ChatController';
import { authenticate } from '../middleware/auth';
import { UPLOAD_MAX_BYTES } from '../utils/uploadAllowlist';

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_BYTES },
});

router.get('/', ChatController.getConversations);
router.post('/threads', ChatController.createConversation);
router.post('/conversations', ChatController.createConversation);
router.post('/', ChatController.store);
router.get('/:conversationId/messages', (req, res, next) => {
  ChatController.getMessages(req, res).catch(next);
});
router.post('/:conversationId/messages', upload.single('file'), (req, res, next) => {
  ChatController.sendInThread(req, res).catch(next);
});
router.post('/:conversationId/read', (req, res, next) => {
  ChatController.markConversationRead(req, res).catch(next);
});
router.patch('/:conversationId/read', (req, res, next) => {
  ChatController.markConversationRead(req, res).catch(next);
});
router.get('/:conversationId/files/:fileName', (req, res, next) => {
  ChatController.downloadAttachment(req, res).catch(next);
});
router.patch('/messages/:id', ChatController.editMessage);
router.delete('/messages/:id', ChatController.deleteMessage);

export default router;
