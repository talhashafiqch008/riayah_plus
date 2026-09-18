/**
 * Coerce Express query values to scalars before Prisma `where` assignment (INJ-04).
 * Extended `qs` can turn `?status[not]=x` into `{ not: 'x' }`; never pass that through.
 */

/** First string scalar from a query value; undefined for objects / missing. */
export function queryString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value) && value.length > 0) return queryString(value[0]);
  return undefined;
}

/** Parse a finite number from a query scalar; undefined if absent/invalid. */
export function queryNumber(value: unknown): number | undefined {
  const s = queryString(value);
  if (s == null) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
