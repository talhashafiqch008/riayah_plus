import { Router } from 'express';
import { ChatController } from '../controllers/chat/ChatController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', ChatController.getConversations);
router.post('/conversations', ChatController.createConversation);
router.get('/:conversationId/messages', ChatController.getMessages);
router.post('/', ChatController.store);
router.patch('/:conversationId/read', ChatController.markConversationRead);
router.patch('/messages/:id', ChatController.editMessage);
router.delete('/messages/:id', ChatController.deleteMessage);

export default router;
