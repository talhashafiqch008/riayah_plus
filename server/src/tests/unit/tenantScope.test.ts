import { Request } from 'express';
import { tenantWhere } from '../../middleware/tenantScope';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    user: undefined,
    tenant: undefined,
    ...overrides,
  } as Request;
}

describe('tenantWhere', () => {
  it('returns empty filter for admins', () => {
    const req = mockReq({
      user: { userId: '1', role: 'admin', email: 'a@b.com' },
      tenant: { organizationId: null, clinicId: null, departmentId: null },
    });
    expect(tenantWhere(req)).toEqual({});
  });

  it('scopes non-admin to organization', () => {
    const req = mockReq({
      user: { userId: '2', role: 'care_coordinator', email: 'c@b.com' },
      tenant: { organizationId: 'org-1', clinicId: null, departmentId: null },
    });
    expect(tenantWhere(req)).toEqual({ organizationId: 'org-1' });
  });

  it('includes clinic when present', () => {
    const req = mockReq({
      user: { userId: '3', role: 'clinical_staff', email: 'd@b.com' },
      tenant: { organizationId: 'org-1', clinicId: 'clinic-1', departmentId: null },
    });
    expect(tenantWhere(req)).toEqual({ organizationId: 'org-1', clinicId: 'clinic-1' });
  });

  it('returns impossible org id when user has no tenant', () => {
    const req = mockReq({
      user: { userId: '4', role: 'family', email: 'f@b.com' },
      tenant: { organizationId: null, clinicId: null, departmentId: null },
    });
    expect(tenantWhere(req)).toEqual({ organizationId: '__no_tenant__' });
  });
});
