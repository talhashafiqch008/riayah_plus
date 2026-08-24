import { reconcileInvoicesAndPayments } from '../../services/ReconciliationService';

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    invoiceNumber: 'INV-1',
    status: 'paid',
    type: 'invoice',
    total: 84,
    currency: 'QAR',
    paidAt: new Date('2026-08-13T12:00:00Z'),
    ...overrides,
  };
}

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    invoiceId: 'inv-1',
    bookingId: null as string | null,
    amount: 84,
    currency: 'QAR',
    status: 'paid',
    type: 'charge',
    gateway: 'paytabs',
    gatewayRef: 'TST-1',
    ...overrides,
  };
}

describe('reconcileInvoicesAndPayments', () => {
  it('matches a paid invoice to a gateway payment of the same amount', () => {
    const report = reconcileInvoicesAndPayments([invoice()], [payment()]);
    expect(report.summary.matchedCount).toBe(1);
    expect(report.summary.mismatchCount).toBe(0);
    expect(report.summary.delta).toBe(0);
    expect(report.matched[0].invoiceId).toBe('inv-1');
    expect(report.matched[0].paymentIds).toEqual(['pay-1']);
  });

  it('flags a paid invoice with no settlement', () => {
    const report = reconcileInvoicesAndPayments([invoice()], []);
    expect(report.summary.matchedCount).toBe(0);
    expect(report.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'paid_invoice_no_payment', invoiceId: 'inv-1' }),
      ]),
    );
  });

  it('flags amount mismatch between invoice and payments', () => {
    const report = reconcileInvoicesAndPayments([invoice()], [payment({ amount: 50 })]);
    expect(report.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'amount_mismatch',
          invoiceId: 'inv-1',
          invoiceTotal: 84,
          paymentTotal: 50,
        }),
      ]),
    );
  });

  it('flags unpaid invoice that already has a paid settlement', () => {
    const report = reconcileInvoicesAndPayments(
      [invoice({ status: 'sent', paidAt: null })],
      [payment()],
    );
    expect(report.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invoice_unpaid_with_payment', invoiceId: 'inv-1' }),
      ]),
    );
  });

  it('flags orphan gateway settlement with no invoice or booking', () => {
    const report = reconcileInvoicesAndPayments(
      [],
      [payment({ invoiceId: null, bookingId: null, gatewayRef: 'ORPHAN' })],
    );
    expect(report.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'orphan_settlement', paymentId: 'pay-1' }),
      ]),
    );
  });

  it('ignores booking marketplace payments that are not invoice settlements', () => {
    const report = reconcileInvoicesAndPayments(
      [],
      [payment({ invoiceId: null, bookingId: 'bkg-1' })],
    );
    expect(report.summary.mismatchCount).toBe(0);
    expect(report.mismatches).toHaveLength(0);
  });

  it('skips quotations from paid-settlement matching', () => {
    const report = reconcileInvoicesAndPayments(
      [invoice({ type: 'quotation', status: 'sent', paidAt: null })],
      [],
    );
    expect(report.summary.matchedCount).toBe(0);
    expect(report.mismatches).toHaveLength(0);
  });

  it('nets refunds against charges when comparing amounts', () => {
    const report = reconcileInvoicesAndPayments(
      [invoice({ total: 84 })],
      [
        payment({ id: 'pay-charge', amount: 84 }),
        payment({ id: 'pay-refund', type: 'refund', amount: 84, gatewayRef: 'REF-1' }),
      ],
    );
    expect(report.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'amount_mismatch', paymentTotal: 0 }),
      ]),
    );
  });

  it('flags currency mismatch even when amounts match', () => {
    const report = reconcileInvoicesAndPayments(
      [invoice()],
      [payment({ currency: 'USD' })],
    );
    expect(report.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'currency_mismatch', invoiceId: 'inv-1' }),
      ]),
    );
  });
});
