import supertest from 'supertest';
import { getTestApp } from '../helpers/app';
import { createUser, createProvider, createBooking, cleanDb, disconnectDb } from '../helpers/db';
import { makeToken } from '../helpers/auth';

const app = getTestApp();
const request = supertest(app);

let clientToken: string;
let providerToken: string;
let adminToken: string;
let clientId: string;
let providerId: string;
let bookingId: string;

beforeAll(async () => {
  await cleanDb();
  const client = await createUser({ email: 'booking-client@test.com' });
  const provider = await createProvider({ email: 'booking-provider@test.com' });
  const admin = await createUser({ role: 'admin', email: 'booking-admin@test.com' });
  clientId = client.id;
  providerId = provider.id;

  clientToken = makeToken('client', { id: client.id, email: client.email, name: client.name });
  providerToken = makeToken('provider', { id: provider.id, email: provider.email, name: provider.name });
  adminToken = makeToken('admin', { id: admin.id, email: admin.email, name: admin.name });
});

afterAll(async () => {
  await cleanDb();
  await disconnectDb();
});

describe('POST /api/bookings', () => {
  it('creates a booking as client', async () => {
    const res = await request.post('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId,
        serviceType: 'home_care',
        scheduledAt: new Date(Date.now() + 48 * 3600000).toISOString(),
        durationHours: 3,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    bookingId = res.body.booking.id;
  });

  it('rejects booking creation without auth', async () => {
    const res = await request.post('/api/bookings').send({ providerId });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/bookings', () => {
  it('returns client own bookings', async () => {
    const res = await request.get('/api/bookings').set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.bookings)).toBe(true);
  });

  it('requires auth', async () => {
    const res = await request.get('/api/bookings');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/bookings/:id', () => {
  it('returns booking detail for owner', async () => {
    const booking = await createBooking(clientId, providerId);
    const res = await request.get(`/api/bookings/${booking.id}`).set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.booking.id).toBe(booking.id);
  });

  it('forbids non-owner non-admin', async () => {
    const other = await createUser({ email: 'other@test.com' });
    const otherToken = makeToken('client', { id: other.id, email: other.email, name: other.name });
    const booking = await createBooking(clientId, providerId);
    const res = await request.get(`/api/bookings/${booking.id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for unknown booking', async () => {
    const res = await request.get('/api/bookings/nonexistent-id').set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(404);
  });
});

describe('GPS clock-in / clock-out', () => {
  it('lets the assigned provider clock in', async () => {
    const booking = await createBooking(clientId, providerId, { status: 'accepted' });
    const res = await request
      .post(`/api/bookings/${booking.id}/clock-in`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ latitude: 25.285, longitude: 51.531 });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });

  it('forbids a different provider from clocking in', async () => {
    const otherProv = await createProvider({ email: 'other-prov@test.com' });
    const otherToken = makeToken('provider', { id: otherProv.id, email: otherProv.email, name: otherProv.name });
    const booking = await createBooking(clientId, providerId, { status: 'accepted' });
    const res = await request
      .post(`/api/bookings/${booking.id}/clock-in`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ latitude: 25.285, longitude: 51.531 });
    expect(res.status).toBe(403);
  });
});

describe('Admin force-cancel', () => {
  it('allows admin to force-cancel any booking', async () => {
    const booking = await createBooking(clientId, providerId);
    const res = await request
      .post(`/api/admin/bookings/${booking.id}/force-cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Test cancellation' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('forbids clients from force-cancelling', async () => {
    const booking = await createBooking(clientId, providerId);
    const res = await request
      .post(`/api/admin/bookings/${booking.id}/force-cancel`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ reason: 'Client attempt' });
    expect(res.status).toBe(403);
  });
});
