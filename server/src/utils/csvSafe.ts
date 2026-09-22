/**
 * CSV / spreadsheet formula injection guards (Phase 1E INJ-01/02/03).
 * Prefixes a single quote when a cell would be interpreted as a formula.
 */
import net from 'net';

const FORMULA_PREFIX = /^[\t\r ]*[=+\-@]/;

/** True if the first non-whitespace character is a spreadsheet formula trigger. */
export function isCsvFormulaRisk(value: unknown): boolean {
  if (value == null) return false;
  return FORMULA_PREFIX.test(String(value));
}

/**
 * Neutralise formula-leading cells for spreadsheet consumers.
 * Does not add CSV quoting — callers still quote/escape delimiters as needed.
 */
export function encodeCsvCell(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  if (isCsvFormulaRisk(s)) return `'${s}`;
  return s;
}

/** Quote a CSV field (RFC-style) after formula encoding. */
export function csvQuotedField(value: unknown): string {
  const encoded = encodeCsvCell(value);
  return `"${encoded.replace(/"/g, '""')}"`;
}

/** Apply encodeCsvCell to every string/number value in a record (for csv-writer). */
export function encodeCsvRecord<T extends Record<string, unknown>>(record: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (v == null) {
      out[k] = v;
    } else if (v instanceof Date) {
      out[k] = encodeCsvCell(v.toISOString());
    } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = encodeCsvCell(v);
    } else {
      out[k] = encodeCsvCell(v);
    }
  }
  return out as T;
}

/**
 * Audit entity labels from URL path segments: allow simple resource slugs only.
 * Formula-like or junk paths map to a constant so they never reach CSV as-is.
 */
const SAFE_ENTITY_SEGMENT = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

export function sanitizeAuditEntity(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  if (!SAFE_ENTITY_SEGMENT.test(raw) || isCsvFormulaRisk(raw)) {
    return 'UnknownPath';
  }
  return raw
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** Bound entityId params: allow cuid/uuid-like ids; reject formula prefixes. */
const SAFE_ENTITY_ID = /^[a-zA-Z0-9_-]{1,128}$/;

export function sanitizeAuditEntityId(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  if (isCsvFormulaRisk(raw) || !SAFE_ENTITY_ID.test(raw)) return undefined;
  return raw;
}

/** Accept well-formed IPv4/IPv6 only (INJ-03); otherwise null. */
export function sanitizeClientIp(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const candidate = raw.split(',')[0]?.trim() ?? '';
  if (!candidate || isCsvFormulaRisk(candidate)) return null;
  // Strip optional zone id (fe80::1%eth0)
  const withoutZone = candidate.replace(/%[0-9a-zA-Z._~-]+$/, '');
  return net.isIP(withoutZone) ? withoutZone : null;
}
