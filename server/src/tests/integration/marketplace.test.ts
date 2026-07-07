import supertest from 'supertest';
import { getTestApp } from '../helpers/app';
import { createUser, createProvider, createCareNeed, cleanDb, disconnectDb, testPrisma } from '../helpers/db';
import { makeToken } from '../helpers/auth';

const app = getTestApp();
const request = supertest(app);

let clientToken: string;
let providerToken: string;
let clientId: string;
let providerId: string;
let careNeedId: string;
let bidId: string;

beforeAll(async () => {
  await cleanDb();
  const client = await createUser({ email: 'mkt-client@test.com' });
  const provider = await createProvider({ email: 'mkt-provider@test.com' });
  clientId = client.id;
  providerId = provider.id;
  clientToken = makeToken('client', { id: client.id, email: client.email, name: client.name });
  providerToken = makeToken('provider', { id: provider.id, email: provider.email, name: provider.name });
});

afterAll(async () => {
  await cleanDb();
  await disconnectDb();
});

describe('POST /api/care-needs — create care need', () => {
  it('client creates a care need', async () => {
    const res = await request.post('/api/care-needs')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        serviceType: 'home_care',
        title: 'Need a home care worker',
        description: 'Looking for care support 4h/day',
        location: 'Doha, Qatar',
        latitude: 25.285,
        longitude: 51.531,
        budget: 600,
        currency: 'QAR',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    careNeedId = res.body.careNeed.id;
  });
});

describe('GET /api/care-needs — browse open needs', () => {
  it('returns open care needs for a provider', async () => {
    const res = await request.get('/api/care-needs').set('Authorization', `Bearer ${providerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.careNeeds)).toBe(true);
  });
});

describe('POST /api/care-needs/:id/bids — place bid', () => {
  it('provider places a bid', async () => {
    const need = await createCareNeed(clientId);
    careNeedId = need.id;
    const res = await request
      .post(`/api/care-needs/${careNeedId}/bids`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ amount: 550, message: 'Experienced carer available' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    bidId = res.body.bid.id;
  });
});

describe('PATCH /api/care-needs/:id/bids/:bidId/accept', () => {
  it('client accepts a bid and creates a booking', async () => {
    const res = await request
      .patch(`/api/care-needs/${careNeedId}/bids/${bidId}/accept`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.booking).toBeDefined();
  });
});

describe('PATCH /api/care-needs/:id/bids/:bidId/reject', () => {
  it('client rejects a pending bid', async () => {
    const need = await createCareNeed(clientId);
    const bidRes = await request
      .post(`/api/care-needs/${need.id}/bids`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ amount: 500 });
    const newBidId = bidRes.body.bid.id;

    const res = await request
      .patch(`/api/care-needs/${need.id}/bids/${newBidId}/reject`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/rejected/i);
  });
});

describe('DELETE /api/care-needs/:id/bids/:bidId — withdraw bid', () => {
  it('provider withdraws their own bid', async () => {
    const need = await createCareNeed(clientId);
    const bidRes = await request
      .post(`/api/care-needs/${need.id}/bids`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ amount: 500 });
    const newBidId = bidRes.body.bid.id;

    const res = await request
      .delete(`/api/care-needs/${need.id}/bids/${newBidId}`)
      .set('Authorization', `Bearer ${providerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('forbids a different user from withdrawing', async () => {
    const need = await createCareNeed(clientId);
    const bidRes = await request
      .post(`/api/care-needs/${need.id}/bids`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ amount: 500 });
    const newBidId = bidRes.body.bid.id;

    const res = await request
      .delete(`/api/care-needs/${need.id}/bids/${newBidId}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/care-needs/:id/bids/:bidId/counter-offer', () => {
  it('client makes a counter-offer', async () => {
    const need = await createCareNeed(clientId);
    const bidRes = await request
      .post(`/api/care-needs/${need.id}/bids`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ amount: 600, message: 'My rate' });
    const newBidId = bidRes.body.bid.id;

    const res = await request
      .post(`/api/care-needs/${need.id}/bids/${newBidId}/counter-offer`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ amount: 520, message: 'Can you do it for this?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bid.status).toBe('counter_offered');
  });
});
