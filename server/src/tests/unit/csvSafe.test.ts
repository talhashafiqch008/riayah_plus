import {
  encodeCsvCell,
  csvQuotedField,
  encodeCsvRecord,
  sanitizeAuditEntity,
  sanitizeAuditEntityId,
  sanitizeClientIp,
} from '../../utils/csvSafe';

describe('encodeCsvCell', () => {
  it('prefixes formula-leading values with a single quote', () => {
    expect(encodeCsvCell("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
    expect(encodeCsvCell('+1+1')).toBe("'+1+1");
    expect(encodeCsvCell('-2+3')).toBe("'-2+3");
    expect(encodeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(encodeCsvCell('\t=1+1')).toBe("'\t=1+1");
    expect(encodeCsvCell('\r=1+1')).toBe("'\r=1+1");
  });

  it('leaves safe values unchanged', () => {
    expect(encodeCsvCell('organizations')).toBe('organizations');
    expect(encodeCsvCell('user@example.com')).toBe('user@example.com');
    expect(encodeCsvCell('')).toBe('');
    expect(encodeCsvCell(null)).toBe('');
  });
});

describe('csvQuotedField', () => {
  it('encodes then quotes and escapes inner quotes', () => {
    expect(csvQuotedField('=1+1')).toBe(`"'=1+1"`);
    expect(csvQuotedField('say "hi"')).toBe(`"say ""hi"""`);
  });
});

describe('encodeCsvRecord', () => {
  it('encodes every scalar field', () => {
    expect(
      encodeCsvRecord({
        name: '=HYPERLINK("http://evil")',
        email: 'a@b.com',
        amount: 12,
      }),
    ).toEqual({
      name: "'=HYPERLINK(\"http://evil\")",
      email: 'a@b.com',
      amount: '12',
    });
  });
});

describe('sanitizeAuditEntity', () => {
  it('pascal-cases safe resource slugs', () => {
    expect(sanitizeAuditEntity('organizations')).toBe('Organizations');
    expect(sanitizeAuditEntity('care-episodes')).toBe('CareEpisodes');
  });

  it('maps formula-like or junk paths to UnknownPath', () => {
    expect(sanitizeAuditEntity("=cmd|' /C calc'!A0")).toBe('UnknownPath');
    expect(sanitizeAuditEntity('../../etc')).toBe('UnknownPath');
    expect(sanitizeAuditEntity('has spaces')).toBe('UnknownPath');
  });
});

describe('sanitizeAuditEntityId', () => {
  it('allows cuid-like ids and rejects formulas', () => {
    expect(sanitizeAuditEntityId('clxyz123abc')).toBe('clxyz123abc');
    expect(sanitizeAuditEntityId("=1+1")).toBeUndefined();
    expect(sanitizeAuditEntityId('bad id!')).toBeUndefined();
  });
});

describe('sanitizeClientIp', () => {
  it('accepts IPv4 and IPv6', () => {
    expect(sanitizeClientIp('203.0.113.10')).toBe('203.0.113.10');
    expect(sanitizeClientIp('::1')).toBe('::1');
    expect(sanitizeClientIp('2001:db8::1')).toBe('2001:db8::1');
  });

  it('takes the first hop from a comma list and rejects formulas', () => {
    expect(sanitizeClientIp('198.51.100.1, 10.0.0.1')).toBe('198.51.100.1');
    expect(sanitizeClientIp("=cmd|' /C calc'!A0")).toBeNull();
    expect(sanitizeClientIp('not-an-ip')).toBeNull();
    expect(sanitizeClientIp(undefined)).toBeNull();
  });
});
