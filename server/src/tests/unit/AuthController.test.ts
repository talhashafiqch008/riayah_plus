import '../helpers/prismaMock';
import { prismaMock } from '../helpers/prismaMock';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';

jest.mock('../../services/NotificationService', () => ({ NotificationService: { create: jest.fn() } }));
jest.mock('../../services/EmailService', () => ({ EmailService: { sendWelcome: jest.fn(), sendPasswordReset: jest.fn() } }));
jest.mock('../../services/AuditService', () => ({ AuditService: { log: jest.fn() } }));
jest.mock('../../config/redis', () => ({ redis: { set: jest.fn(), get: jest.fn(), del: jest.fn() } }));

import { AuthController } from '../../controllers/auth/AuthController';
import { hashRefreshToken } from '../../utils/refreshTokenHash';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res as Response;
}

function mockReq(body = {}, user = {}) {
  return { body, user, headers: {}, ip: '127.0.0.1' } as unknown as Request;
}

describe('AuthController.login', () => {
  it('returns 401 when user is not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null as any);
    const req = mockReq({ email: 'noone@test.com', password: 'Password123!' });
    const res = mockRes();

    await expect(AuthController.login(req, res)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('returns 401 when password does not match', async () => {
    const hash = await bcrypt.hash('correct-password', 1);
    prismaMock.user.findUnique.mockResolvedValue({
      id: '1', email: 'u@test.com', passwordHash: hash, role: 'client', isActive: true, twoFactorEnabled: false,
    } as any);

    const req = mockReq({ email: 'u@test.com', password: 'wrong-password' });
    const res = mockRes();

    await expect(AuthController.login(req, res)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('returns tokens on successful login', async () => {
    const hash = await bcrypt.hash('Password123!', 1);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-1', name: 'Test', email: 'u@test.com', passwordHash: hash,
      role: 'client', isActive: true, twoFactorEnabled: false, isEmailVerified: true, deletedAt: null,
    } as any);
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt-1' } as any);

    const req = mockReq({ email: 'u@test.com', password: 'Password123!' });
    const res = mockRes();

    await AuthController.login(req, res);

    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u-1',
          token: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    );

    const createCall = prismaMock.refreshToken.create.mock.calls[0][0] as {
      data: { token: string };
    };
    const responseBody = (res.json as jest.Mock).mock.calls[0][0] as { refreshToken: string };
    expect(createCall.data.token).toBe(hashRefreshToken(responseBody.refreshToken));
    expect(createCall.data.token).not.toBe(responseBody.refreshToken);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.any(String),
        refreshToken: expect.any(String),
      })
    );
  });
});
