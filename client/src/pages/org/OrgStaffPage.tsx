import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  UserX,
  Mail,
  RefreshCw,
  Loader2,
  X,
  UserMinus,
  UserCheck,
} from 'lucide-react';
import {
  createOrgStaff,
  listOrgStaff,
  resendOrgStaffInvite,
  updateOrgStaff,
  type OrgStaff,
  type OrgStaffRole,
} from '@/lib/api/org';
import { isApiError } from '@/lib/errors';
import {
  RolePageHeader,
  RolePageShell,
  btnPrimaryClass,
  btnSecondaryClass,
  fieldClass,
} from '@/components/care/RolePageChrome';

const ROLE_FILTERS = [
  'ALL',
  'CLINICAL_STAFF',
  'DOCTOR',
  'NURSE',
  'PHYSIOTHERAPIST',
  'OCCUPATIONAL_THERAPIST',
  'SPEECH_THERAPIST',
  'PSYCHOLOGIST',
  'DIETITIAN',
  'THERAPIST',
  'SUPPORT_WORKER',
] as const;

const STAFF_ROLE_OPTIONS: { value: OrgStaffRole; label: string }[] = [
  { value: 'clinical_staff', label: 'Clinical staff' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'physiotherapist', label: 'Physiotherapist' },
  { value: 'occupational_therapist', label: 'Occupational therapist' },
  { value: 'speech_therapist', label: 'Speech therapist' },
  { value: 'psychologist', label: 'Psychologist' },
  { value: 'dietitian', label: 'Dietitian' },
  { value: 'therapist', label: 'Therapist' },
  { value: 'support_worker', label: 'Support worker' },
];

function splitName(name?: string): { firstName: string; lastName: string } {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

function roleDisplay(role: string) {
  return role.replace(/_/g, ' ').toUpperCase();
}

export default function OrgStaffPage() {
  const [staff, setStaff] = useState<OrgStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<(typeof ROLE_FILTERS)[number]>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<OrgStaffRole>('clinical_staff');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStaff(await listOrgStaff());
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Failed to load staff');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return staff.filter((member) => {
      const { firstName: fn, lastName: ln } = splitName(member.name);
      const matchesSearch =
        !q ||
        fn.toLowerCase().includes(q) ||
        ln.toLowerCase().includes(q) ||
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q);
      const matchesRole =
        selectedRole === 'ALL' || member.role.toUpperCase() === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [staff, searchQuery, selectedRole]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setRole('clinical_staff');
    setErrors({});
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    resetForm();
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = 'First name is required';
    if (!lastName.trim()) next.lastName = 'Last name is required';
    if (!email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Invalid email format';
    if (!role) next.role = 'Role is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await createOrgStaff({
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
      });
      toast.success('Staff invited. Magic link email sent.');
      setModalOpen(false);
      resetForm();
      await load();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Failed to create staff member');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  const staffActions = (member: OrgStaff) => (
    <div className="flex items-center gap-1">
      {member.mustSetPassword && (
        <button
          type="button"
          title="Resend invite"
          disabled={actionId === member.id}
          onClick={async () => {
            setActionId(member.id);
            try {
              await resendOrgStaffInvite(member.id);
              toast.success('Invite resent');
            } catch (error) {
              toast.error(isApiError(error) ? error.message : 'Resend failed');
            } finally {
              setActionId(null);
            }
          }}
          className="inline-flex size-10 items-center justify-center rounded-xl text-teal-700 hover:bg-teal-50 disabled:opacity-50"
        >
          <Mail className="size-4" />
        </button>
      )}
      <button
        type="button"
        title={member.isActive ? 'Deactivate' : 'Activate'}
        disabled={actionId === member.id}
        onClick={async () => {
          setActionId(member.id);
          try {
            await updateOrgStaff(member.id, { isActive: !member.isActive });
            toast.success(member.isActive ? 'Staff deactivated' : 'Staff activated');
            await load();
          } catch (error) {
            toast.error(isApiError(error) ? error.message : 'Update failed');
          } finally {
            setActionId(null);
          }
        }}
        className="inline-flex size-10 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100 disabled:opacity-50"
      >
        {member.isActive ? <UserMinus className="size-4" /> : <UserCheck className="size-4" />}
      </button>
    </div>
  );

  return (
    <RolePageShell>
      <RolePageHeader
        title="Staff Management"
        description="Manage clinical and support staff for your organization"
        actions={
          <>
            <button type="button" onClick={() => void load()} className={btnSecondaryClass}>
              <RefreshCw className="size-4" />
              Refresh
            </button>
            <button type="button" onClick={() => setModalOpen(true)} className={btnPrimaryClass}>
              <Plus className="size-4" />
              Add Staff
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex w-full items-center rounded-xl border border-stone-200 bg-white px-3 py-2.5 sm:max-w-md">
          <Search className="mr-2 size-5 shrink-0 text-stone-400" />
          <input
            type="search"
            placeholder="Search staff…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-base focus:outline-none sm:text-sm"
          />
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
          {ROLE_FILTERS.map((filterRole) => (
            <button
              key={filterRole}
              type="button"
              onClick={() => setSelectedRole(filterRole)}
              className={`min-h-10 shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                selectedRole === filterRole
                  ? 'bg-teal-600 text-white'
                  : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              {filterRole.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {filteredStaff.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white py-12 text-center shadow-sm">
          <UserX className="mx-auto mb-4 size-12 text-stone-400" />
          <h3 className="mb-2 text-lg font-semibold text-stone-900">No staff found</h3>
          <p className="text-sm text-stone-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {filteredStaff.map((member) => {
              const { firstName: fn, lastName: ln } = splitName(member.name);
              const initials =
                `${fn?.[0] ?? ''}${ln?.[0] ?? ''}`.toUpperCase() ||
                member.email?.[0]?.toUpperCase() ||
                '?';
              return (
                <li
                  key={member.id}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-teal-100">
                        <span className="text-sm font-semibold text-teal-700">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-stone-900">
                          {member.name || member.email}
                        </p>
                        <p className="truncate text-sm text-stone-500">{member.email}</p>
                        {member.mustSetPassword && (
                          <p className="mt-0.5 text-xs text-amber-700">Awaiting password setup</p>
                        )}
                      </div>
                    </div>
                    {staffActions(member)}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      {roleDisplay(member.role)}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        member.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-stone-400">
                      Joined{' '}
                      {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 lg:px-6">
                      Staff Member
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 lg:px-6">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 lg:px-6">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 lg:px-6">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 lg:px-6">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500 lg:px-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {filteredStaff.map((member) => {
                    const { firstName: fn, lastName: ln } = splitName(member.name);
                    const initials =
                      `${fn?.[0] ?? ''}${ln?.[0] ?? ''}`.toUpperCase() ||
                      member.email?.[0]?.toUpperCase() ||
                      '?';

                    return (
                      <tr key={member.id} className="hover:bg-stone-50">
                        <td className="whitespace-nowrap px-4 py-4 lg:px-6">
                          <div className="flex items-center">
                            <div className="flex size-10 items-center justify-center rounded-full bg-teal-100">
                              <span className="text-sm font-semibold text-teal-700">{initials}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-stone-900">
                                {member.name || member.email}
                              </div>
                              {member.mustSetPassword && (
                                <div className="text-xs text-amber-700">Awaiting password setup</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 lg:px-6">
                          <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                            {roleDisplay(member.role)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-stone-500 lg:px-6">
                          {member.email}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 lg:px-6">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              member.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {member.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-stone-500 lg:px-6">
                          {member.createdAt
                            ? new Date(member.createdAt).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right lg:px-6">
                          <div className="inline-flex justify-end">{staffActions(member)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/50"
            aria-label="Close"
            onClick={closeModal}
          />
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-stone-200 bg-white shadow-xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-5 sm:px-6 sm:pt-6">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">Add Staff Member</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Invite clinical or support staff. A magic-link email lets them set a password.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="shrink-0 rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreate(e)} className="px-4 pb-6 pt-2 sm:px-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`${fieldClass} ${
                      errors.firstName ? 'border-red-300 bg-red-50' : ''
                    }`}
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`${fieldClass} ${
                      errors.lastName ? 'border-red-300 bg-red-50' : ''
                    }`}
                    placeholder="Doe"
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${fieldClass} ${errors.email ? 'border-red-300 bg-red-50' : ''}`}
                    placeholder="john.doe@hospital.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={fieldClass}
                    placeholder="+974…"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as OrgStaffRole)}
                    className={`${fieldClass} ${errors.role ? 'border-red-300 bg-red-50' : ''}`}
                  >
                    {STAFF_ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.role && <p className="mt-1 text-sm text-red-500">{errors.role}</p>}
                  <p className="mt-1 text-xs text-stone-400">
                    Clinical roles appear in the assessment clinician list. Support workers use the
                    support portal.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button type="submit" disabled={saving} className={btnPrimaryClass}>
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending invite…
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      Create Staff Member
                    </>
                  )}
                </button>
                <button type="button" onClick={closeModal} className={btnSecondaryClass}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </RolePageShell>
  );
}
