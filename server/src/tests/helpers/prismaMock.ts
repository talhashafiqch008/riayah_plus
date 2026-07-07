/**
 * Provides a fully-mocked PrismaClient for unit tests.
 * Import `prismaMock` in a test and call jest.fn() on specific methods.
 *
 * Usage:
 *   import { prismaMock } from '../helpers/prismaMock';
 *   prismaMock.user.findUnique.mockResolvedValue({ id: '1', ... });
 */
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

jest.mock('../../config/database', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

import { prisma } from '../../config/database';

export const prismaMock = prisma as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});
