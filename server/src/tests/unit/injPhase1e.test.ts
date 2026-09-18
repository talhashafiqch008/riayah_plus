import crypto from 'crypto';
import { Request, Response } from 'express';
import { parsePagination, MAX_TAKE } from '../../utils/pagination';
import { queryString, queryNumber } from '../../utils/queryScalar';
import { s3KeyFromRecordingUrl } from '../../services/TelehealthRecordingService';
import { verifyWhatsAppSignature, parseWhatsAppRawBody } from '../../middleware/whatsappSignature';

describe('parsePagination', () => {
  it('clamps oversized limit to MAX_TAKE', () => {
    const result = parsePagination({ page: '1', limit: '1000000' });
    expect(result.take).toBe(MAX_TAKE);
    expect(result.limit).toBe(MAX_TAKE);
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('defaults sensibly and rejects non-scalars', () => {
    expect(parsePagination({}).limit).toBe(20);
    expect(parsePagination({ page: { not: '1' } as unknown as string }).page).toBe(1);
  });
});

describe('queryString', () => {
  it('returns scalars and rejects operator objects', () => {
    expect(queryString('open')).toBe('open');
    expect(queryString({ not: 'open' })).toBeUndefined();
    expect(queryString(['a', 'b'])).toBe('a');
    expect(queryNumber('12.5')).toBe(12.5);
    expect(queryNumber({ gt: '0' })).toBeUndefined();
  });
});

describe('s3KeyFromRecordingUrl host anchoring', () => {
  it('accepts real S3 hosts and rejects lookalikes', () => {
    expect(
      s3KeyFromRecordingUrl('https://my-bucket.s3.eu-west-1.amazonaws.com/telehealth-recordings/a.mp4'),
    ).toBe('telehealth-recordings/a.mp4');
    expect(s3KeyFromRecordingUrl('https://notamazonaws.com/telehealth-recordings/a.mp4')).toBeNull();
    expect(s3KeyFromRecordingUrl('https://evil.s3.example.com/telehealth-recordings/a.mp4')).toBeNull();
  });
});

describe('WhatsApp signature verify', () => {
  const secret = 'test-app-secret';
  const prev = process.env.WHATSAPP_APP_SECRET;

  beforeAll(() => {
    process.env.WHATSAPP_APP_SECRET = secret;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const envMod = require('../../config/env') as { env: { WHATSAPP_APP_SECRET: string } };
    envMod.env.WHATSAPP_APP_SECRET = secret;
  });

  afterAll(() => {
    process.env.WHATSAPP_APP_SECRET = prev;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const envMod = require('../../config/env') as { env: { WHATSAPP_APP_SECRET: string } };
    envMod.env.WHATSAPP_APP_SECRET = prev || '';
  });

  function mockRes() {
    const res = {
      statusCode: 200,
      sendStatus(code: number) {
        this.statusCode = code;
      },
    };
    return res as unknown as Response & { statusCode: number };
  }

  it('rejects missing signature', () => {
    const req = {
      get: () => undefined,
      body: Buffer.from('{}'),
    } as unknown as Request;
    const res = mockRes();
    let nextCalled = false;
    verifyWhatsAppSignature(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('accepts valid HMAC', () => {
    const raw = Buffer.from('{"object":"whatsapp_business_account"}');
    const sig = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const req = {
      get: (h: string) => (h.toLowerCase() === 'x-hub-signature-256' ? `sha256=${sig}` : undefined),
      body: raw,
    } as unknown as Request;
    const res = mockRes();
    let nextCalled = false;
    verifyWhatsAppSignature(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(parseWhatsAppRawBody(req)).toEqual({ object: 'whatsapp_business_account' });
  });
});
