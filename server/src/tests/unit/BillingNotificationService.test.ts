import { billingEmailSubject } from '../../services/BillingNotificationService';

describe('billingEmailSubject', () => {
  it('includes the invoice number for generated and sent invoices', () => {
    expect(billingEmailSubject('invoice_generated', 'INV-1')).toBe('Invoice INV-1 is ready');
    expect(billingEmailSubject('invoice_sent', 'INV-1')).toBe('Invoice INV-1 is ready');
  });

  it('covers payment and overdue copy without PHI', () => {
    expect(billingEmailSubject('payment_received', 'INV-1')).toBe('Payment received for INV-1');
    expect(billingEmailSubject('payment_failed', 'INV-1')).toBe('Payment unsuccessful for INV-1');
    expect(billingEmailSubject('invoice_overdue', 'INV-1')).toBe('Invoice INV-1 is past due');
    expect(billingEmailSubject('quotation_generated', 'QUO-1')).toBe('Quotation QUO-1 is ready');
  });
});
