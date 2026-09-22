import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

function roleLabel(role: string, t: (key: string, opts?: { defaultValue?: string }) => string) {
  return t(`staff.roles.${role}`, { defaultValue: role.replace(/_/g, ' ') });
}

export default function OrgStaffPage() {
  const { t, i18n } = useTranslation('org');
  const dateLocale = (i18n.language || '').toLowerCase().startsWith('ar') ? 'ar' : undefined;
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
      toast.error(isApiError(error) ? error.message : t('staff.loadError'));
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

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
    if (!firstName.trim()) next.firstName = t('staff.firstNameRequired');
    if (!lastName.trim()) next.lastName = t('staff.lastNameRequired');
    if (!email.trim()) next.email = t('staff.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = t('staff.emailInvalid');
    if (!role) next.role = t('staff.roleRequired');
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
      toast.success(t('staff.invitedToast'));
      setModalOpen(false);
      resetForm();
      await load();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : t('staff.createFailed'));
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
          title={t('staff.resendInvite')}
          disabled={actionId === member.id}
          onClick={async () => {
            setActionId(member.id);
            try {
              await resendOrgStaffInvite(member.id);
              toast.success(t('staff.resentToast'));
            } catch (error) {
              toast.error(isApiError(error) ? error.message : t('staff.resendFailed'));
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
        title={member.isActive ? t('staff.deactivate') : t('staff.activate')}
        disabled={actionId === member.id}
        onClick={async () => {
          setActionId(member.id);
          try {
            await updateOrgStaff(member.id, { isActive: !member.isActive });
            toast.success(member.isActive ? t('staff.deactivatedToast') : t('staff.activatedToast'));
            await load();
          } catch (error) {
            toast.error(isApiError(error) ? error.message : t('staff.updateFailed'));
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
        title={t('staff.title')}
        description={t('staff.description')}
        actions={
          <>
            <button type="button" onClick={() => void load()} className={btnSecondaryClass}>
              <RefreshCw className="size-4" />
              {t('staff.refresh')}
            </button>
            <button type="button" onClick={() => setModalOpen(true)} className={btnPrimaryClass}>
              <Plus className="size-4" />
              {t('staff.addStaff')}
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex w-full items-center rounded-xl border border-stone-200 bg-white px-3 py-2.5 sm:max-w-md">
          <Search className="mr-2 size-5 shrink-0 text-stone-400" />
          <input
            type="search"
            placeholder={t('staff.searchPlaceholder')}
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
              {filterRole === 'ALL'
                ? t('staff.filterAll')
                : roleLabel(filterRole.toLowerCase(), t)}
            </button>
          ))}
        </div>
      </div>

      {filteredStaff.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white py-12 text-center shadow-sm">
          <UserX className="mx-auto mb-4 size-12 text-stone-400" />
          <h3 className="mb-2 text-lg font-semibold text-stone-900">{t('staff.emptyTitle')}</h3>
          <p className="text-sm text-stone-500">{t('staff.emptyHint')}</p>
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
                          <p className="mt-0.5 text-xs text-amber-700">{t('staff.awaitingPassword')}</p>
                        )}
                      </div>
                    </div>
                    {staffActions(member)}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      {roleLabel(member.role, t)}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        member.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {member.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                    <span className="text-xs text-stone-400">
                      {member.createdAt
                        ? t('staff.joined', { date: new Date(member.createdAt).toLocaleDateString(dateLocale) })
                        : '—'}
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
                      {t('staff.colMember')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 lg:px-6">
                      {t('staff.colRole')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 lg:px-6">
                      {t('staff.colEmail')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 lg:px-6">
                      {t('staff.colStatus')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 lg:px-6">
                      {t('staff.colJoined')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500 lg:px-6">
                      {t('staff.colActions')}
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
                                <div className="text-xs text-amber-700">{t('staff.awaitingPassword')}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 lg:px-6">
                          <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                            {roleLabel(member.role, t)}
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
                            {member.isActive ? t('common.active') : t('common.inactive')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-stone-500 lg:px-6">
                          {member.createdAt
                            ? new Date(member.createdAt).toLocaleDateString(dateLocale)
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
            aria-label={t('staff.close')}
            onClick={closeModal}
          />
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-stone-200 bg-white shadow-xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-5 sm:px-6 sm:pt-6">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">{t('staff.modalTitle')}</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {t('staff.modalHint')}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="shrink-0 rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                aria-label={t('staff.closeModal')}
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreate(e)} className="px-4 pb-6 pt-2 sm:px-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    {t('staff.firstName')} <span className="text-red-500">*</span>
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
                    {t('staff.lastName')} <span className="text-red-500">*</span>
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
                    {t('staff.email')} <span className="text-red-500">*</span>
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
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">{t('staff.phone')}</label>
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
                    {t('staff.role')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as OrgStaffRole)}
                    className={`${fieldClass} ${errors.role ? 'border-red-300 bg-red-50' : ''}`}
                  >
                    {STAFF_ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
{t(`staff.roles.${opt.value}`, { defaultValue: opt.label })}
                      </option>
                    ))}
                  </select>
                  {errors.role && <p className="mt-1 text-sm text-red-500">{errors.role}</p>}
                  <p className="mt-1 text-xs text-stone-400">
                    {t('staff.roleHint')}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button type="submit" disabled={saving} className={btnPrimaryClass}>
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t('staff.sendingInvite')}
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      {t('staff.create')}
                    </>
                  )}
                </button>
                <button type="button" onClick={closeModal} className={btnSecondaryClass}>
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </RolePageShell>
  );
}
