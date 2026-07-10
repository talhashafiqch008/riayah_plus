import {
  BookingStatus,
  CareEpisodeStatus,
  CarePlanStatus,
} from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

/**
 * M1 stub — shared status transition guards for clinical/scheduling entities.
 * Extend matrices in M2–M5 as modules ship.
 */
export type StateMachineEntity = 'care_episode' | 'care_plan' | 'appointment';

type TransitionMatrix = Record<string, readonly string[]>;

const CARE_EPISODE_TRANSITIONS: TransitionMatrix = {
  intake_submitted: ['under_review', 'validated', 'closed'],
  under_review: ['validated', 'on_hold', 'closed'],
  validated: ['active', 'on_hold', 'closed'],
  active: ['on_hold', 'closed'],
  on_hold: ['active', 'closed'],
  closed: [],
};

const CARE_PLAN_TRANSITIONS: TransitionMatrix = {
  draft: ['submitted_for_approval', 'rejected'],
  submitted_for_approval: ['approved', 'revision_requested', 'rejected'],
  revision_requested: ['draft', 'submitted_for_approval'],
  approved: ['active', 'completed'],
  active: ['revision_requested', 'completed'],
  rejected: ['draft'],
  completed: [],
};

/** Booking + Session (both use BookingStatus). */
const APPOINTMENT_TRANSITIONS: TransitionMatrix = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled', 'no_show'],
  rejected: [],
  cancelled: [],
  completed: [],
  no_show: [],
};

const TRANSITIONS: Record<StateMachineEntity, TransitionMatrix> = {
  care_episode: CARE_EPISODE_TRANSITIONS,
  care_plan: CARE_PLAN_TRANSITIONS,
  appointment: APPOINTMENT_TRANSITIONS,
};

export function canTransition(
  entity: StateMachineEntity,
  from: string,
  to: string,
): boolean {
  if (from === to) return true;
  const allowed = TRANSITIONS[entity][from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function getAllowedTransitions(
  entity: StateMachineEntity,
  from: string,
): string[] {
  return [...(TRANSITIONS[entity][from] ?? [])];
}

export function assertTransition(
  entity: StateMachineEntity,
  from: string,
  to: string,
): void {
  if (canTransition(entity, from, to)) return;

  const allowed = getAllowedTransitions(entity, from);
  throw new AppError(
    `Invalid ${entity.replace('_', ' ')} status transition: ${from} → ${to}.` +
      (allowed.length ? ` Allowed: ${allowed.join(', ')}.` : ' No further transitions.'),
    422,
  );
}

export function assertCareEpisodeTransition(
  from: CareEpisodeStatus,
  to: CareEpisodeStatus,
): void {
  assertTransition('care_episode', from, to);
}

export function assertCarePlanTransition(from: CarePlanStatus, to: CarePlanStatus): void {
  assertTransition('care_plan', from, to);
}

export function assertAppointmentTransition(from: BookingStatus, to: BookingStatus): void {
  assertTransition('appointment', from, to);
}

/** Returns target status after validation (no-op when unchanged). */
export function validateTransition<T extends string>(
  entity: StateMachineEntity,
  current: T,
  next: T,
): T {
  assertTransition(entity, current, next);
  return next;
}
