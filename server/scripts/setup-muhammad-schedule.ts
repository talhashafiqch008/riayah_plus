/**
 * One-off: reset Muhammad's org coordinator password + book/complete a session
 * so familty@mailinator.com gets an invoice for Step 2 billing demo.
 *
 * Run: cd server && npx ts-node scripts/setup-muhammad-schedule.ts
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { InvoiceService } from '../src/services/InvoiceService';
import { TelehealthRoomService } from '../src/services/TelehealthRoomService';

const COORD_EMAIL = 'coordinator123@mailinator.com';
const FAMILY_EMAIL = 'familty@mailinator.com';
const EPISODE_ID = 'cmsx21gq7002vb6l4wgqz1exc'; // matches QUO-MSX23P4O-XP8T
const PASSWORD = 'Password123!';

async function main() {
  const coord = await prisma.user.findFirst({ where: { email: COORD_EMAIL } });
  if (!coord) throw new Error(`Coordinator not found: ${COORD_EMAIL}`);

  const hash = await bcrypt.hash(PASSWORD, env.BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: coord.id },
    data: { passwordHash: hash, isActive: true },
  });
  console.log(`✓ Reset password for ${COORD_EMAIL} → ${PASSWORD}`);

  const provider =
    (await prisma.user.findFirst({
      where: {
        organizationId: coord.organizationId,
        role: 'clinical_staff',
        isActive: true,
        deletedAt: null,
      },
    })) ??
    (await prisma.user.findFirst({
      where: {
        organizationId: coord.organizationId,
        role: 'support_worker',
        isActive: true,
        deletedAt: null,
      },
    }));

  if (!provider) throw new Error('No schedulable staff in org');

  const episode = await prisma.careEpisode.findUnique({ where: { id: EPISODE_ID } });
  if (!episode) throw new Error(`Episode not found: ${EPISODE_ID}`);

  const family = await prisma.user.findFirst({ where: { email: FAMILY_EMAIL } });
  if (!family) throw new Error(`Family not found: ${FAMILY_EMAIL}`);

  const scheduledAt = new Date(Date.now() + 60 * 60 * 1000);

  let session = await prisma.session.findFirst({
    where: { episodeId: EPISODE_ID, status: { not: 'completed' } },
    orderBy: { scheduledAt: 'desc' },
  });

  if (!session) {
    session = await prisma.session.create({
      data: {
        episodeId: episode.id,
        providerId: provider.id,
        clientId: family.id,
        scheduledAt,
        durationMinutes: 60,
        type: 'telehealth',
        status: 'accepted',
        notes: 'Demo session for M4 billing Step 2',
      },
    });
    await TelehealthRoomService.provisionForSession(session.id);
    console.log(`✓ Booked telehealth session ${session.id} with ${provider.name}`);
  } else {
    console.log(`✓ Using existing session ${session.id} (${session.status})`);
  }

  if (session.status !== 'completed') {
    session = await prisma.session.update({
      where: { id: session.id },
      data: { status: 'completed', completedAt: new Date() },
    });
    console.log(`✓ Marked session completed`);
  }

  const invoice = await InvoiceService.createFromSessionCompletion(session.id, coord.id);
  if (invoice.created) {
    console.log(`✓ Invoice created: ${invoice.invoiceNumber} (${invoice.total} ${invoice.currency})`);
  } else {
    console.log(`✓ Invoice: ${invoice.reason}${invoice.invoiceId ? ` id=${invoice.invoiceId}` : ''}`);
  }

  const staffCount = await prisma.user.count({
    where: {
      organizationId: coord.organizationId,
      role: {
        in: [
          'support_worker',
          'clinical_staff',
          'doctor',
          'nurse',
          'physiotherapist',
          'occupational_therapist',
          'speech_therapist',
          'psychologist',
          'dietitian',
          'therapist',
          'caregiver',
          'companion',
        ],
      },
      isActive: true,
      deletedAt: null,
    },
  });

  const episodeCount = await prisma.careEpisode.count({
    where: { organizationId: coord.organizationId },
  });

  console.log('\n--- Schedule page should now show ---');
  console.log(`Coordinator login: ${COORD_EMAIL} / ${PASSWORD}`);
  console.log(`Staff in dropdown: ${staffCount}`);
  console.log(`Episodes in dropdown: ${episodeCount}`);
  console.log(`Family login: ${FAMILY_EMAIL} → Billing → Invoices tab`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
