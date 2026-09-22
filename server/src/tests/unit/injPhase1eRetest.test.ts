/**
 * Phase 1E dynamic retest helpers (audit §35.1 / tracker D-01…D-03).
 * These do not need a live Postgres load environment — they prove the
 * remediation controls that made the original attacks unreachable.
 */
import express from 'express';
import request from 'supertest';
import qs from 'qs';
import { parsePagination, MAX_TAKE } from '../../utils/pagination';
import { queryString } from '../../utils/queryScalar';
import { sanitizeClientIp, encodeCsvCell, csvQuotedField } from '../../utils/csvSafe';
import { sanitizeAuditEntity, sanitizeAuditEntityId } from '../../utils/csvSafe';

/** Mirror production INJ-04 control: Express simple query parser. */
function appWithSimpleQueryParser() {
  const app = express();
  app.set('query parser', 'simple');
  app.get('/echo-query', (req, res) => {
    res.json({ query: req.query });
  });
  return app;
}

/** Legacy extended qs behaviour (pre-fix) for contrast. */
function parseExtended(raw: string): Record<string, unknown> {
  return qs.parse(raw) as Record<string, unknown>;
}

describe('D-01 / INJ-04 — query operator injection neutralized', () => {
  it('extended qs WOULD produce Prisma-shaped operator objects (baseline)', () => {
    const parsed = parseExtended('status[not]=pending&type[in][]=a&type[in][]=b');
    expect(parsed.status).toEqual({ not: 'pending' });
    expect(parsed.type).toEqual({ in: ['a', 'b'] });
  });

  it('simple query parser keeps bracket keys as flat strings (production)', async () => {
    const app = appWithSimpleQueryParser();
    const res = await request(app).get('/echo-query?status[not]=pending&limit[gt]=0');
    expect(res.status).toBe(200);
    // Keys are literal "status[not]" / "limit[gt]" — not nested objects
    expect(res.body.query.status).toBeUndefined();
    expect(typeof res.body.query['status[not]']).toBe('string');
    expect(res.body.query['status[not]']).toBe('pending');
    expect(res.body.query['limit[gt]']).toBe('0');
  });

  it('queryString rejects operator objects if they ever appear', () => {
    expect(queryString({ not: 'pending' })).toBeUndefined();
    expect(queryString({ in: ['a', 'b'] })).toBeUndefined();
    expect(queryString('pending')).toBe('pending');
  });
});

describe('D-03 / INJ-05 — pagination take hard-capped', () => {
  it('parsePagination clamps limit=1000000 to MAX_TAKE', () => {
    const { take, limit, page, skip } = parsePagination({
      page: '2',
      limit: '1000000',
    });
    expect(MAX_TAKE).toBe(100);
    expect(take).toBe(100);
    expect(limit).toBe(100);
    expect(page).toBe(2);
    expect(skip).toBe(100);
  });

  it('rejects non-numeric / object limit shapes via fallback', () => {
    expect(parsePagination({ limit: { gt: '0' } as unknown as string }).take).toBe(20);
    expect(parsePagination({ limit: ['999999', '1'] as unknown as string }).take).toBe(100);
  });
});

describe('INJ-01/02/03 retest — CSV + IP + audit entity', () => {
  it('formula cells are quote-prefixed', () => {
    expect(encodeCsvCell("=HYPERLINK(\"http://evil\")")).toMatch(/^'/);
    expect(csvQuotedField('+1+1')).toBe(`"'+1+1"`);
  });

  it('audit entity/entityId bound away from formula paths', () => {
    expect(sanitizeAuditEntity("=cmd|' /C calc'!A0")).toBe('UnknownPath');
    expect(sanitizeAuditEntityId('=1+1')).toBeUndefined();
    expect(sanitizeAuditEntity('organizations')).toBe('Organizations');
  });

  it('non-IP XFF / formula strings are discarded', () => {
    expect(sanitizeClientIp("=cmd|' /C calc'!A0")).toBeNull();
    expect(sanitizeClientIp('not-an-ip')).toBeNull();
    expect(sanitizeClientIp('203.0.113.9')).toBe('203.0.113.9');
  });
});
