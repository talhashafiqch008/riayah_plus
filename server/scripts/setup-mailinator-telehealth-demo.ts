/**
 * Create one telehealth demo session for mailinator users
 * so Family and Clinical can both see it in UI.
 *
 * Run:
 *   cd server && npx ts-node scripts/setup-mailinator-telehealth-demo.ts
 */
import { prisma } from '../src/config/database';
import { TelehealthRoomService } from '../src/services/TelehealthRoomService';

const FAMILY_EMAIL = 'family@mailinator.com';
const CLINICAL_EMAIL = 'clinical@mailinator.com';
const COORD_EMAIL = 'coordinator@mailinator.com';

async function main() {
  const family = await prisma.user.findFirst({
    where: { email: FAMILY_EMAIL, deletedAt: null, isActive: true },
  });
  if (!family) throw new Error(`Family user not found: ${FAMILY_EMAIL}`);

  const clinical = await prisma.user.findFirst({
    where: { email: CLINICAL_EMAIL, deletedAt: null, isActive: true },
  });
  if (!clinical) throw new Error(`Clinical user not found: ${CLINICAL_EMAIL}`);

  const coordinator = await prisma.user.findFirst({
    where: { email: COORD_EMAIL, deletedAt: null, isActive: true },
  });
  if (!coordinator) throw new Error(`Coordinator user not found: ${COORD_EMAIL}`);

  // Prefer an existing active episode for this family. If none, create one.
  let episode = await prisma.careEpisode.findFirst({
    where: {
      OR: [{ patientId: family.id }, { careUnit: { familyUserId: family.id } }],
      status: { in: ['under_review', 'validated', 'active'] },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!episode) {
    episode = await prisma.careEpisode.create({
      data: {
        coordinatorId: coordinator.id,
        patientId: family.id,
        careUnitId:
          (
            await prisma.careUnit.findFirst({
              where: { familyUserId: family.id },
              select: { id: true },
              orderBy: { createdAt: 'desc' },
            })
          )?.id ?? null,
        organizationId: coordinator.organizationId,
        title: 'Telehealth Demo Episode',
        status: 'active',
        diagnoses: [],
        serviceInterests: [],
        observedChallenges: [],
        priorAssessments: [],
        consentGiven: true,
      },
    });
    console.log(`Created episode: ${episode.id}`);
  } else {
    console.log(`Using existing episode: ${episode.id}`);
  }

  // Remove stale non-completed demo telehealth sessions for clarity.
  await prisma.session.deleteMany({
    where: {
      episodeId: episode.id,
      type: 'telehealth',
      status: { in: ['pending', 'accepted', 'in_progress'] },
    },
  });

  const scheduledAt = new Date(Date.now() + 15 * 60 * 1000);
  const session = await prisma.session.create({
    data: {
      episodeId: episode.id,
      providerId: clinical.id,
      clientId: family.id,
      type: 'telehealth',
      status: 'accepted',
      scheduledAt,
      durationMinutes: 45,
      notes: 'Mailinator telehealth demo session',
    },
  });

  await TelehealthRoomService.provisionForSession(session.id);

  console.log('✅ Telehealth demo session ready');
  console.log(`Session ID: ${session.id}`);
  console.log(`Family: ${FAMILY_EMAIL} → /family/telehealth`);
  console.log(`Clinical: ${CLINICAL_EMAIL} → /clinical/telehealth`);
  console.log(`Starts at: ${scheduledAt.toISOString()}`);
}

main()
  .catch((err) => {
    console.error('Setup failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

