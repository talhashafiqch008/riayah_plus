import supertest from 'supertest';
import { getTestApp } from '../helpers/app';
import { createUser, createCourse, cleanDb, disconnectDb, testPrisma } from '../helpers/db';
import { makeToken } from '../helpers/auth';

const app = getTestApp();
const request = supertest(app);

let trainerToken: string;
let studentToken: string;
let trainerId: string;
let courseId: string;
let lessonId: string;
let quizId: string;

beforeAll(async () => {
  await cleanDb();
  const trainer = await createUser({ role: 'provider', email: 'trainer@test.com' });
  const student = await createUser({ role: 'client', email: 'student@test.com' });
  trainerId = trainer.id;

  trainerToken = makeToken('provider', { id: trainer.id, email: trainer.email, name: trainer.name });
  studentToken = makeToken('client', { id: student.id, email: student.email, name: student.name });
});

afterAll(async () => {
  await cleanDb();
  await disconnectDb();
});

describe('POST /api/courses — create course', () => {
  it('trainer creates a course', async () => {
    const res = await request.post('/api/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ title: 'Geriatric Care Basics', description: 'Foundation course for carers', isFree: true });

    expect(res.status).toBe(201);
    courseId = res.body.course.id;
  });
});

describe('POST /api/courses/:id/lessons', () => {
  it('adds a lesson to the course', async () => {
    const res = await request.post(`/api/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ title: 'Introduction', type: 'video', content: 'Welcome to the course', durationMinutes: 10 });

    expect(res.status).toBe(201);
    lessonId = res.body.lesson.id;
  });
});

describe('POST /api/courses/:id/enroll', () => {
  it('student enrols in a course', async () => {
    const res = await request.post(`/api/courses/${courseId}/enroll`).set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('cannot enrol twice', async () => {
    const res = await request.post(`/api/courses/${courseId}/enroll`).set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(409);
  });
});

describe('POST /api/courses/:id/lessons/:lessonId/complete', () => {
  it('student marks a lesson complete', async () => {
    const res = await request
      .post(`/api/courses/${courseId}/lessons/${lessonId}/complete`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/courses/my-enrollments', () => {
  it('returns enrolled courses for student', async () => {
    const res = await request.get('/api/courses/my-enrollments').set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.enrollments)).toBe(true);
    expect(res.body.enrollments.length).toBeGreaterThan(0);
  });
});

let quizQuestionId: string;

describe('Quiz flow', () => {
  beforeAll(async () => {
    // Create a quiz directly in DB for this test
    const quiz = await testPrisma.quiz.create({
      data: {
        courseId,
        title: 'Module 1 Quiz',
        passingScore: 70,
        questions: {
          create: [
            { question: 'What is person-centred care?', options: ['A', 'B', 'C'], answer: 'A' },
          ],
        },
      },
      include: { questions: true },
    });
    quizId = quiz.id;
    quizQuestionId = quiz.questions[0].id;
  });

  it('student submits quiz answers', async () => {
    const res = await request
      .post(`/api/courses/${courseId}/quizzes/${quizId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [{ questionId: quizQuestionId, answer: 'A' }] });

    expect(res.status).toBe(200);
    expect(res.body.score).toBeDefined();
    expect(res.body.passed).toBeDefined();
  });

  it('trainer can view quiz results', async () => {
    const res = await request
      .get(`/api/courses/${courseId}/quizzes/${quizId}/results`)
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.attempts)).toBe(true);
    expect(res.body.stats.totalAttempts).toBeGreaterThanOrEqual(1);
  });

  it('student only sees their own results', async () => {
    const res = await request
      .get(`/api/courses/${courseId}/quizzes/${quizId}/results`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.attempts.length).toBe(1);
  });
});

describe('GET /api/courses/trainer-analytics', () => {
  it('returns analytics for trainer', async () => {
    const res = await request.get('/api/courses/trainer-analytics').set('Authorization', `Bearer ${trainerToken}`);
    expect(res.status).toBe(200);
  });
});
