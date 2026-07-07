import supertest from 'supertest';
import { getTestApp } from '../helpers/app';
import { createUser, createProvider, cleanDb, disconnectDb } from '../helpers/db';
import { makeToken } from '../helpers/auth';

const app = getTestApp();
const request = supertest(app);

let adminToken: string;
let clientToken: string;
let targetUserId: string;

beforeAll(async () => {
  await cleanDb();
  const admin = await createUser({ role: 'admin', email: 'admin-test@test.com' });
  const target = await createUser({ email: 'target@test.com' });
  const client = await createUser({ email: 'admin-client@test.com' });
  targetUserId = target.id;

  adminToken = makeToken('admin', { id: admin.id, email: admin.email, name: admin.name });
  clientToken = makeToken('client', { id: client.id, email: client.email, name: client.name });
});

afterAll(async () => {
  await cleanDb();
  await disconnectDb();
});

describe('GET /api/admin/dashboard', () => {
  it('returns stats for admin', async () => {
    const res = await request.get('/api/admin/dashboard').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
  });

  it('forbids client', async () => {
    const res = await request.get('/api/admin/dashboard').set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(403);
  });
});

describe('Admin user soft-delete / restore', () => {
  it('soft-deletes a user', async () => {
    const res = await request.delete(`/api/admin/users/${targetUserId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('restores a soft-deleted user', async () => {
    const res = await request.post(`/api/admin/users/${targetUserId}/restore`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('forbids client from deleting users', async () => {
    const res = await request.delete(`/api/admin/users/${targetUserId}`).set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/reports/compliance', () => {
  it('returns compliance report for admin', async () => {
    await createProvider({ email: 'comp-prov@test.com' });
    const res = await request.get('/api/admin/reports/compliance').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.report)).toBe(true);
    expect(res.body.summary).toHaveProperty('total');
  });
});

describe('GET /api/admin/platform-staff', () => {
  it('returns platform staff list', async () => {
    const res = await request.get('/api/admin/platform-staff').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.staff)).toBe(true);
  });
});

describe('POST /api/admin/login', () => {
  it('returns token with valid admin secret', async () => {
    const admin = await createUser({ role: 'admin', email: 'secret-admin@test.com' });
    const res = await request.post('/api/admin/login').send({
      secret: process.env.ADMIN_SECRET,
      email: 'secret-admin@test.com',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects wrong secret', async () => {
    const res = await request.post('/api/admin/login').send({
      secret: 'wrong-secret',
      email: 'secret-admin@test.com',
    });
    expect(res.status).toBe(401);
  });
});
