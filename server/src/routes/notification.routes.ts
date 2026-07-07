import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { NotificationService } from '../services/NotificationService';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  const { page, limit } = req.query as Record<string, string>;
  const data = await NotificationService.getForUser(req.user!.userId, parseInt(page ?? '1'), parseInt(limit ?? '20'));
  res.json(data);
});

router.get('/unread-count', async (req: Request, res: Response) => {
  const count = await NotificationService.getUnreadCount(req.user!.userId);
  res.json({ count });
});

router.patch('/:id/read', async (req: Request, res: Response) => {
  await NotificationService.markAsRead(req.params.id, req.user!.userId);
  res.json({ message: 'Marked as read.' });
});

router.patch('/read-all', async (req: Request, res: Response) => {
  await NotificationService.markAllAsRead(req.user!.userId);
  res.json({ message: 'All marked as read.' });
});

router.delete('/:id', async (req: Request, res: Response) => {
  await NotificationService.delete(req.params.id, req.user!.userId);
  res.json({ message: 'Deleted.' });
});

export default router;
