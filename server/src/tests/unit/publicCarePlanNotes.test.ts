import { AI_DRAFT_MARKER, publicCarePlanNotes } from '../../services/AiCarePlanDraftService';

describe('publicCarePlanNotes', () => {
  it('strips the internal AI draft header', () => {
    const notes = [
      AI_DRAFT_MARKER,
      'draftKey=coordinator-trigger',
      'model=deepseek-v4-flash',
      'reviewCycle=Every 3 months',
      'riskFlags=1',
      '---',
      'Family prefers morning visits.',
    ].join('\n');

    expect(publicCarePlanNotes(notes)).toBe('Family prefers morning visits.');
  });
});
