/**
 * Integration tests for Auth routes.
 * Requires a running PostgreSQL test database (DATABASE_URL in .env.test).
 * Run: pnpm test:integration
 */
import supertest from 'supertest';
import { getTestApp } from '../helpers/app';
import { createUser, cleanDb, disconnectDb, testPrisma } from '../helpers/db';
import { makeToken } from '../helpers/auth';

const app = getTestApp();
const request = supertest(app);

beforeAll(async () => {
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
  await disconnectDb();
});

describe('POST /api/register', () => {
  it('registers a new user and returns tokens', async () => {
    const res = await request.post('/api/register').send({
      name: 'New User',
      email: 'newuser@test.com',
      password: 'Password123!',
      role: 'client',
      consentAccepted: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('newuser@test.com');
  });

  it('rejects duplicate email', async () => {
    await createUser({ email: 'dup@test.com' });
    const res = await request.post('/api/register').send({
      name: 'Dup',
      email: 'dup@test.com',
      password: 'Password123!',
      consentAccepted: true,
    });
    expect(res.status).toBe(409);
  });

  it('validates required fields', async () => {
    const res = await request.post('/api/register').send({ email: 'bad' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/login', () => {
  beforeAll(async () => {
    await createUser({ email: 'login@test.com', name: 'Login User' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request.post('/api/login').send({
      email: 'login@test.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeUndefined();
    // AUTH-08: refresh is cookie-only
    const cookies = res.headers['set-cookie'];
    const cookieList = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
    expect(cookieList.some((c) => /refresh/i.test(c))).toBe(true);
  });

  it('rejects wrong password', async () => {
    const res = await request.post('/api/login').send({
      email: 'login@test.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('rejects non-existent user', async () => {
    const res = await request.post('/api/login').send({
      email: 'nobody@test.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/me', () => {
  it('returns user profile with valid token', async () => {
    const user = await createUser({ email: 'me@test.com' });
    const token = makeToken('client', { id: user.id, email: user.email, name: user.name });

    const res = await request.get('/api/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@test.com');
  });

  it('returns 401 without token', async () => {
    const res = await request.get('/api/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request.get('/api/me').set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/logout', () => {
  it('logs out successfully', async () => {
    const user = await createUser({ email: 'logout@test.com' });
    const token = makeToken('client', { id: user.id, email: user.email, name: user.name });
    const res = await request.post('/api/logout').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
