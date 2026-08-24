import '../helpers/prismaMock';
import { prismaMock } from '../helpers/prismaMock';

jest.mock('../../services/BillingNotificationService', () => ({
  notifyBillingEvent: jest.fn(),
}));
jest.mock('../../services/AuditService', () => ({
  AuditService: { log: jest.fn() },
}));
jest.mock('../../services/InvoicePDFService', () => ({
  InvoicePDFService: { generateAndUpload: jest.fn() },
}));
jest.mock('../../services/ServiceCatalog', () => ({
  resolveCatalogService: jest.fn(),
}));

import { InvoiceService } from '../../services/InvoiceService';
import { notifyBillingEvent } from '../../services/BillingNotificationService';

describe('InvoiceService.markOverdueInvoices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks sent invoices overdue and notifies the family', async () => {
    prismaMock.invoice.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        clientId: 'fam',
        invoiceNumber: 'INV-1',
        total: 84,
        currency: 'QAR',
      },
    ] as never);
    prismaMock.invoice.updateMany.mockResolvedValue({ count: 1 } as never);

    const result = await InvoiceService.markOverdueInvoices(new Date('2026-08-13T00:00:00Z'));

    expect(result).toEqual({ marked: 1 });
    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'sent', type: 'invoice' }),
      }),
    );
    expect(notifyBillingEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'fam',
        type: 'invoice_overdue',
        invoiceNumber: 'INV-1',
      }),
    );
  });

  it('is a no-op when nothing is past due', async () => {
    prismaMock.invoice.findMany.mockResolvedValue([]);
    await expect(InvoiceService.markOverdueInvoices()).resolves.toEqual({ marked: 0 });
    expect(prismaMock.invoice.updateMany).not.toHaveBeenCalled();
    expect(notifyBillingEvent).not.toHaveBeenCalled();
  });
});
