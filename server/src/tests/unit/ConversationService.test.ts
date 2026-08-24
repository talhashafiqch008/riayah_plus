import {
  canOpenEpisodeThread,
  conversationTypeForRoles,
  isConversationType,
  isEpisodeMessagingParty,
  matchingDirectThreadWhere,
  messagingBucket,
} from '../../services/ConversationService';

const episode = {
  coordinatorId: 'co-1',
  patientId: 'pat-1',
  careUnit: { familyUserId: 'fam-1' },
  clinicianIds: ['clin-1'],
};

describe('isEpisodeMessagingParty', () => {
  it('includes family, coordinator, patient, and assigned clinician', () => {
    expect(isEpisodeMessagingParty('fam-1', episode)).toBe(true);
    expect(isEpisodeMessagingParty('co-1', episode)).toBe(true);
    expect(isEpisodeMessagingParty('pat-1', episode)).toBe(true);
    expect(isEpisodeMessagingParty('clin-1', episode)).toBe(true);
    expect(isEpisodeMessagingParty('stranger', episode)).toBe(false);
  });
});

describe('canOpenEpisodeThread', () => {
  it('lets family open a thread with the episode coordinator', () => {
    expect(
      canOpenEpisodeThread({
        actor: { userId: 'fam-1', role: 'family' },
        participantId: 'co-1',
        episode,
      }),
    ).toBe(true);
  });

  it('blocks a foreign family from the episode thread', () => {
    expect(
      canOpenEpisodeThread({
        actor: { userId: 'fam-b', role: 'family' },
        participantId: 'co-1',
        episode,
      }),
    ).toBe(false);
  });

  it('blocks opening with someone who is not on the episode', () => {
    expect(
      canOpenEpisodeThread({
        actor: { userId: 'fam-1', role: 'family' },
        participantId: 'random',
        episode,
      }),
    ).toBe(false);
  });

  it('lets admins open a thread with an episode party', () => {
    expect(
      canOpenEpisodeThread({
        actor: { userId: 'admin-1', role: 'admin' },
        participantId: 'fam-1',
        episode,
      }),
    ).toBe(true);
  });
});

describe('conversationTypeForRoles', () => {
  it('maps proposal conversation types from participant roles', () => {
    expect(conversationTypeForRoles('family', 'care_coordinator')).toBe('family_coordinator');
    expect(conversationTypeForRoles('family', 'clinical_staff')).toBe('family_clinical');
    expect(conversationTypeForRoles('care_coordinator', 'doctor')).toBe('coordinator_clinical');
    expect(conversationTypeForRoles('doctor', 'nurse')).toBe('internal_staff');
    expect(conversationTypeForRoles('family', 'family')).toBe('direct');
    expect(messagingBucket('provider')).toBe('clinical');
    expect(isConversationType('family_coordinator')).toBe(true);
    expect(isConversationType('episode')).toBe(false);
  });
});

describe('matchingDirectThreadWhere', () => {
  it('scopes reuse to the same episode (or none)', () => {
    expect(matchingDirectThreadWhere('a', 'b', 'ep-1')).toMatchObject({ episodeId: 'ep-1' });
    expect(matchingDirectThreadWhere('a', 'b', null)).toMatchObject({ episodeId: null });
  });
});
