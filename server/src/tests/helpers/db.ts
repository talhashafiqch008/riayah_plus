/**
 * Utilities for integration tests that talk to a real test PostgreSQL database.
 * Provides factory helpers so each test can create its own isolated data.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

export const testPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
  log: [],
});

export async function cleanDb(): Promise<void> {
  // Delete in dependency order
  const tables = [
    'quiz_attempts', 'lesson_progress', 'enrollments', 'lessons', 'quizzes', 'courses',
    'care_need_bids', 'care_needs',
    'messages', 'conversations', 'conversation_participants',
    'dispute_evidence', 'booking_disputes',
    'care_order', 'care_episodes',
    'bookings',
    'notifications',
    'wallet_transactions', 'wallets',
    'payments', 'invoices',
    'reviews',
    'documents',
    'user_sessions',
    'audit_logs',
    'gps_logs',
    'sessions',
    'consents',
    'family_members',
    'care_recipients',
    'provider_profiles',
    'client_profiles',
    'users',
  ];
  for (const t of tables) {
    await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`).catch(() => {});
  }
}

// ── Factories ──────────────────────────────────────────────────────────────────

export async function createUser(overrides: Record<string, unknown> = {}) {
  const id = uuid();
  const passwordHash = await bcrypt.hash('Password123!', 1);
  return testPrisma.user.create({
    data: {
      id,
      name: 'Test User',
      email: `user-${id}@test.com`,
      passwordHash,
      role: 'client',
      isActive: true,
      emailVerifiedAt: new Date(),
      ...overrides,
    },
  });
}

export async function createProvider(overrides: Record<string, unknown> = {}) {
  return createUser({ role: 'provider', name: 'Test Provider', ...overrides });
}

export async function createAdmin(overrides: Record<string, unknown> = {}) {
  return createUser({ role: 'admin', name: 'Test Admin', ...overrides });
}

export async function createBooking(clientId: string, providerId: string, overrides: Record<string, unknown> = {}) {
  return testPrisma.booking.create({
    data: {
      clientId,
      providerId,
      serviceType: 'home_care',
      status: 'pending',
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
      durationHours: 2,
      totalAmount: 200,
      currency: 'QAR',
      ...overrides,
    },
  });
}

export async function createCareNeed(clientId: string, overrides: Record<string, unknown> = {}) {
  return testPrisma.careNeed.create({
    data: {
      clientId,
      serviceType: 'home_care',
      title: 'Test Care Need',
      description: 'Need a home care worker',
      location: 'Doha, Qatar',
      latitude: 25.2854,
      longitude: 51.5310,
      budget: 500,
      currency: 'QAR',
      status: 'open',
      ...overrides,
    },
  });
}

export async function createCourse(trainerId: string, overrides: Record<string, unknown> = {}) {
  return testPrisma.course.create({
    data: {
      title: 'Test Course',
      description: 'A test course for unit tests',
      trainerId,
      isPublished: true,
      isFree: true,
      ...overrides,
    },
  });
}

export async function disconnectDb(): Promise<void> {
  await testPrisma.$disconnect();
}
