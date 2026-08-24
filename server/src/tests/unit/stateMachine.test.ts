import {
  assertAppointmentTransition,
  assertCareEpisodeTransition,
  assertCarePlanTransition,
  assertIntakeTransition,
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

  describe('intake', () => {
    it('allows submitted → under_review → validated → episode_created', () => {
      expect(canTransition('intake', 'submitted', 'under_review')).toBe(true);
      expect(canTransition('intake', 'under_review', 'validated')).toBe(true);
      expect(canTransition('intake', 'validated', 'episode_created')).toBe(true);
    });

    it('allows withdraw from submitted or under_review', () => {
      expect(canTransition('intake', 'submitted', 'withdrawn')).toBe(true);
      expect(canTransition('intake', 'under_review', 'withdrawn')).toBe(true);
    });

    it('allows send-back under_review → submitted', () => {
      expect(canTransition('intake', 'under_review', 'submitted')).toBe(true);
    });

    it('blocks skipping to episode_created from submitted', () => {
      expect(canTransition('intake', 'submitted', 'episode_created')).toBe(false);
    });

    it('blocks transitions from episode_created and withdrawn', () => {
      expect(getAllowedTransitions('intake', 'episode_created')).toEqual([]);
      expect(getAllowedTransitions('intake', 'withdrawn')).toEqual([]);
      expect(() => assertIntakeTransition('episode_created', 'validated')).toThrow(/Invalid/);
    });
  });

  describe('assessment', () => {
    it('allows scheduled → completed or cancelled', () => {
      expect(canTransition('assessment', 'scheduled', 'completed')).toBe(true);
      expect(canTransition('assessment', 'scheduled', 'cancelled')).toBe(true);
    });

    it('blocks transitions from completed', () => {
      expect(getAllowedTransitions('assessment', 'completed')).toEqual([]);
      expect(canTransition('assessment', 'completed', 'scheduled')).toBe(false);
    });
  });

  it('allows same-status no-op transitions', () => {
    expect(canTransition('care_episode', 'active', 'active')).toBe(true);
    expect(assertTransition('care_episode', 'active', 'active')).toBeUndefined();
  });

  describe('invoice', () => {
    it('allows draft → sent → paid', () => {
      expect(canTransition('invoice', 'draft', 'sent')).toBe(true);
      expect(canTransition('invoice', 'sent', 'paid')).toBe(true);
    });

    it('allows sent → overdue → paid and dispute path', () => {
      expect(canTransition('invoice', 'sent', 'overdue')).toBe(true);
      expect(canTransition('invoice', 'overdue', 'paid')).toBe(true);
      expect(canTransition('invoice', 'sent', 'disputed')).toBe(true);
      expect(canTransition('invoice', 'disputed', 'paid')).toBe(true);
    });

    it('blocks draft → paid and paid → sent', () => {
      expect(canTransition('invoice', 'draft', 'paid')).toBe(false);
      expect(canTransition('invoice', 'paid', 'sent')).toBe(false);
    });
  });
});
