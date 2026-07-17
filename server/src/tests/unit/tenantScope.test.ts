import { Request } from 'express';
import { assertTenantOrgAccess } from '../../middleware/tenantAccess';
import { tenantOrgWhere, tenantWhere } from '../../middleware/tenantScope';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    user: undefined,
    tenant: undefined,
    ...overrides,
  } as Request;
}

describe('tenantWhere', () => {
  it('returns empty filter for super_admin (platform bypass)', () => {
    const req = mockReq({
      user: { userId: '1', role: 'super_admin', email: 'a@b.com' },
      tenant: { organizationId: 'org-1', clinicId: null, departmentId: null },
    });
    expect(tenantWhere(req)).toEqual({});
  });

  it('returns empty filter for admin without organization', () => {
    const req = mockReq({
      user: { userId: '1', role: 'admin', email: 'a@b.com' },
      tenant: { organizationId: null, clinicId: null, departmentId: null },
    });
    expect(tenantWhere(req)).toEqual({});
  });

  it('scopes org-assigned admin to their organization', () => {
    const req = mockReq({
      user: { userId: '1', role: 'admin', email: 'a@b.com' },
      tenant: { organizationId: 'org-1', clinicId: null, departmentId: null },
    });
    expect(tenantWhere(req)).toEqual({ organizationId: 'org-1' });
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

describe('tenantOrgWhere', () => {
  it('strips clinicId for episode-style models', () => {
    const req = mockReq({
      user: { userId: '3', role: 'care_coordinator', email: 'c@b.com' },
      tenant: { organizationId: 'org-1', clinicId: 'clinic-1', departmentId: null },
    });
    expect(tenantOrgWhere(req)).toEqual({ organizationId: 'org-1' });
  });
});

describe('assertTenantOrgAccess', () => {
  const coordinatorReq = mockReq({
    user: { userId: '3', role: 'care_coordinator', email: 'c@b.com' },
    tenant: { organizationId: 'org-1', clinicId: null, departmentId: null },
  });

  it('allows rows in the same organization', () => {
    expect(() => assertTenantOrgAccess(coordinatorReq, 'org-1')).not.toThrow();
  });

  it('denies rows from another organization', () => {
    expect(() => assertTenantOrgAccess(coordinatorReq, 'org-2')).toThrow('Forbidden.');
  });

  it('denies legacy rows with no organization to tenant users', () => {
    expect(() => assertTenantOrgAccess(coordinatorReq, null)).toThrow('Forbidden.');
  });
});
