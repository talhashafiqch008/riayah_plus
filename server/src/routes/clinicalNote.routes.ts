import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { ClinicalNoteController } from '../controllers/clinical/ClinicalNoteController';

const router = Router();
router.use(authenticate);

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  ClinicalNoteController.index(req, res).catch(next);
});

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  ClinicalNoteController.store(req, res).catch(next);
});

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  ClinicalNoteController.show(req, res).catch(next);
});

// M3-3.2 — immutable history (no update / delete)
router.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
  ClinicalNoteController.rejectMutation(req, res).catch(next);
});
router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  ClinicalNoteController.rejectMutation(req, res).catch(next);
});
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  ClinicalNoteController.rejectMutation(req, res).catch(next);
});

export default router;
