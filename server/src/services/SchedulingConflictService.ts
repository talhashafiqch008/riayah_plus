import { BookingStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

/** Session statuses that still occupy the provider's calendar. */
const BLOCKING_STATUSES: BookingStatus[] = [
  'pending',
  'accepted',
  'in_progress',
];

export type TimeWindow = {
  start: Date;
  end: Date;
};

export function sessionWindow(scheduledAt: Date, durationMinutes: number): TimeWindow {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { start, end };
}

export function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.start < b.end && a.end > b.start;
}

export type ConflictHit = {
  sessionId: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: BookingStatus;
  episodeId: string | null;
};

/**
 * Find overlapping care sessions for a provider.
 * Optionally exclude a session id (for reschedule).
 */
export async function findProviderSessionConflicts(params: {
  providerId: string;
  scheduledAt: Date;
  durationMinutes: number;
  excludeSessionId?: string;
}): Promise<ConflictHit[]> {
  const window = sessionWindow(params.scheduledAt, params.durationMinutes);
  // Broad window: load sessions that could overlap (± 24h padding around start)
  const rangeStart = new Date(window.start.getTime() - 24 * 60 * 60_000);
  const rangeEnd = new Date(window.end.getTime() + 24 * 60 * 60_000);

  const candidates = await prisma.session.findMany({
    where: {
      providerId: params.providerId,
      status: { in: BLOCKING_STATUSES },
      scheduledAt: { gte: rangeStart, lte: rangeEnd },
      ...(params.excludeSessionId ? { id: { not: params.excludeSessionId } } : {}),
    },
    select: {
      id: true,
      scheduledAt: true,
      durationMinutes: true,
      status: true,
      episodeId: true,
    },
  });

  return candidates
    .map((s) => ({
      sessionId: s.id,
      scheduledAt: s.scheduledAt,
      durationMinutes: s.durationMinutes ?? 60,
      status: s.status,
      episodeId: s.episodeId,
    }))
    .filter((s) =>
      windowsOverlap(window, sessionWindow(s.scheduledAt, s.durationMinutes)),
    );
}

export async function assertNoProviderConflict(params: {
  providerId: string;
  scheduledAt: Date;
  durationMinutes: number;
  excludeSessionId?: string;
}): Promise<void> {
  const conflicts = await findProviderSessionConflicts(params);
  if (conflicts.length === 0) return;

  throw new AppError(
    'Scheduling conflict: provider already has a session overlapping this time.',
    409,
    {
      code: 'SCHEDULING_CONFLICT',
      conflicts: conflicts.map((c) => ({
        sessionId: c.sessionId,
        scheduledAt: c.scheduledAt.toISOString(),
        durationMinutes: c.durationMinutes,
        status: c.status,
        episodeId: c.episodeId,
      })),
    },
  );
}

/** Parse HH:mm and return minutes from midnight. */
export function parseHmToMinutes(hm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) throw new AppError('Time must be HH:mm (24h).', 422);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) throw new AppError('Invalid time value.', 422);
  return h * 60 + min;
}

export function assertValidAvailabilityRange(startTime: string, endTime: string): void {
  const start = parseHmToMinutes(startTime);
  const end = parseHmToMinutes(endTime);
  if (end <= start) {
    throw new AppError('endTime must be after startTime.', 422);
  }
}

export type RecurrenceRule = {
  frequency: 'daily' | 'weekly';
  /** Number of occurrences including the first. */
  count: number;
  /** Skip interval (1 = every day/week). */
  interval?: number;
};

export function expandRecurrence(startAt: Date, rule: RecurrenceRule): Date[] {
  const interval = rule.interval && rule.interval > 0 ? rule.interval : 1;
  const count = Math.min(Math.max(rule.count, 1), 52);
  const dates: Date[] = [];
  const stepMs =
    rule.frequency === 'daily'
      ? interval * 24 * 60 * 60_000
      : interval * 7 * 24 * 60 * 60_000;

  for (let i = 0; i < count; i++) {
    dates.push(new Date(startAt.getTime() + i * stepMs));
  }
  return dates;
}

export function isPrismaKnownError(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError;
}
