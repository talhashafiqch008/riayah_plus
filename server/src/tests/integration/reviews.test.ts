import supertest from 'supertest';
import { getTestApp } from '../helpers/app';
import { createUser, createProvider, createBooking, cleanDb, disconnectDb } from '../helpers/db';
import { makeToken } from '../helpers/auth';

const app = getTestApp();
const request = supertest(app);

let clientToken: string;
let adminToken: string;
let clientId: string;
let providerId: string;
let bookingId: string;
let reviewId: string;

beforeAll(async () => {
  await cleanDb();
  const client = await createUser({ email: 'rev-client@test.com' });
  const provider = await createProvider({ email: 'rev-provider@test.com' });
  const admin = await createUser({ role: 'admin', email: 'rev-admin@test.com' });
  const booking = await createBooking(client.id, provider.id, { status: 'completed' });

  clientId = client.id;
  providerId = provider.id;
  bookingId = booking.id;
  clientToken = makeToken('client', { id: client.id, email: client.email, name: client.name });
  adminToken = makeToken('admin', { id: admin.id, email: admin.email, name: admin.name });
});

afterAll(async () => {
  await cleanDb();
  await disconnectDb();
});

describe('POST /api/reviews', () => {
  it('client submits a review for completed booking', async () => {
    const res = await request.post('/api/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ bookingId, rating: 5, comment: 'Excellent service!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    reviewId = res.body.review.id;
  });

  it('cannot submit review for non-existent booking', async () => {
    const res = await request.post('/api/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ bookingId: 'fake-id', rating: 4, comment: 'Test' });
    expect(res.status).toBe(404);
  });

  it('validates rating range', async () => {
    const res = await request.post('/api/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ bookingId, rating: 6, comment: 'Too high' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/reviews/provider/:providerId', () => {
  it('lists reviews for a provider', async () => {
    const res = await request.get(`/api/reviews/provider/${providerId}`).set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });
});

describe('PATCH /api/reviews/:id', () => {
  it('owner can update their own review', async () => {
    const res = await request.patch(`/api/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ rating: 4, comment: 'Updated comment' });
    expect(res.status).toBe(200);
    expect(res.body.review.rating).toBe(4);
  });
});

describe('Admin review moderation', () => {
  it('admin can delete any review', async () => {
    const res = await request.delete(`/api/admin/reviews/${reviewId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/admin/reviews — lists all reviews', async () => {
    const res = await request.get('/api/admin/reviews').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });

  it('forbids client from deleting admin route', async () => {
    const res = await request.delete(`/api/admin/reviews/${reviewId}`).set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(403);
  });
});
