import {
  noteVisibleToViewer,
  pickActiveCarePlan,
  shapeTelehealthContext,
} from '../../services/TelehealthContextService';

describe('pickActiveCarePlan', () => {
  it('prefers the current approved plan', () => {
    const plans = [
      { id: 'draft', status: 'draft', isCurrentVersion: true, version: 2, approvedAt: null },
      { id: 'approved', status: 'approved', isCurrentVersion: true, version: 1, approvedAt: new Date() },
    ];
    expect(pickActiveCarePlan(plans)?.id).toBe('approved');
  });

  it('falls back to the current version when none are approved', () => {
    const plans = [
      { id: 'old', status: 'draft', isCurrentVersion: false, version: 1, approvedAt: null },
      { id: 'current', status: 'submitted_for_approval', isCurrentVersion: true, version: 2, approvedAt: null },
    ];
    expect(pickActiveCarePlan(plans)?.id).toBe('current');
  });

  it('returns null when there are no plans', () => {
    expect(pickActiveCarePlan([])).toBeNull();
  });
});

describe('noteVisibleToViewer', () => {
  const note = { authorId: 'clin-1', isPrivate: false };
  const privateNote = { authorId: 'clin-1', isPrivate: true };

  it('shows public notes to family and staff', () => {
    expect(noteVisibleToViewer(note, { userId: 'fam', role: 'family' })).toBe(true);
    expect(noteVisibleToViewer(note, { userId: 'clin-1', role: 'clinical_staff' })).toBe(true);
  });

  it('hides private notes from family', () => {
    expect(noteVisibleToViewer(privateNote, { userId: 'fam', role: 'family' })).toBe(false);
  });

  it('shows private notes to the author and clinical staff', () => {
    expect(noteVisibleToViewer(privateNote, { userId: 'clin-1', role: 'clinical_staff' })).toBe(true);
    expect(noteVisibleToViewer(privateNote, { userId: 'other-clin', role: 'doctor' })).toBe(true);
    expect(noteVisibleToViewer(privateNote, { userId: 'admin', role: 'admin' })).toBe(true);
  });
});

describe('shapeTelehealthContext', () => {
  it('omits unitCost from plan items and private notes for family', () => {
    const ctx = shapeTelehealthContext({
      viewer: { userId: 'fam', role: 'family' },
      episode: { id: 'ep-1', title: 'Care', status: 'active' },
      carePlan: {
        id: 'cp-1',
        title: 'Plan',
        status: 'approved',
        version: 1,
        items: [{ serviceType: 'home_nursing', frequency: '2x', duration: '1h', unitCost: 80 }],
        goals: [{ id: 'g1', title: 'Walk', status: 'active', tier: 'short_term' }],
      },
      notes: [
        { id: 'n1', content: 'public', isPrivate: false, noteType: 'session_note', authorId: 'clin', createdAt: new Date('2026-08-01') },
        { id: 'n2', content: 'secret', isPrivate: true, noteType: 'session_note', authorId: 'clin', createdAt: new Date('2026-08-02') },
      ],
    });
    expect(ctx.episode.id).toBe('ep-1');
    expect(ctx.carePlan?.goals).toHaveLength(1);
    expect(ctx.carePlan?.items[0]).not.toHaveProperty('unitCost');
    expect(ctx.notes.map((n) => n.id)).toEqual(['n1']);
  });
});
