import { canWriteTelehealthNote } from '../../services/TelehealthNoteService';

describe('canWriteTelehealthNote', () => {
  it('allows clinical staff, coordinators, and admins', () => {
    expect(canWriteTelehealthNote({ userId: 'c1', role: 'clinical_staff' })).toBe(true);
    expect(canWriteTelehealthNote({ userId: 'd1', role: 'doctor' })).toBe(true);
    expect(canWriteTelehealthNote({ userId: 'co', role: 'care_coordinator' })).toBe(true);
    expect(canWriteTelehealthNote({ userId: 'a1', role: 'admin' })).toBe(true);
  });

  it('rejects family and patients even if they are in the call', () => {
    expect(canWriteTelehealthNote({ userId: 'fam', role: 'family' })).toBe(false);
    expect(canWriteTelehealthNote({ userId: 'pat', role: 'patient' })).toBe(false);
  });
});
