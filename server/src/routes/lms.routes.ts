import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { CourseController } from '../controllers/lms/CourseController';
import { prisma } from '../config/database';

const trainerRoles = ['trainer', 'admin'];

const router = Router();

// Public — browse courses (no auth required)
router.get('/', CourseController.list);
router.get('/my-enrollments', authenticate, CourseController.myEnrollments);
router.get('/trainer-analytics', authenticate, CourseController.trainerAnalytics);
router.get('/:id', CourseController.show);

// Authenticated actions
router.post('/', authenticate, CourseController.create);
router.patch('/:id', authenticate, CourseController.update);
router.delete('/:id', authenticate, CourseController.delete);
router.post('/:id/lessons', authenticate, CourseController.addLesson);
router.post('/:id/enroll', authenticate, CourseController.enroll);
router.post('/:id/lessons/:lessonId/complete', authenticate, CourseController.completeLesson);
router.post('/:id/quizzes/:quizId/submit', authenticate, CourseController.submitQuiz);

// Quiz results — list all attempts for a quiz (trainer sees all, learner sees own)
router.get('/:id/quizzes/:quizId/results', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { quizId } = req.params;

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { course: { select: { trainerId: true } } } });
    if (!quiz) { res.status(404).json({ success: false, message: 'Quiz not found.' }); return; }

    const isInstructor = quiz.course.trainerId === userId;
    const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

    const where = isInstructor || isAdmin ? { quizId } : { quizId, userId };

    const attempts = await prisma.quizAttempt.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { completedAt: 'desc' },
    });

    const stats = {
      totalAttempts: attempts.length,
      passed: attempts.filter(a => a.passed).length,
      averageScore: attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0,
      highScore: attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : 0,
    };

    res.json({ success: true, attempts, stats });
  } catch (err) {
    next(err);
  }
});

// ── Trainer-gated routes (/trainer/...) ───────────────────────────────────────
router.get('/trainer/courses', authenticate, requireRole(trainerRoles), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const courses = await prisma.course.findMany({
      where: { trainerId: instructorId },
      include: { _count: { select: { enrollments: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: courses });
  } catch (err) { next(err); }
});

router.post('/trainer/courses', authenticate, requireRole(trainerRoles), CourseController.create);
router.put('/trainer/courses/:id', authenticate, requireRole(trainerRoles), CourseController.update);
router.delete('/trainer/courses/:id', authenticate, requireRole(trainerRoles), CourseController.delete);

router.get('/trainer/students', authenticate, requireRole(trainerRoles), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const courses = await prisma.course.findMany({
      where: { trainerId: instructorId },
      select: { id: true },
    });
    const courseIds = courses.map((c) => c.id);
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: { in: courseIds } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { enrolledAt: 'desc' },
    });
    res.json({ data: enrollments });
  } catch (err) { next(err); }
});

router.get('/trainer/analytics', authenticate, requireRole(trainerRoles), CourseController.trainerAnalytics);

// Trainer quiz management
router.get('/trainer/quizzes', authenticate, requireRole(trainerRoles), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const instructorId = req.user!.userId;
    const quizzes = await prisma.quiz.findMany({
      where: { course: { OR: [{ instructorId }, { trainerId: instructorId }] } },
      include: { course: { select: { title: true } } },
    });
    res.json({ data: quizzes });
  } catch (err) { next(err); }
});

router.post('/trainer/quizzes', authenticate, requireRole(trainerRoles), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, title, questions, passingScore } = req.body;
    const quiz = await prisma.quiz.create({ data: { courseId, title, questions, passingScore } });
    res.status(201).json({ data: quiz });
  } catch (err) { next(err); }
});

router.put('/trainer/quizzes/:id', authenticate, requireRole(trainerRoles), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, questions, passingScore } = req.body;
    const quiz = await prisma.quiz.update({ where: { id }, data: { title, questions, passingScore } });
    res.json({ data: quiz });
  } catch (err) { next(err); }
});

router.delete('/trainer/quizzes/:id', authenticate, requireRole(trainerRoles), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.quiz.delete({ where: { id: req.params.id } });
    res.json({ message: 'Quiz deleted' });
  } catch (err) { next(err); }
});

export default router;
