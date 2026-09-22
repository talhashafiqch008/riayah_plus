import { Request, Response } from 'express';
import { sanitizeForwardedForHeader, resolveTrustedClientIp } from '../../middleware/clientIp';

function mockReq(overrides: Partial<Request> & { headers?: Record<string, string | string[] | undefined> }): Request {
  return {
    ip: undefined,
    socket: { remoteAddress: '10.0.0.1' },
    headers: {},
    ...overrides,
  } as unknown as Request;
}

describe('sanitizeForwardedForHeader', () => {
  it('strips formula and non-IP hops', () => {
    const req = mockReq({
      headers: { 'x-forwarded-for': "=cmd|' /C calc'!A0, 203.0.113.10, not-an-ip" },
    });
    sanitizeForwardedForHeader(req, {} as Response, () => undefined);
    expect(req.headers['x-forwarded-for']).toBe('203.0.113.10');
  });

  it('deletes header when nothing valid remains', () => {
    const req = mockReq({
      headers: { 'x-forwarded-for': '=HYPERLINK("http://evil")' },
    });
    sanitizeForwardedForHeader(req, {} as Response, () => undefined);
    expect(req.headers['x-forwarded-for']).toBeUndefined();
  });
});

describe('resolveTrustedClientIp', () => {
  it('prefers a valid req.ip', () => {
    const req = mockReq({ ip: '198.51.100.20' });
    expect(resolveTrustedClientIp(req)).toBe('198.51.100.20');
  });

  it('falls back when req.ip is a formula string', () => {
    const req = mockReq({
      ip: "=cmd|' /C calc'!A0",
      socket: { remoteAddress: '10.0.0.5' } as Request['socket'],
    });
    expect(resolveTrustedClientIp(req)).toBe('10.0.0.5');
  });
});
