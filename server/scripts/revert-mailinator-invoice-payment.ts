/**
 * Revert a paid demo invoice so you can click Pay Now again.
 *
 * Does NOT call PayTabs refund. This only resets local DB:
 *   - deletes payment audit rows + payment rows
 *   - sets invoice status back to `sent` and clears paidAt
 *
 * Usage:
 *   cd server
 *   npx ts-node scripts/revert-mailinator-invoice-payment.ts
 *   npx ts-node scripts/revert-mailinator-invoice-payment.ts --mode apply
 *   npx ts-node scripts/revert-mailinator-invoice-payment.ts --mode apply --email family@mailinator.com
 *   npx ts-node scripts/revert-mailinator-invoice-payment.ts --mode apply --invoice INV-XXXX
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
const EMAIL = getArgValue('--email') ?? 'family@mailinator.com';
const INVOICE_NUMBER = getArgValue('--invoice');

async function main(): Promise<void> {
  const client = await prisma.user.findFirst({
    where: { email: EMAIL },
    select: { id: true, email: true, name: true },
  });

  if (!client) {
    console.log(`No user found for ${EMAIL}`);
    return;
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      clientId: client.id,
      type: { not: 'quotation' },
      ...(INVOICE_NUMBER
        ? { invoiceNumber: INVOICE_NUMBER }
        : { status: 'paid' }),
    },
    include: { payments: { select: { id: true, status: true, gateway: true, gatewayRef: true, amount: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  console.log(`\nUser: ${client.email} (${client.name ?? 'no name'})`);
  console.log(`Invoices matched: ${invoices.length}`);
  invoices.forEach((inv) => {
    console.log(
      `  ${inv.invoiceNumber}  status=${inv.status}  total=${inv.total} ${inv.currency}  payments=${inv.payments.length}`,
    );
  });

  if (invoices.length === 0) {
    console.log('\nNothing to revert. Pay an invoice first, or pass --invoice INV-XXXX');
    return;
  }

  const invoiceIds = invoices.map((i) => i.id);
  const paymentIds = invoices.flatMap((i) => i.payments.map((p) => p.id));

  console.log(`\nMode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'APPLY (reverting now)'}`);

  if (DRY_RUN) {
    console.log('\nDry run complete. To actually revert, run:');
    console.log('  npx ts-node scripts/revert-mailinator-invoice-payment.ts --mode apply');
    if (INVOICE_NUMBER) {
      console.log(`  npx ts-node scripts/revert-mailinator-invoice-payment.ts --mode apply --invoice ${INVOICE_NUMBER}`);
    }
    return;
  }

  if (paymentIds.length) {
    await prisma.paymentAudit.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
  }

  await prisma.invoice.updateMany({
    where: { id: { in: invoiceIds } },
    data: { status: 'sent', paidAt: null },
  });

  console.log(`\n✅ Reverted ${invoices.length} invoice(s). Refresh Family Billing and click Pay Now again.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Revert failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
