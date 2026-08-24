import { prisma } from '../src/config/database';

async function main() {
  const family = await prisma.user.findFirst({
    where: { email: 'family@mailinator.com', deletedAt: null, isActive: true },
    select: { id: true, email: true },
  });
  const clinical = await prisma.user.findFirst({
    where: { email: 'clinical@mailinator.com', deletedAt: null, isActive: true },
    select: { id: true, email: true, role: true },
  });

  if (!family || !clinical) {
    console.log('Missing family or clinical mailinator users');
    return;
  }

  const session = await prisma.session.findFirst({
    where: {
      type: 'telehealth',
      clientId: family.id,
      providerId: clinical.id,
    },
    orderBy: { scheduledAt: 'desc' },
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      livekitRoomId: true,
      recordingStatus: true,
      recordingUrl: true,
      recordingEgressId: true,
    },
  });

  console.log('Family:', family.email);
  console.log('Clinical:', clinical.email, 'role=', clinical.role);
  console.log('Session:', session);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

