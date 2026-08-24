import { prisma } from '../src/config/database';

async function main() {
  // First show what will be deleted
  const drafts = await prisma.carePlan.findMany({
    where: { status: 'draft' },
    select: { id: true, episodeId: true, createdAt: true },
  });

  console.log(`Draft care plans found: ${drafts.length}`);
  drafts.forEach((p) => console.log(`  ${p.id}  episode: ${p.episodeId ?? 'none'}  created: ${p.createdAt.toISOString()}`));

  if (drafts.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  const ids = drafts.map((p) => p.id);

  // Delete children first
  await prisma.carePlanApprovalLog.deleteMany({ where: { carePlanId: { in: ids } } });
  await prisma.carePlanItem.deleteMany({ where: { carePlanId: { in: ids } } });
  await prisma.goal.deleteMany({ where: { carePlanId: { in: ids } } });
  await prisma.carePlan.deleteMany({ where: { id: { in: ids } } });

  console.log(`✅ Deleted ${drafts.length} draft care plan(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
