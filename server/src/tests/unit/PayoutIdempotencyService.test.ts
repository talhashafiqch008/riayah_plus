import '../helpers/prismaMock';
import { prismaMock } from '../helpers/prismaMock';

// Mock redis before importing the service
jest.mock('../../config/redis', () => ({
  redis: {
    set: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('../../services/WalletService', () => ({
  WalletService: {
    getBalance: jest.fn(),
    debit: jest.fn(),
  },
}));

jest.mock('../../services/NotificationService', () => ({
  NotificationService: { create: jest.fn() },
}));

jest.mock('../../services/AuditService', () => ({
  AuditService: { log: jest.fn() },
}));

import { PayoutIdempotencyService } from '../../services/PayoutIdempotencyService';
import { redis } from '../../config/redis';
import { WalletService } from '../../services/WalletService';

const mockRedis = redis as jest.Mocked<typeof redis>;
const mockWallet = WalletService as jest.Mocked<typeof WalletService>;

describe('PayoutIdempotencyService', () => {
  const mockPayout = {
    id: 'payout-1',
    providerId: 'user-1',
    amount: 500,
    currency: 'QAR',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    processedAt: null,
    failureReason: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns early if Redis lock is already held', async () => {
    (mockRedis.set as jest.Mock).mockResolvedValue(null); // lock already held

    const result = await PayoutIdempotencyService.process('payout-1');

    expect(result.processed).toBe(false);
    expect(result.message).toMatch(/already being processed/i);
  });

  it('returns early if payout is not found', async () => {
    (mockRedis.set as jest.Mock).mockResolvedValue('OK');
    (mockRedis.del as jest.Mock).mockResolvedValue(1);
    prismaMock.payoutRequest.findUnique.mockResolvedValue(null as any);

    const result = await PayoutIdempotencyService.process('payout-1');
    expect(result.processed).toBe(false);
    expect(result.message).toMatch(/not found/i);
  });

  it('returns early if payout is not pending', async () => {
    (mockRedis.set as jest.Mock).mockResolvedValue('OK');
    (mockRedis.del as jest.Mock).mockResolvedValue(1);
    prismaMock.payoutRequest.findUnique.mockResolvedValue({ ...mockPayout, status: 'completed' } as any);

    const result = await PayoutIdempotencyService.process('payout-1');
    expect(result.processed).toBe(false);
    expect(result.message).toMatch(/already in status/i);
  });

  it('returns early if idempotency record already exists', async () => {
    (mockRedis.set as jest.Mock).mockResolvedValue('OK');
    (mockRedis.del as jest.Mock).mockResolvedValue(1);
    prismaMock.payoutRequest.findUnique.mockResolvedValue(mockPayout as any);
    prismaMock.payoutIdempotency.findUnique.mockResolvedValue({ id: 'idem-1', payoutRequestId: 'payout-1', processedAt: new Date(), createdAt: new Date() });

    const result = await PayoutIdempotencyService.process('payout-1');
    expect(result.processed).toBe(false);
    expect(result.message).toMatch(/idempotency record/i);
  });

  it('fails payout if wallet has insufficient balance', async () => {
    (mockRedis.set as jest.Mock).mockResolvedValue('OK');
    (mockRedis.del as jest.Mock).mockResolvedValue(1);
    prismaMock.payoutRequest.findUnique.mockResolvedValue(mockPayout as any);
    prismaMock.payoutIdempotency.findUnique.mockResolvedValue(null as any);
    (mockWallet.getBalance as jest.Mock).mockResolvedValue({ balance: 100, userId: 'user-1', escrow: 0 }); // less than 500

    prismaMock.payoutRequest.update.mockResolvedValue({ ...mockPayout, status: 'failed' } as any);

    const result = await PayoutIdempotencyService.process('payout-1');
    expect(result.processed).toBe(false);
    expect(result.message).toMatch(/insufficient balance/i);
    expect(prismaMock.payoutRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'rejected' }) })
    );
  });

  it('processes payout successfully', async () => {
    (mockRedis.set as jest.Mock).mockResolvedValue('OK');
    (mockRedis.del as jest.Mock).mockResolvedValue(1);
    prismaMock.payoutRequest.findUnique.mockResolvedValue(mockPayout as any);
    prismaMock.payoutIdempotency.findUnique.mockResolvedValue(null as any);
    (mockWallet.getBalance as jest.Mock).mockResolvedValue({ balance: 1000, userId: 'user-1', escrow: 0 }); // sufficient
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.payoutIdempotency.create.mockResolvedValue({} as any);
    prismaMock.payoutRequest.update.mockResolvedValue({ ...mockPayout, status: 'completed' } as any);
    (mockWallet.debit as jest.Mock).mockResolvedValue(undefined);

    const result = await PayoutIdempotencyService.process('payout-1');
    expect(result.processed).toBe(true);
    expect(result.message).toMatch(/processed successfully/i);
    expect(mockWallet.debit).toHaveBeenCalledWith('user-1', 500, 'payout', expect.any(String), 'payout-1', 'PayoutRequest');
  });
});
