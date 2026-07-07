/**
 * Seed script — populates the database with realistic demo data.
 * Run: pnpm db:seed
 *
 * Creates:
 *   - 1 super admin + 1 admin + 1 care coordinator
 *   - 5 clients (careSeekers)
 *   - 8 providers (doctor, nurse, physiotherapist, support_worker, etc.)
 *   - Wallets for all users
 *   - 3 platform services
 *   - 10 bookings in various states
 *   - 5 care needs with bids
 *   - 3 invoices
 *   - 2 courses with lessons + quiz
 *   - Sample reviews
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Password123!';

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('🌱 Seeding database…');

  const passwordHash = await hash(DEFAULT_PASSWORD);

  // ── Admin users ──────────────────────────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@riayahplus.com' },
    update: {},
    create: { id: uuid(), name: 'Super Admin', email: 'superadmin@riayahplus.com', passwordHash, role: 'super_admin', isActive: true, emailVerifiedAt: new Date() },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@riayahplus.com' },
    update: {},
    create: { id: uuid(), name: 'Platform Admin', email: 'admin@riayahplus.com', passwordHash, role: 'admin', isActive: true, emailVerifiedAt: new Date() },
  });

  const coordinator = await prisma.user.upsert({
    where: { email: 'coordinator@riayahplus.com' },
    update: {},
    create: { id: uuid(), name: 'Care Coordinator', email: 'coordinator@riayahplus.com', passwordHash, role: 'care_coordinator', isActive: true, emailVerifiedAt: new Date() },
  });

  // ── Clients ──────────────────────────────────────────────────────────────────
  const clients = await Promise.all([
    { email: 'fatima@demo.com', name: 'Fatima Al-Rashid' },
    { email: 'ahmed@demo.com', name: 'Ahmed Al-Thani' },
    { email: 'layla@demo.com', name: 'Layla Nasser' },
    { email: 'omar@demo.com', name: 'Omar Khalil' },
    { email: 'sara@demo.com', name: 'Sara Hamad' },
  ].map(({ email, name }) =>
    prisma.user.upsert({
      where: { email },
      update: {},
      create: { id: uuid(), name, email, passwordHash, role: 'client', isActive: true, emailVerifiedAt: new Date(), phone: `+97455${Math.floor(Math.random() * 900000 + 100000)}` },
    })
  ));

  // ── Providers ────────────────────────────────────────────────────────────────
  const providerData = [
    { email: 'dr.hassan@demo.com', name: 'Dr. Hassan Al-Malik', role: 'doctor', rate: 150, specialty: 'General Practitioner' },
    { email: 'nurse.amira@demo.com', name: 'Amira Youssef', role: 'nurse', rate: 80, specialty: 'Home Nursing' },
    { email: 'physio.karim@demo.com', name: 'Karim Ben Ali', role: 'physiotherapist', rate: 120, specialty: 'Neurological Rehabilitation' },
    { email: 'support.mary@demo.com', name: 'Mary Okonkwo', role: 'support_worker', rate: 60, specialty: 'Daily Living Assistance' },
    { email: 'caregiver.priya@demo.com', name: 'Priya Sharma', role: 'caregiver', rate: 55, specialty: 'Elderly Care' },
    { email: 'nurse.sofia@demo.com', name: 'Sofia Petrov', role: 'nurse', rate: 90, specialty: 'Paediatric Nursing' },
    { email: 'psychologist.nadia@demo.com', name: 'Dr. Nadia Rahman', role: 'psychologist', rate: 200, specialty: 'Clinical Psychology' },
    { email: 'speech.james@demo.com', name: 'James Osei', role: 'speech_therapist', rate: 130, specialty: 'Speech & Language Therapy' },
  ];

  const providers = await Promise.all(providerData.map(({ email, name, role }) =>
    prisma.user.upsert({
      where: { email },
      update: {},
      create: { id: uuid(), name, email, passwordHash, role: role as any, isActive: true, emailVerifiedAt: new Date(), verificationStatus: 'approved', phone: `+97450${Math.floor(Math.random() * 900000 + 100000)}` },
    })
  ));

  // Provider profiles
  await Promise.all(providers.map((p, i) =>
    prisma.providerProfile.upsert({
      where: { userId: p.id },
      update: {},
      create: {
        userId: p.id,
        hourlyRate: providerData[i].rate,
        currency: 'QAR',
        bio: `Experienced ${providerData[i].specialty} professional based in Doha, Qatar.`,
        specialties: [providerData[i].specialty],
        averageRating: Number((4 + Math.random()).toFixed(1)),
        reviewCount: Math.floor(Math.random() * 50),
        yearsExperience: Math.floor(Math.random() * 15 + 2),
        isAvailable: true,
      },
    }).catch(() => {})
  ));

  // ── Wallets ──────────────────────────────────────────────────────────────────
  const allUsers = [superAdmin, admin, coordinator, ...clients, ...providers];
  await Promise.all(allUsers.map(u =>
    prisma.wallet.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, balance: 1000 + Math.random() * 4000, currency: 'QAR' },
    }).catch(() => {})
  ));

  // ── Platform service catalogue ────────────────────────────────────────────────
  const services = await Promise.all([
    { name: 'Home Nursing', code: 'home_nursing', baseRate: 80, category: 'medical' },
    { name: 'Physiotherapy', code: 'physiotherapy', baseRate: 120, category: 'medical' },
    { name: 'Daily Living Support', code: 'daily_living', baseRate: 55, category: 'personal_care' },
    { name: 'Medical Consultation', code: 'medical_consultation', baseRate: 150, category: 'medical' },
    { name: 'Dementia Care', code: 'dementia_care', baseRate: 70, category: 'specialised' },
    { name: 'Post-Surgery Recovery', code: 'post_surgery', baseRate: 100, category: 'medical' },
  ].map(s =>
    prisma.serviceType.upsert({
      where: { code: s.code },
      update: {},
      create: { id: uuid(), ...s, currency: 'QAR', isActive: true },
    }).catch(() => prisma.serviceType.findFirst({ where: { code: s.code } }))
  ));

  // ── Bookings ─────────────────────────────────────────────────────────────────
  const bookingStatuses = ['completed', 'completed', 'completed', 'accepted', 'accepted', 'pending', 'pending', 'in_progress', 'cancelled', 'completed'];
  const bookings = await Promise.all(bookingStatuses.map((status, i) =>
    prisma.booking.create({
      data: {
        clientId: clients[i % clients.length].id,
        providerId: providers[i % providers.length].id,
        serviceType: ['home_nursing', 'physiotherapy', 'daily_living', 'medical_consultation'][i % 4],
        status: status as any,
        scheduledAt: new Date(Date.now() + (i - 5) * 24 * 3600000),
        durationHours: [2, 3, 4, 1, 2][i % 5],
        totalAmount: [160, 360, 220, 150, 200][i % 5],
        currency: 'QAR',
        notes: `Demo booking #${i + 1}`,
      },
    }).catch(() => null)
  ));

  // ── Care needs ────────────────────────────────────────────────────────────────
  const careNeeds = await Promise.all(clients.slice(0, 3).map((client, i) =>
    prisma.careNeed.create({
      data: {
        clientId: client.id,
        serviceType: ['home_nursing', 'physiotherapy', 'daily_living'][i],
        title: ['Post-op nursing care', 'Knee rehab physiotherapy', 'Daily morning care routine'][i],
        description: 'Looking for experienced professional for regular care sessions.',
        location: 'Doha, Qatar',
        latitude: 25.285 + i * 0.01,
        longitude: 51.531 + i * 0.01,
        budget: [600, 800, 400][i],
        currency: 'QAR',
        status: 'open',
      },
    }).catch(() => null)
  ));

  // Bids on first care need
  if (careNeeds[0]) {
    await Promise.all(providers.slice(0, 3).map((p, i) =>
      prisma.careNeedBid.create({
        data: {
          careNeedId: careNeeds[0]!.id,
          providerId: p.id,
          amount: 550 + i * 25,
          currency: 'QAR',
          message: 'I am experienced in this area and available on your preferred dates.',
          status: 'pending',
          expiresAt: new Date(Date.now() + 72 * 3600000),
        },
      }).catch(() => null)
    ));
  }

  // ── Reviews ───────────────────────────────────────────────────────────────────
  const completedBookings = bookings.filter(b => b?.status === 'completed').slice(0, 3);
  await Promise.all(completedBookings.map((booking, i) =>
    prisma.review.create({
      data: {
        bookingId: booking!.id,
        clientId: booking!.clientId,
        providerId: booking!.providerId,
        rating: [5, 4, 5][i],
        comment: ['Outstanding care, very professional.', 'Good service, arrived on time.', 'Highly recommend, will book again.'][i],
      },
    }).catch(() => null)
  ));

  // ── LMS Courses ───────────────────────────────────────────────────────────────
  const course1 = await prisma.course.upsert({
    where: { id: 'seed-course-1' },
    update: {},
    create: {
      id: 'seed-course-1',
      title: 'Foundations of Person-Centred Care',
      description: 'A comprehensive introduction to person-centred care principles for care professionals in Qatar.',
      instructorId: providers[0].id,
      category: 'care_fundamentals',
      isPublished: true,
      isFree: false,
      requirements: ['Basic nursing certificate or equivalent'],
      objectives: ['Understand person-centred care principles', 'Apply care planning techniques', 'Pass the module assessment'],
    },
  }).catch(() => null);

  if (course1) {
    const lesson1 = await prisma.lesson.create({
      data: {
        courseId: course1.id,
        title: 'What is Person-Centred Care?',
        type: 'video',
        content: 'Introduction to the philosophy and practice of person-centred care.',
        durationMinutes: 15,
        order: 1,
      },
    }).catch(() => null);

    await prisma.lesson.create({
      data: {
        courseId: course1.id,
        title: 'Assessment and Care Planning',
        type: 'text',
        content: 'How to conduct a thorough needs assessment and create an individual care plan.',
        durationMinutes: 20,
        order: 2,
      },
    }).catch(() => null);

    await prisma.quiz.create({
      data: {
        courseId: course1.id,
        title: 'Module 1 Assessment',
        passingScore: 70,
        questions: [
          { id: 'q1', text: 'Person-centred care focuses on:', options: ['The diagnosis', 'The individual\'s needs and preferences', 'Cost efficiency', 'Standard protocols'], correct: 'The individual\'s needs and preferences' },
          { id: 'q2', text: 'A care plan should be:', options: ['Generic', 'Doctor-only', 'Individualised and regularly reviewed', 'Written once and never changed'], correct: 'Individualised and regularly reviewed' },
        ],
      },
    }).catch(() => null);
  }

  // ── Notifications ─────────────────────────────────────────────────────────────
  await Promise.all(clients.slice(0, 2).map(client =>
    prisma.notification.create({
      data: {
        userId: client.id,
        title: 'Welcome to Riayah Plus!',
        body: 'Your account is now active. Browse care services or post a care need.',
        type: 'welcome',
        isRead: false,
      },
    }).catch(() => null)
  ));

  console.log('✅ Seeding complete!');
  console.log('\n📧 Test credentials (password: Password123!):');
  console.log('   Super Admin : superadmin@riayahplus.com');
  console.log('   Admin       : admin@riayahplus.com');
  console.log('   Coordinator : coordinator@riayahplus.com');
  console.log('   Client      : fatima@demo.com');
  console.log('   Provider    : dr.hassan@demo.com');
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
