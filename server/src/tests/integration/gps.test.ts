import supertest from 'supertest';
import { getTestApp } from '../helpers/app';
import { createUser, cleanDb, disconnectDb, testPrisma } from '../helpers/db';
import { makeToken } from '../helpers/auth';

const app = getTestApp();
const request = supertest(app);

const DOHA = { latitude: 25.2854, longitude: 51.531 };
const FAR = { latitude: 25.32, longitude: 51.531 };

async function seedVisit() {
  const org = await testPrisma.organization.create({
    data: { name: 'GPS Clinic', slug: `gps-${Date.now()}` },
  });
  const patient = await createUser({
    email: `gps-patient-${Date.now()}@test.com`,
    role: 'family',
    name: 'GPS Patient',
    organizationId: org.id,
  });
  const worker = await createUser({
    email: `gps-worker-${Date.now()}@test.com`,
    role: 'support_worker',
    name: 'GPS Worker',
    organizationId: org.id,
  });
  const coordinator = await createUser({
    email: `gps-coord-${Date.now()}@test.com`,
    role: 'care_coordinator',
    name: 'GPS Coordinator',
    organizationId: org.id,
  });
  const otherWorker = await createUser({
    email: `gps-other-${Date.now()}@test.com`,
    role: 'support_worker',
    name: 'Other Worker',
    organizationId: org.id,
  });

  const session = await testPrisma.session.create({
    data: {
      providerId: worker.id,
      clientId: patient.id,
      scheduledAt: new Date(),
      type: 'home_visit',
      status: 'accepted',
      latitude: DOHA.latitude,
      longitude: DOHA.longitude,
    },
  });

  return {
    org,
    patient,
    worker,
    coordinator,
    otherWorker,
    session,
    workerToken: makeToken('support_worker', {
      id: worker.id,
      email: worker.email,
      name: worker.name,
    }),
    coordToken: makeToken('care_coordinator', {
      id: coordinator.id,
      email: coordinator.email,
      name: coordinator.name,
    }),
    otherToken: makeToken('support_worker', {
      id: otherWorker.id,
      email: otherWorker.email,
      name: otherWorker.name,
    }),
  };
}

beforeAll(async () => {
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
  await disconnectDb();
});

describe('GPS visit check-in / check-out', () => {
  it('lets the assigned worker check in inside the geofence', async () => {
    const { session, workerToken } = await seedVisit();
    const res = await request
      .post(`/api/gps/sessions/${session.id}/checkin`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send(DOHA);

    expect(res.status).toBe(200);
    expect(res.body.checkedIn).toBe(true);
    expect(res.body.geofence.status).toBe('within_radius');
    expect(res.body.geofence.isWithinRadius).toBe(true);

    const stored = await testPrisma.session.findUnique({ where: { id: session.id } });
    expect(stored?.checkInAt).toBeTruthy();
    expect(stored?.geofenceStatus).toBe('within_radius');

    const log = await testPrisma.gpsLog.findFirst({
      where: { sessionId: session.id, eventType: 'checkin' },
    });
    expect(log).toBeTruthy();
    expect(log?.sessionId).toBe(session.id);
  });

  it('shares live location after check-in', async () => {
    const { session, workerToken } = await seedVisit();
    await request
      .post(`/api/gps/sessions/${session.id}/checkin`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send(DOHA);

    const res = await request
      .post(`/api/gps/sessions/${session.id}/ping`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ latitude: 25.286, longitude: 51.532 });

    expect(res.status).toBe(200);
    expect(res.body.pinged).toBe(true);
  });

  it('rejects an out-of-radius check-in (MOB-06)', async () => {
    const { session, workerToken } = await seedVisit();
    const res = await request
      .post(`/api/gps/sessions/${session.id}/checkin`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send(FAR);

    expect(res.status).toBe(422);
    expect(res.body.details?.code).toBe('gps_out_of_radius');
    expect(res.body.details?.geofence?.status).toBe('out_of_radius');
    expect(res.body.details?.geofence?.isWithinRadius).toBe(false);

    const stored = await testPrisma.session.findUnique({ where: { id: session.id } });
    expect(stored?.checkInAt).toBeNull();
  });

  it('forbids another worker from checking in', async () => {
    const { session, otherToken } = await seedVisit();
    const res = await request
      .post(`/api/gps/sessions/${session.id}/checkin`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send(DOHA);
    expect(res.status).toBe(403);
  });

  it('returns geofence preview without writing', async () => {
    const { session, workerToken } = await seedVisit();
    const res = await request
      .post(`/api/gps/sessions/${session.id}/validate`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send(FAR);
    expect(res.status).toBe(200);
    expect(res.body.geofence.status).toBe('out_of_radius');

    const stored = await testPrisma.session.findUnique({ where: { id: session.id } });
    expect(stored?.checkInAt).toBeNull();
  });

  it('checks out and writes a checkout GPS log', async () => {
    const { session, workerToken } = await seedVisit();
    await request
      .post(`/api/gps/sessions/${session.id}/checkin`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send(DOHA);

    const res = await request
      .post(`/api/gps/sessions/${session.id}/checkout`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ ...DOHA, notes: 'Visit complete' });

    expect(res.status).toBe(200);
    expect(res.body.checkedOut).toBe(true);

    const log = await testPrisma.gpsLog.findFirst({
      where: { sessionId: session.id, eventType: 'checkout' },
    });
    expect(log?.sessionId).toBe(session.id);
  });

  it('rejects checkout before check-in', async () => {
    const { session, workerToken } = await seedVisit();
    const res = await request
      .post(`/api/gps/sessions/${session.id}/checkout`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send(DOHA);
    expect(res.status).toBe(422);
  });
});

describe('GPS coordinator + admin APIs', () => {
  it('lists the assigned worker after check-in', async () => {
    const { session, workerToken, coordToken, worker, patient } = await seedVisit();
    await request
      .post(`/api/gps/sessions/${session.id}/checkin`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send(DOHA);

    const res = await request
      .get('/api/gps/active-workers')
      .set('Authorization', `Bearer ${coordToken}`);

    expect(res.status).toBe(200);
    const match = (res.body.workers as Array<{ sessionId: string; workerId: string; patientName: string }>).find(
      (w) => w.sessionId === session.id,
    );
    expect(match).toBeTruthy();
    expect(match?.workerId).toBe(worker.id);
    expect(match?.patientName).toBe(patient.name);
  });

  it('forbids workers from listing active locations', async () => {
    const { workerToken } = await seedVisit();
    const res = await request
      .get('/api/gps/active-workers')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.status).toBe(403);
  });

  it('returns replay points for a visit', async () => {
    const { session, workerToken } = await seedVisit();
    await request
      .post(`/api/gps/sessions/${session.id}/checkin`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send(DOHA);
    await request
      .post(`/api/gps/sessions/${session.id}/checkout`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send(DOHA);

    const res = await request
      .get(`/api/gps/sessions/${session.id}`)
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe(session.id);
    expect(res.body.target.radiusMeters).toBeGreaterThan(0);
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(res.body.logs.length).toBeGreaterThanOrEqual(2);
  });

  it('lets a coordinator read org GPS logs', async () => {
    const { session, workerToken, coordToken } = await seedVisit();
    await request
      .post(`/api/gps/sessions/${session.id}/checkin`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send(DOHA);

    const res = await request.get('/api/gps/logs').set('Authorization', `Bearer ${coordToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
