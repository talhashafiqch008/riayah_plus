import type { Request } from 'express';

/** Global hard cap for list endpoints (Phase 1E INJ-05). */
export const MAX_TAKE = 100;

export type PaginationOpts = {
  defaultLimit?: number;
  /** Override global max (e.g. admin exports already use a separate higher cap). */
  maxTake?: number;
};

/**
 * Parse and clamp page/limit from query. Always returns safe integers.
 * Rejects operator-object / array shapes by coercing via String on the first scalar.
 */
export function parsePagination(
  query: Request['query'] | Record<string, unknown>,
  opts: PaginationOpts = {},
): { page: number; limit: number; skip: number; take: number } {
  const maxTake = opts.maxTake ?? MAX_TAKE;
  const defaultLimit = opts.defaultLimit ?? 20;

  const page = clampInt(firstScalar(query.page), 1, Number.MAX_SAFE_INTEGER, 1);
  const limit = clampInt(firstScalar(query.limit), 1, maxTake, defaultLimit);

  return { page, limit, skip: (page - 1) * limit, take: limit };
}

function firstScalar(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value) && value.length > 0) return firstScalar(value[0]);
  return undefined;
}

function clampInt(
  raw: string | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < min) return Math.min(max, Math.max(min, fallback));
  return Math.min(max, Math.max(min, n));
}
