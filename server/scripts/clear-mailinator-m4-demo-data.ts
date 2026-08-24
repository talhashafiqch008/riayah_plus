/**
 * Clear ALL Milestone 4 demo data for mailinator users.
 *
 * Deletes (in dependency-safe order):
 *   Payments / PaymentAudits
 *   Invoices
 *   GPS logs / Clinical notes / Sessions
 *   Documents (episode & care-unit level)
 *   Messages / ConversationParticipants / Conversations
 *   Assessments / Meetings / Incidents
 *   Tasks / CarePlanApprovalLogs / CarePlanItems / Goals / CarePlans
 *   IntakeRecords / CareRecipientRevisions / CareRecipients
 *   CareEpisodes
 *   CareUnits
 *   CareNeeds / CareNeedBids
 *   Notifications
 *   ConsentLogs
 *
 * Users themselves are NOT deleted.
 *
 * Usage:
 *   cd server
 *   npx ts-node scripts/clear-mailinator-m4-demo-data.ts            # dry run
 *   npx ts-node scripts/clear-mailinator-m4-demo-data.ts --mode apply
 */

import { prisma } from '../src/config/database';

function getArgValue(name: string): string | null {
  const idx = process.argv.findIndex((a) => a === name);
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith('--')) return null;
  return value;
}

const DRY_RUN = (getArgValue('--mode') ?? 'dry-run') === 'dry-run';

async function main(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: '@mailinator.com' } },
    select: { id: true, email: true, role: true },
  });

  const userIds = users.map((u) => u.id);
  console.log(`\nMailinator users found: ${users.length}`);
  users.forEach((u) => console.log(`  ${u.role.padEnd(20)} ${u.email}`));

  if (userIds.length === 0) {
    console.log('No mailinator users found — nothing to delete.');
    return;
  }

  // ── Collect IDs ──────────────────────────────────────────────────────────

  const careUnits = await prisma.careUnit.findMany({
    where: { familyUserId: { in: userIds } },
    select: { id: true },
  });
  const careUnitIds = careUnits.map((u) => u.id);

  const careRecipients = await prisma.careRecipient.findMany({
    where: {
      OR: [{ userId: { in: userIds } }, { careUnitId: { in: careUnitIds } }],
    },
    select: { id: true },
  });
  const careRecipientIds = careRecipients.map((r) => r.id);

  const episodes = await prisma.careEpisode.findMany({
    where: {
      OR: [
        { patientId: { in: userIds } },
        { coordinatorId: { in: userIds } },
        { careUnit: { familyUserId: { in: userIds } } },
        { careUnitId: { in: careUnitIds } },
      ],
    },
    select: { id: true },
  });
  const episodeIds = episodes.map((e) => e.id);

  const sessions = await prisma.session.findMany({
    where: {
      OR: [
        { episodeId: { in: episodeIds } },
        { clientId: { in: userIds } },
        { providerId: { in: userIds } },
      ],
    },
    select: { id: true },
  });
  const sessionIds = sessions.map((s) => s.id);

  const invoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { episodeId: { in: episodeIds } },
        { sessionId: { in: sessionIds } },
        { clientId: { in: userIds } },
      ],
    },
    select: { id: true },
  });
  const invoiceIds = invoices.map((i) => i.id);

  const payments = await prisma.payment.findMany({
    where: {
      OR: [
        { invoiceId: { in: invoiceIds } },
        { sessionId: { in: sessionIds } },
        { userId: { in: userIds } },
      ],
    },
    select: { id: true },
  });
  const paymentIds = payments.map((p) => p.id);

  const carePlans = await prisma.carePlan.findMany({
    where: { episodeId: { in: episodeIds } },
    select: { id: true },
  });
  const carePlanIds = carePlans.map((p) => p.id);

  const goals = await prisma.goal.findMany({
    where: { carePlanId: { in: carePlanIds } },
    select: { id: true },
  });
  const goalIds = goals.map((g) => g.id);

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { episodeId: { in: episodeIds } },
        { participantLinks: { some: { userId: { in: userIds } } } },
      ],
    },
    select: { id: true },
  });
  const conversationIds = conversations.map((c) => c.id);

  const careNeeds = await prisma.careNeed.findMany({
    where: { clientId: { in: userIds } },
    select: { id: true },
  });
  const careNeedIds = careNeeds.map((n) => n.id);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\nRows to delete:');
  console.log(`  CareUnit:        ${careUnitIds.length}`);
  console.log(`  CareRecipient:   ${careRecipientIds.length}`);
  console.log(`  CareEpisode:     ${episodeIds.length}`);
  console.log(`  Session:         ${sessionIds.length}`);
  console.log(`  Invoice:         ${invoiceIds.length}`);
  console.log(`  Payment:         ${paymentIds.length}`);
  console.log(`  CarePlan:        ${carePlanIds.length}`);
  console.log(`  Goal:            ${goalIds.length}`);
  console.log(`  Conversation:    ${conversationIds.length}`);
  console.log(`  CareNeed:        ${careNeedIds.length}`);

  console.log(`\nMode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '🗑  APPLY (deleting now)'}`);

  if (DRY_RUN) {
    console.log('\nDry run complete. To actually delete, run:');
    console.log('  npx ts-node scripts/clear-mailinator-m4-demo-data.ts --mode apply');
    return;
  }

  // ── Delete (dependency-safe order) ───────────────────────────────────────

  // 1. Payments
  if (paymentIds.length) {
    await prisma.paymentAudit.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
  }

  // 2. Invoices
  if (invoiceIds.length) {
    await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
  }

  // 3. Session children
  if (sessionIds.length) {
    await prisma.gpsLog.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await prisma.clinicalNote.deleteMany({
      where: {
        OR: [{ sessionId: { in: sessionIds } }, { episodeId: { in: episodeIds } }],
      },
    });
    await prisma.session.deleteMany({ where: { id: { in: sessionIds } } });
  }

  // 4. Conversations / messages
  if (conversationIds.length) {
    await prisma.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
    await prisma.conversationParticipant.deleteMany({
      where: { conversationId: { in: conversationIds } },
    });
    await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } });
  }

  // 5. Episode-level content
  if (episodeIds.length) {
    await prisma.document.deleteMany({ where: { episodeId: { in: episodeIds } } });
    await prisma.assessment.deleteMany({ where: { episodeId: { in: episodeIds } } });
    await prisma.meeting.deleteMany({ where: { episodeId: { in: episodeIds } } });
    await prisma.incident.deleteMany({ where: { episodeId: { in: episodeIds } } });
  }

  // 6. Tasks (linked to episodes or goals)
  await prisma.task.deleteMany({
    where: {
      OR: [
        { careEpisodeId: { in: episodeIds } },
        { goalId: { in: goalIds } },
      ],
    },
  });

  // 7. Care plans
  if (carePlanIds.length) {
    await prisma.carePlanApprovalLog.deleteMany({ where: { carePlanId: { in: carePlanIds } } });
    await prisma.carePlanItem.deleteMany({ where: { carePlanId: { in: carePlanIds } } });
    await prisma.goal.deleteMany({ where: { carePlanId: { in: carePlanIds } } });
    await prisma.carePlan.deleteMany({ where: { id: { in: carePlanIds } } });
  }

  // 8. Intake records (unique constraint: one per episode)
  if (episodeIds.length) {
    await prisma.intakeRecord.deleteMany({ where: { careEpisodeId: { in: episodeIds } } });
  }

  // 9. Episodes
  if (episodeIds.length) {
    await prisma.careEpisode.deleteMany({ where: { id: { in: episodeIds } } });
  }

  // 10. Care recipients and revisions
  if (careRecipientIds.length) {
    await prisma.careRecipientRevision.deleteMany({
      where: { careRecipientId: { in: careRecipientIds } },
    });
    await prisma.careRecipient.deleteMany({ where: { id: { in: careRecipientIds } } });
  }

  // 11. Care units (+ their documents)
  if (careUnitIds.length) {
    await prisma.document.deleteMany({ where: { careUnitId: { in: careUnitIds } } });
    await prisma.careUnit.deleteMany({ where: { id: { in: careUnitIds } } });
  }

  // 12. Care needs / bids
  if (careNeedIds.length) {
    await prisma.careNeedBid.deleteMany({ where: { careNeedId: { in: careNeedIds } } });
    await prisma.careNeed.deleteMany({ where: { id: { in: careNeedIds } } });
  }

  // 13. Notifications for these users
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });

  // 14. Consent logs for these users
  await prisma.consentLog.deleteMany({ where: { userId: { in: userIds } } });

  console.log('\n✅ All Milestone 4 demo data cleared for mailinator users.');
  console.log('   Users themselves are kept — passwords unchanged.');
  console.log('   You can now run the demo flow from scratch.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Clear script failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
