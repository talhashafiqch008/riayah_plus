import { redactForAudit } from '../../utils/auditRedact';
import { buildDeviceInfo } from '../../utils/deviceInfo';
import { Request } from 'express';

describe('auditRedact', () => {
  it('redacts sensitive keys', () => {
    const result = redactForAudit({
      email: 'a@b.com',
      password: 'secret',
      nested: { token: 'abc', name: 'ok' },
    }) as Record<string, unknown>;

    expect(result.email).toBe('a@b.com');
    expect(result.password).toBe('[REDACTED]');
    expect((result.nested as Record<string, unknown>).token).toBe('[REDACTED]');
    expect((result.nested as Record<string, unknown>).name).toBe('ok');
  });
});

describe('buildDeviceInfo', () => {
  it('parses a desktop Chrome user agent', () => {
    const req = {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    } as Request;

    const info = buildDeviceInfo(req);
    expect(info.browser).toBe('Chrome');
    expect(info.os).toBe('macOS');
    expect(info.deviceType).toBe('desktop');
    expect(info.isMobile).toBe(false);
  });
});
