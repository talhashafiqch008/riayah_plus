import {
  assertAppointmentTransition,
  assertCareEpisodeTransition,
  assertCarePlanTransition,
  canTransition,
  getAllowedTransitions,
  assertTransition,
} from '../../utils/stateMachine';

describe('stateMachine', () => {
  describe('care_episode', () => {
    it('allows intake → under_review → validated → active', () => {
      expect(canTransition('care_episode', 'intake_submitted', 'under_review')).toBe(true);
      expect(canTransition('care_episode', 'under_review', 'validated')).toBe(true);
      expect(canTransition('care_episode', 'validated', 'active')).toBe(true);
    });

    it('blocks skipping validation', () => {
      expect(canTransition('care_episode', 'intake_submitted', 'active')).toBe(false);
    });

    it('allows hold and resume', () => {
      expect(canTransition('care_episode', 'active', 'on_hold')).toBe(true);
      expect(canTransition('care_episode', 'on_hold', 'active')).toBe(true);
    });

    it('blocks transitions from closed', () => {
      expect(getAllowedTransitions('care_episode', 'closed')).toEqual([]);
      expect(() => assertCareEpisodeTransition('closed', 'active')).toThrow(/Invalid/);
    });
  });

  describe('care_plan', () => {
    it('allows draft → submitted → approved', () => {
      expect(canTransition('care_plan', 'draft', 'submitted_for_approval')).toBe(true);
      expect(canTransition('care_plan', 'submitted_for_approval', 'approved')).toBe(true);
    });

    it('allows revision loop', () => {
      expect(canTransition('care_plan', 'submitted_for_approval', 'revision_requested')).toBe(true);
      expect(canTransition('care_plan', 'revision_requested', 'draft')).toBe(true);
      expect(canTransition('care_plan', 'revision_requested', 'submitted_for_approval')).toBe(true);
    });

    it('blocks direct draft → approved', () => {
      expect(canTransition('care_plan', 'draft', 'approved')).toBe(false);
    });
  });

  describe('appointment', () => {
    it('allows full booking lifecycle', () => {
      expect(canTransition('appointment', 'pending', 'accepted')).toBe(true);
      expect(canTransition('appointment', 'accepted', 'in_progress')).toBe(true);
      expect(canTransition('appointment', 'in_progress', 'completed')).toBe(true);
    });

    it('allows cancel from pending or accepted', () => {
      expect(canTransition('appointment', 'pending', 'cancelled')).toBe(true);
      expect(canTransition('appointment', 'accepted', 'cancelled')).toBe(true);
    });

    it('blocks completed → pending', () => {
      expect(canTransition('appointment', 'completed', 'pending')).toBe(false);
      expect(() => assertAppointmentTransition('completed', 'in_progress')).toThrow(/Invalid/);
    });
  });

  it('allows same-status no-op transitions', () => {
    expect(canTransition('care_episode', 'active', 'active')).toBe(true);
    expect(assertTransition('care_episode', 'active', 'active')).toBeUndefined();
  });
});
