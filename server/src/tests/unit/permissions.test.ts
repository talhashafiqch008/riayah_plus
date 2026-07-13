import {
  canApprove,
  canCreate,
  canDelete,
  canEdit,
  canView,
  getPermissionsForRole,
  hasPermission,
} from '../../middleware/permissions';

describe('permissions matrix (M1 stub)', () => {
  it('grants admins full organization CRUD', () => {
    expect(canView('admin', 'organization')).toBe(true);
    expect(canCreate('admin', 'organization')).toBe(true);
    expect(canEdit('admin', 'organization')).toBe(true);
    expect(canDelete('admin', 'organization')).toBe(true);
  });

  it('denies family org management', () => {
    expect(canView('family', 'organization')).toBe(false);
    expect(canCreate('family', 'organization')).toBe(false);
    expect(canDelete('family', 'organization')).toBe(false);
  });

  it('allows family profile edit and care plan approval', () => {
    expect(canEdit('family', 'profile')).toBe(true);
    expect(canApprove('family', 'care_plan')).toBe(true);
    expect(canApprove('family', 'quotation')).toBe(true);
  });

  it('allows patient profile edit only', () => {
    expect(canEdit('patient', 'profile')).toBe(true);
    expect(canCreate('patient', 'care_episode')).toBe(false);
    expect(canApprove('patient', 'care_plan')).toBe(false);
  });

  it('allows coordinator episode/plan lifecycle', () => {
    expect(canCreate('care_coordinator', 'care_episode')).toBe(true);
    expect(canEdit('care_coordinator', 'care_plan')).toBe(true);
    expect(canDelete('care_coordinator', 'care_episode')).toBe(true);
    expect(canApprove('care_coordinator', 'care_plan')).toBe(true);
  });

  it('allows clinical staff clinical sign-off', () => {
    expect(canCreate('clinical_staff', 'clinical_note')).toBe(true);
    expect(canApprove('clinical_staff', 'care_plan')).toBe(true);
    expect(canDelete('clinical_staff', 'clinical_note')).toBe(false);
  });

  it('allows support worker shift notes only', () => {
    expect(canCreate('support_worker', 'shift_note')).toBe(true);
    expect(canEdit('support_worker', 'shift_note')).toBe(true);
    expect(canView('support_worker', 'patient')).toBe(false);
  });

  it('maps legacy provider roles to proposal matrices (STUB-003)', () => {
    expect(hasPermission('driver', 'view', 'task')).toBe(true);
    expect(hasPermission('doctor', 'view', 'patient')).toBe(true);
    expect(hasPermission('client', 'view', 'profile')).toBe(true);
    expect(getPermissionsForRole('driver')).toEqual(getPermissionsForRole('support_worker'));
  });

  it('super_admin bypasses all checks', () => {
    expect(hasPermission('super_admin', 'delete', 'organization')).toBe(true);
    expect(hasPermission('super_admin', 'approve', 'document')).toBe(true);
  });
});
