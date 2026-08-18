import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export type TestRole =
  | 'client'
  | 'provider'
  | 'doctor'
  | 'nurse'
  | 'admin'
  | 'super_admin'
  | 'care_coordinator'
  | 'support_worker'
  | 'staff';

export interface TestUser {
  id: string;
  name: string;
  email: string;
  role: TestRole;
}

const DEFAULT_USERS: Record<TestRole, TestUser> = {
  client: { id: 'test-client-id', name: 'Test Client', email: 'client@test.com', role: 'client' },
  provider: { id: 'test-provider-id', name: 'Test Provider', email: 'provider@test.com', role: 'provider' },
  doctor: { id: 'test-doctor-id', name: 'Dr. Test', email: 'doctor@test.com', role: 'doctor' },
  nurse: { id: 'test-nurse-id', name: 'Test Nurse', email: 'nurse@test.com', role: 'nurse' },
  admin: { id: 'test-admin-id', name: 'Test Admin', email: 'admin@test.com', role: 'admin' },
  super_admin: { id: 'test-superadmin-id', name: 'Test Super Admin', email: 'superadmin@test.com', role: 'super_admin' },
  care_coordinator: { id: 'test-coordinator-id', name: 'Test Coordinator', email: 'coordinator@test.com', role: 'care_coordinator' },
  support_worker: { id: 'test-support-id', name: 'Test Support Worker', email: 'support@test.com', role: 'support_worker' },
  staff: { id: 'test-staff-id', name: 'Test Staff', email: 'staff@test.com', role: 'staff' },
};

export function makeToken(role: TestRole = 'client', overrides: Partial<TestUser> = {}): string {
  const user = { ...DEFAULT_USERS[role], ...overrides };
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  );
}

export function authHeader(role: TestRole = 'client', overrides: Partial<TestUser> = {}): string {
  return `Bearer ${makeToken(role, overrides)}`;
}

export function getTestUser(role: TestRole = 'client'): TestUser {
  return DEFAULT_USERS[role];
}
