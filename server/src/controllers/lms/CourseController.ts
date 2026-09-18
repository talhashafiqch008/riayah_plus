import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

const courseSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  category: z.string().optional(),
  thumbnail: z.string().url().optional(),
  price: z.number().min(0).default(0),
  currency: z.string().default('QAR'),
  isFree: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  requirements: z.array(z.string()).optional(),
  objectives: z.array(z.string()).optional(),
});

const lessonSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  type: z.enum(['video', 'document', 'quiz', 'text']),
  contentUrl: z.string().optional(),
  content: z.string().optional(),
  durationMinutes: z.number().optional(),
  order: z.number().int().optional(),
});

const quizSubmitSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.union([z.string(), z.array(z.string())]),
  })),
});

export class CourseController {
  // POST /api/courses — trainer creates a course
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = courseSchema.parse(req.body);
      const course = await prisma.course.create({
        data: { ...body, trainerId: req.user!.userId },
      });
      res.status(201).json({ success: true, course });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/courses — list published courses
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;

      const where: Record<string, unknown> = { isPublished: true };
      if (category) where.category = category;
      if (search) where.title = { contains: search, mode: 'insensitive' };

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          include: {
            trainer: { select: { id: true, name: true, avatar: true } },
            _count: { select: { enrollments: true, lessons: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.course.count({ where }),
      ]);

      res.json({ success: true, courses, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/courses/:id
  static async show(req: Request, res: Response, next: NextFunction) {
    try {
      const course = await prisma.course.findUnique({
        where: { id: req.params.id },
        include: {
          trainer: { select: { id: true, name: true, avatar: true } },
          lessons: { orderBy: { order: 'asc' } },
          _count: { select: { enrollments: true } },
        },
      });
      if (!course) throw new AppError('Course not found.', 404);
      res.json({ success: true, course });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/courses/:id
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = courseSchema.partial().parse(req.body);
      const course = await prisma.course.findUnique({ where: { id: req.params.id } });
      if (!course) throw new AppError('Course not found.', 404);
      const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);
      if (course.trainerId !== req.user!.userId && !isAdmin) throw new AppError('Forbidden.', 403);
      const updated = await prisma.course.update({ where: { id: req.params.id }, data: body });
      res.json({ success: true, course: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/courses/:id
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const course = await prisma.course.findUnique({ where: { id: req.params.id } });
      if (!course) throw new AppError('Course not found.', 404);
      const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);
      if (course.trainerId !== req.user!.userId && !isAdmin) throw new AppError('Forbidden.', 403);
      await prisma.course.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Course deleted.' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/courses/:id/lessons
  static async addLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const body = lessonSchema.parse(req.body);
      const lesson = await prisma.lesson.create({ data: { courseId: req.params.id, ...body } });
      res.status(201).json({ success: true, lesson });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/courses/:id/enroll
  static async enroll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const courseId = req.params.id;

      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) throw new AppError('Course not found.', 404);

      const existing = await prisma.enrollment.findFirst({ where: { userId, courseId } });
      if (existing) throw new AppError('You are already enrolled in this course.', 409);

      const enrollment = await prisma.enrollment.create({ data: { userId, courseId, status: 'enrolled' } });
      res.status(201).json({ success: true, enrollment });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/courses/my-enrollments
  static async myEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: req.user!.userId },
        include: { course: { include: { trainer: { select: { id: true, name: true } }, _count: { select: { lessons: true } } } } },
        orderBy: { enrolledAt: 'desc' },
      });
      res.json({ success: true, enrollments });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/courses/:id/lessons/:lessonId/complete
  static async completeLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const { lessonId } = req.params;
      const userId = req.user!.userId;

      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: { userId, lessonId, completedAt: new Date() },
        update: { completedAt: new Date() },
      });

      // Update enrollment progress
      const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
      if (lesson) {
        const totalLessons = await prisma.lesson.count({ where: { courseId: lesson.courseId } });
        const completedLessons = await prisma.lessonProgress.count({
          where: { userId, lesson: { courseId: lesson.courseId } },
        });
        const progress = Math.round((completedLessons / totalLessons) * 100);
        await prisma.enrollment.updateMany({
          where: { userId, courseId: lesson.courseId },
          data: { progress, completedAt: progress >= 100 ? new Date() : null },
        });
      }

      res.json({ success: true, message: 'Lesson marked complete.' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/courses/:id/quizzes/:quizId/submit
  static async submitQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const { quizId } = req.params;
      const { answers } = quizSubmitSchema.parse(req.body);
      const userId = req.user!.userId;

      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: { questions: true },
      });
      if (!quiz) throw new AppError('Quiz not found.', 404);

      let correct = 0;
      for (const q of quiz.questions) {
        const submitted = answers.find(a => a.questionId === q.id);
        if (!submitted) continue;
        const correctAnswer = (q.correctAnswer ?? q.answer) as string | string[] | null;
        if (!correctAnswer) continue;
        const given = submitted.answer;
        if (Array.isArray(correctAnswer)) {
          if (Array.isArray(given) && given.sort().join() === correctAnswer.sort().join()) correct++;
        } else {
          if (given === correctAnswer) correct++;
        }
      }

      const questionCount = quiz.questions.length || 1;
      const score = Math.round((correct / questionCount) * 100);
      const passed = score >= (quiz.passingScore ?? 70);

      const attempt = await prisma.quizAttempt.create({
        data: { userId, quizId, score, passed, answers: answers as object, completedAt: new Date() },
      });

      res.json({ success: true, score, passed, attempt });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/courses/trainer-analytics (trainer sees their own course stats)
  static async trainerAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const instructorId = req.user!.userId;
      const courses = await prisma.course.findMany({
        where: { trainerId: instructorId },
        include: { _count: { select: { enrollments: true } } },
      });

      const totalEnrollments = courses.reduce((sum, c) => sum + c._count.enrollments, 0);
      const publishedCourses = courses.filter(c => c.isPublished).length;

      res.json({ success: true, courses, stats: { total: courses.length, published: publishedCourses, totalEnrollments } });
    } catch (err) {
      next(err);
    }
  }
}
