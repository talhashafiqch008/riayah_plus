import '../helpers/prismaMock';
import { prismaMock } from '../helpers/prismaMock';
import { Request, Response } from 'express';

jest.mock('../../services/AuditService', () => ({ AuditService: { log: jest.fn() } }));

import { DeviceTokenController } from '../../controllers/auth/DeviceTokenController';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function mockReq(body = {}, params = {}) {
  return {
    body,
    params,
    user: { userId: 'user-1', role: 'client', email: 'u@test.com' },
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;
}

describe('DeviceTokenController', () => {
  it('creates a new device token', async () => {
    prismaMock.pushNotificationToken.findUnique.mockResolvedValue(null);
    prismaMock.pushNotificationToken.create.mockResolvedValue({
      id: 'dt-1',
      userId: 'user-1',
      token: 'fcm-token',
      platform: 'ios',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const req = mockReq({ token: 'fcm-token', platform: 'ios' });
    const res = mockRes();

    await DeviceTokenController.register(req, res);

    expect(prismaMock.pushNotificationToken.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', token: 'fcm-token', platform: 'ios' },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        device: expect.objectContaining({ id: 'dt-1', platform: 'ios' }),
      }),
    );
  });

  it('reassigns an existing token to the current user', async () => {
    prismaMock.pushNotificationToken.findUnique.mockResolvedValue({
      id: 'dt-1',
      userId: 'other-user',
      token: 'fcm-token',
      platform: 'android',
      isActive: false,
    } as any);
    prismaMock.pushNotificationToken.update.mockResolvedValue({
      id: 'dt-1',
      userId: 'user-1',
      token: 'fcm-token',
      platform: 'ios',
      isActive: true,
      updatedAt: new Date(),
    } as any);

    const req = mockReq({ token: 'fcm-token', platform: 'ios' });
    const res = mockRes();

    await DeviceTokenController.register(req, res);

    expect(prismaMock.pushNotificationToken.update).toHaveBeenCalledWith({
      where: { id: 'dt-1' },
      data: { userId: 'user-1', platform: 'ios', isActive: true },
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('lists active devices without token values', async () => {
    prismaMock.pushNotificationToken.findMany.mockResolvedValue([
      { id: 'dt-1', platform: 'web', createdAt: new Date(), updatedAt: new Date() },
    ] as any);

    const req = mockReq();
    const res = mockRes();

    await DeviceTokenController.list(req, res);

    expect(prismaMock.pushNotificationToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', isActive: true },
        select: expect.not.objectContaining({ token: true }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ devices: expect.any(Array) });
  });

  it('revokes a device token by id', async () => {
    prismaMock.pushNotificationToken.updateMany.mockResolvedValue({ count: 1 });

    const req = mockReq({}, { id: 'dt-1' });
    const res = mockRes();

    await DeviceTokenController.revokeById(req, res);

    expect(prismaMock.pushNotificationToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'dt-1', userId: 'user-1', isActive: true },
      data: { isActive: false },
    });
    expect(res.json).toHaveBeenCalledWith({ message: 'Device token revoked.' });
  });

  it('returns 404 when revoking unknown device id', async () => {
    prismaMock.pushNotificationToken.updateMany.mockResolvedValue({ count: 0 });

    const req = mockReq({}, { id: 'missing' });
    const res = mockRes();

    await expect(DeviceTokenController.revokeById(req, res)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
