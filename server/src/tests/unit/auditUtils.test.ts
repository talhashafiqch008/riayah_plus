import { redactForAudit } from '../../utils/auditRedact';
import { buildDeviceInfo } from '../../utils/deviceInfo';
import { Request } from 'express';

describe('auditRedact', () => {
  it('redacts sensitive keys including email, content, and transcript', () => {
    const result = redactForAudit({
      email: 'a@b.com',
      password: 'secret',
      content: 'clinical chat PHI',
      transcript: 'session transcript PHI',
      nested: { token: 'abc', name: 'ok', completeText: 'full transcript' },
    }) as Record<string, unknown>;

    expect(result.email).toBe('[REDACTED]');
    expect(result.password).toBe('[REDACTED]');
    expect(result.content).toBe('[REDACTED]');
    expect(result.transcript).toBe('[REDACTED]');
    expect((result.nested as Record<string, unknown>).token).toBe('[REDACTED]');
    expect((result.nested as Record<string, unknown>).name).toBe('ok');
    expect((result.nested as Record<string, unknown>).completeText).toBe('[REDACTED]');
  });

  it('does not expand raw Buffer bodies into byte maps (TM-026)', () => {
    const raw = Buffer.from('{"payer_email":"x@y.com"}');
    expect(redactForAudit(raw)).toBe('[REDACTED_RAW_BODY]');
    const wrapped = redactForAudit({ body: raw }) as Record<string, unknown>;
    expect(wrapped.body).toBe('[REDACTED_RAW_BODY]');
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
