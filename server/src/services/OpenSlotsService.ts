import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  findProviderSessionConflicts,
  parseHmToMinutes,
  sessionWindow,
  windowsOverlap,
} from './SchedulingConflictService';

export type OpenSlot = {
  start: string;
  end: string;
};

export type DaySlotStatus = 'available' | 'booked' | 'past';

export type DaySlot = OpenSlot & {
  status: DaySlotStatus;
};

export type WeeklyWindow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const DEFAULT_STEP_MINUTES = 30;
/** No same-day last-minute bookings within this lead time. */
const MIN_LEAD_MINUTES = 60;

/**
 * Wall-clock offset for care scheduling (Qatar has no DST).
 * Override with APP_TZ_OFFSET_MINUTES if needed.
 */
const TZ_OFFSET_MINUTES = Number(process.env.APP_TZ_OFFSET_MINUTES ?? 180);

function ymdParts(ymd: string): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) throw new AppError('date must be YYYY-MM-DD.', 422);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** Calendar YYYY-MM-DD → day of week (0=Sun) in the app timezone. */
export function ymdDayOfWeek(ymd: string): number {
  const { y, m, d } = ymdParts(ymd);
  // Noon UTC keeps the civil date stable for ±12h offsets.
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

/** Wall-clock HH:mm on a calendar date in the app timezone → UTC Date. */
export function wallClockToUtc(ymd: string, hm: string): Date {
  const { y, m, d } = ymdParts(ymd);
  const mins = parseHmToMinutes(hm);
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0) - TZ_OFFSET_MINUTES * 60_000);
}

export function utcToWallYmd(date: Date): string {
  const shifted = new Date(date.getTime() + TZ_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

function addCalendarDays(ymd: string, n: number): string {
  const { y, m, d } = ymdParts(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d + n, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

function eachYmd(fromYmd: string, toYmd: string): string[] {
  const out: string[] = [];
  for (let cur = fromYmd; cur <= toYmd; cur = addCalendarDays(cur, 1)) {
    out.push(cur);
  }
  return out;
}

type ProfileSchedule = {
  days?: unknown;
  windows?: unknown;
};

function windowsFromProfile(schedule: unknown): WeeklyWindow[] {
  if (!schedule || typeof schedule !== 'object') return [];
  const s = schedule as ProfileSchedule;
  const days = Array.isArray(s.days)
    ? s.days.filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6)
    : [];
  const windows = Array.isArray(s.windows)
    ? s.windows
        .map((w) => {
          if (!w || typeof w !== 'object') return null;
          const start = (w as { start?: unknown }).start;
          const end = (w as { end?: unknown }).end;
          if (typeof start !== 'string' || typeof end !== 'string') return null;
          try {
            parseHmToMinutes(start);
            parseHmToMinutes(end);
          } catch {
            return null;
          }
          if (parseHmToMinutes(end) <= parseHmToMinutes(start)) return null;
          return { start, end };
        })
        .filter((w): w is { start: string; end: string } => Boolean(w))
    : [];
  if (!days.length || !windows.length) return [];
  const out: WeeklyWindow[] = [];
  for (const dayOfWeek of days) {
    for (const w of windows) {
      out.push({ dayOfWeek, startTime: w.start, endTime: w.end });
    }
  }
  return out;
}

/** Prefer coordinator slot table; fall back to clinician profile schedule. */
export async function loadWeeklyAvailability(providerId: string): Promise<WeeklyWindow[]> {
  const rows = await prisma.providerAvailabilitySlot.findMany({
    where: { providerId, isAvailable: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
  if (rows.length) {
    return rows.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
    }));
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: providerId },
    select: { availabilitySchedule: true },
  });
  return windowsFromProfile(profile?.availabilitySchedule);
}

/**
 * Expand weekly availability into bookable starts for a calendar date range,
 * marking overlaps with existing sessions as booked (not omitted).
 */
export async function computeDayAgenda(params: {
  providerId: string;
  /** Inclusive calendar dates YYYY-MM-DD in app timezone. */
  fromYmd: string;
  toYmd: string;
  durationMinutes: number;
  stepMinutes?: number;
}): Promise<{
  hasAvailability: boolean;
  windows: WeeklyWindow[];
  slots: DaySlot[];
  timezone: string;
  leadMinutes: number;
}> {
  const duration = params.durationMinutes;
  const step = params.stepMinutes ?? DEFAULT_STEP_MINUTES;
  if (duration < 15 || duration > 480) {
    throw new AppError('durationMinutes must be between 15 and 480.', 422);
  }

  const weekly = await loadWeeklyAvailability(params.providerId);
  const ymds = eachYmd(params.fromYmd, params.toYmd);
  if (!ymds.length) {
    return {
      hasAvailability: weekly.length > 0,
      windows: weekly,
      slots: [],
      timezone: 'Asia/Qatar',
      leadMinutes: MIN_LEAD_MINUTES,
    };
  }

  const rangeStart = wallClockToUtc(ymds[0]!, '00:00');
  const rangeEnd = wallClockToUtc(addCalendarDays(ymds[ymds.length - 1]!, 1), '00:00');

  const busy = await prisma.session.findMany({
    where: {
      providerId: params.providerId,
      status: { in: ['pending', 'accepted', 'in_progress'] },
      scheduledAt: {
        gte: new Date(rangeStart.getTime() - 24 * 60 * 60_000),
        lte: new Date(rangeEnd.getTime() + 24 * 60 * 60_000),
      },
    },
    select: { scheduledAt: true, durationMinutes: true },
  });
  const busyWindows = busy.map((s) =>
    sessionWindow(s.scheduledAt, s.durationMinutes ?? 60),
  );

  const now = new Date();
  const earliest = new Date(now.getTime() + MIN_LEAD_MINUTES * 60_000);
  const slots: DaySlot[] = [];

  for (const ymd of ymds) {
    const dow = ymdDayOfWeek(ymd);
    const dayWindows = weekly.filter((w) => w.dayOfWeek === dow);
    for (const win of dayWindows) {
      const windowStart = wallClockToUtc(ymd, win.startTime);
      const windowEnd = wallClockToUtc(ymd, win.endTime);
      for (
        let start = new Date(windowStart);
        start.getTime() + duration * 60_000 <= windowEnd.getTime();
        start = new Date(start.getTime() + step * 60_000)
      ) {
        const candidate = sessionWindow(start, duration);
        const booked = busyWindows.some((b) => windowsOverlap(candidate, b));
        let status: DaySlotStatus;
        if (booked) status = 'booked';
        else if (start < earliest) status = 'past';
        else status = 'available';

        slots.push({
          start: start.toISOString(),
          end: candidate.end.toISOString(),
          status,
        });
      }
    }
  }

  return {
    hasAvailability: weekly.length > 0,
    windows: weekly,
    slots,
    timezone: 'Asia/Qatar',
    leadMinutes: MIN_LEAD_MINUTES,
  };
}

/** Available-only starts (legacy helpers / conflict assert). */
export async function computeOpenSlots(params: {
  providerId: string;
  from: Date;
  to: Date;
  durationMinutes: number;
  stepMinutes?: number;
}): Promise<OpenSlot[]> {
  const fromYmd = utcToWallYmd(params.from);
  const toYmd = utcToWallYmd(params.to);
  const agenda = await computeDayAgenda({
    providerId: params.providerId,
    fromYmd,
    toYmd,
    durationMinutes: params.durationMinutes,
    stepMinutes: params.stepMinutes,
  });
  return agenda.slots
    .filter((s) => s.status === 'available')
    .map(({ start, end }) => ({ start, end }));
}

/** Double-check a chosen start is still open (availability + conflicts). */
export async function assertSlotStillOpen(params: {
  providerId: string;
  scheduledAt: Date;
  durationMinutes: number;
}): Promise<void> {
  const ymd = utcToWallYmd(params.scheduledAt);
  const agenda = await computeDayAgenda({
    providerId: params.providerId,
    fromYmd: ymd,
    toYmd: ymd,
    durationMinutes: params.durationMinutes,
  });
  const hit = agenda.slots.find(
    (s) =>
      s.status === 'available' &&
      new Date(s.start).getTime() === params.scheduledAt.getTime(),
  );
  if (hit) return;

  const conflicts = await findProviderSessionConflicts(params);
  if (conflicts.length > 0) {
    throw new AppError('That time is no longer available.', 409, {
      code: 'SCHEDULING_CONFLICT',
    });
  }
  if (!agenda.hasAvailability) {
    throw new AppError(
      'This clinician has no availability set. Ask your coordinator to set their hours.',
      422,
      { code: 'NO_AVAILABILITY' },
    );
  }
  throw new AppError("That time is outside the clinician's available hours.", 422, {
    code: 'SLOT_UNAVAILABLE',
  });
}
