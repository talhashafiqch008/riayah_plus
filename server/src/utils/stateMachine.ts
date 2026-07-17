import {
  BookingStatus,
  CareEpisodeStatus,
  CarePlanStatus,
  IntakeStatus,
} from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

/**
 * Shared status transition guards for clinical/scheduling entities.
 * Intake added in M2 — Care Unit / IntakeRecord design.
 * Assessment added in M2 Flow G.
 */
export type StateMachineEntity = 'care_episode' | 'care_plan' | 'appointment' | 'intake' | 'assessment';

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

/** Proposal: Submitted → Under Review → Validated → Episode Created */
const INTAKE_TRANSITIONS: TransitionMatrix = {
  submitted: ['under_review', 'withdrawn'],
  under_review: ['validated', 'submitted', 'withdrawn'],
  validated: ['episode_created'],
  episode_created: [],
  withdrawn: [],
};

const ASSESSMENT_TRANSITIONS: TransitionMatrix = {
  scheduled: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const TRANSITIONS: Record<StateMachineEntity, TransitionMatrix> = {
  care_episode: CARE_EPISODE_TRANSITIONS,
  care_plan: CARE_PLAN_TRANSITIONS,
  appointment: APPOINTMENT_TRANSITIONS,
  intake: INTAKE_TRANSITIONS,
  assessment: ASSESSMENT_TRANSITIONS,
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

export function assertIntakeTransition(from: IntakeStatus, to: IntakeStatus): void {
  assertTransition('intake', from, to);
}

export function assertAssessmentTransition(from: string, to: string): void {
  assertTransition('assessment', from, to);
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
