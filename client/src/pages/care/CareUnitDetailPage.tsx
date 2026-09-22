import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Save, UserRound } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  getCareUnit,
  updateCareUnit,
  type CareUnit,
} from '@/lib/api/intake';
import { parseFamilyWizardSummary } from '@/lib/familyCareseekerIntake';
import { familyEpisodeStatusLabel, familyEnumLabel, familyIntakeStatusLabel } from '@/lib/familyLanguage';
import { localizeGeneratedLabel } from '@/lib/localizeStoredEnglish';

type Props = {
  basePath: string;
};

function formatDob(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

const COUNTRY_LABELS: Record<string, string> = {
  QA: 'Qatar',
  SA: 'Saudi Arabia',
  EG: 'Egypt',
  AU: 'Australia',
  QAT: 'Qatar',
  SAU: 'Saudi Arabia',
  EGY: 'Egypt',
  AUS: 'Australia',
};

const FAMILY_INTAKE_STATUS: Record<string, string> = {
  submitted: 'Request received',
  under_review: 'Care team reviewing',
  validated: 'Care journey ready',
  episode_created: 'Care journey started',
  withdrawn: 'Withdrawn',
};

function formatCountry(code?: string | null) {
  if (!code) return null;
  return COUNTRY_LABELS[code] ?? code;
}

export default function CareUnitDetailPage({ basePath }: Props) {
  const isFamilyView = basePath.startsWith('/family');
  const isCoordinator = basePath.startsWith('/coordinator');
  const { t } = useTranslation(isFamilyView ? 'family' : isCoordinator ? 'coordinator' : 'family');
  const { unitId = '' } = useParams();
  const [unit, setUnit] = useState<CareUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [caregiverRelation, setCaregiverRelation] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  const applyUnitToForm = (data: CareUnit) => {
    setName(data.name ?? '');
    setCaregiverName(data.primaryCaregiverName ?? '');
    setCaregiverPhone(data.primaryCaregiverPhone ?? '');
    setCaregiverRelation(data.primaryCaregiverRelation ?? '');
    setAddress(data.address ?? '');
    setCity(data.city ?? '');
  };

  const load = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    try {
      const data = await getCareUnit(unitId);
      setUnit(data);
      applyUnitToForm(data);
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error(isCoordinator ? t('patients.loadError') : 'Failed to load care unit');
    } finally {
      setLoading(false);
    }
  }, [unitId, isCoordinator, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!unitId || !name.trim()) {
      toast.error(isCoordinator ? t('patients.nameRequired') : 'Care unit name is required');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateCareUnit(unitId, {
        name: name.trim(),
        primaryCaregiverName: caregiverName.trim() || undefined,
        primaryCaregiverPhone: caregiverPhone.trim() || undefined,
        primaryCaregiverRelation: caregiverRelation.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
      });
      setUnit((prev) => (prev ? { ...prev, ...updated } : updated));
      applyUnitToForm({ ...(unit ?? updated), ...updated });
      setEditing(false);
      toast.success(isCoordinator ? t('patients.updated') : 'Care unit updated');
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error(isCoordinator ? t('patients.saveFailed') : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!unit) {
    return (
      <p className="text-stone-500">
        {isFamilyView
          ? t('careUnit.notFound')
          : isCoordinator
            ? t('patients.notFound')
            : 'Care unit not found.'}
      </p>
    );
  }

  const patients = unit.careRecipients ?? [];
  const episodes = unit.careEpisodes ?? [];
  const intakes = unit.intakeRecords ?? [];

  const label = (familyKey: string, coordKey: string, fallback: string) =>
    isFamilyView ? t(familyKey) : isCoordinator ? t(coordKey) : fallback;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Breadcrumb
          items={[
            {
              label: label('careUnit.home', 'patients.breadcrumb', 'Care Units'),
              href: basePath,
            },
            { label: isCoordinator ? localizeGeneratedLabel(unit.name) : unit.name },
          ]}
        />
        <Link
          to={basePath}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft className="size-4 rtl-flip" />{' '}
          {label('careUnit.back', 'patients.back', 'Back to care units')}
        </Link>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-stone-900">{isCoordinator ? localizeGeneratedLabel(unit.name) : unit.name}</h2>
            <p className="mt-1 text-sm text-stone-500">
              {isFamilyView ? (
                <>
                  {patients.length}{' '}
                  {patients.length === 1 ? t('careUnit.person') : t('careUnit.people')}{' '}
                  {t('careUnit.needingCare')} · {t('careUnit.membersHint', { count: patients.length })}
                </>
              ) : isCoordinator ? (
                <>
                  {t('patients.patientCount', { count: patients.length })} {t('patients.needingCare')}
                  {' · '}
                  {t('patients.episodeCount', { count: episodes.length })}
                </>
              ) : (
                <>
                  {patients.length} patient{patients.length === 1 ? '' : 's'} needing care ·{' '}
                  {episodes.length} episode{episodes.length === 1 ? '' : 's'}
                </>
              )}
            </p>
          </div>
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                applyUnitToForm(unit);
                setEditing(true);
              }}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              {label('careUnit.edit', 'patients.edit', 'Edit care unit')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  void load();
                }}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                {isFamilyView ? t('careUnit.cancel') : isCoordinator ? t('common.cancel') : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {isFamilyView ? t('careUnit.save') : isCoordinator ? t('common.save') : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-stone-900">
          {label('careUnit.householdDetails', 'patients.details', 'Care unit details')}
        </h3>
        {editing ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm">
              <span className="text-xs font-semibold text-stone-500">
                {label('careUnit.name', 'patients.name', 'Name')}
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">
                {label('careUnit.accountHolder', 'patients.primaryCaregiver', 'Primary caregiver')}
              </span>
              <input
                value={caregiverName}
                onChange={(e) => setCaregiverName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">
                {label('careUnit.phone', 'patients.phone', 'Phone')}
              </span>
              <input
                value={caregiverPhone}
                onChange={(e) => setCaregiverPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">
                {label('careUnit.relation', 'patients.relation', 'Relation')}
              </span>
              <input
                value={caregiverRelation}
                onChange={(e) => setCaregiverRelation(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">
                {isCoordinator ? t('patients.city') : 'City'}
              </span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="sm:col-span-2 text-sm">
              <span className="text-xs font-semibold text-stone-500">
                {isCoordinator ? t('patients.address') : 'Address'}
              </span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
          </div>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs font-semibold text-stone-500">
                {label('careUnit.accountHolder', 'patients.primaryCaregiver', 'Primary caregiver')}
              </dt>
              <dd className="mt-0.5 text-stone-900">{unit.primaryCaregiverName || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-stone-500">
                {label('careUnit.phone', 'patients.phone', 'Phone')}
              </dt>
              <dd className="mt-0.5 text-stone-900">{unit.primaryCaregiverPhone || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-stone-500">
                {label('careUnit.relation', 'patients.relation', 'Relation')}
              </dt>
              <dd className="mt-0.5 text-stone-900">{unit.primaryCaregiverRelation || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-stone-500">
                {label('careUnit.location', 'patients.location', 'Location')}
              </dt>
              <dd className="mt-0.5 text-stone-900">
                {[unit.address, unit.city, formatCountry(unit.country)].filter(Boolean).join(', ') ||
                  '—'}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="text-sm font-semibold text-stone-900">
            {label('careUnit.whoNeedsCare', 'patients.patientsHeading', 'Patients')}
          </h3>
          {isFamilyView && (
            <p className="mt-1 text-xs text-stone-500">
              {t('careUnit.membersHint', { count: patients.length })}
            </p>
          )}
        </div>
        {patients.length === 0 ? (
          <p className="p-6 text-sm text-stone-500">
            {label('careUnit.emptyPatients', 'patients.emptyPatients', 'No patients on this care unit yet.')}
          </p>
        ) : (
          <ul className="divide-y">
            {patients.map((patient) => {
              const patientIntake = intakes.find((i) => i.careRecipientId === patient.id);
              const patientSummary = parseFamilyWizardSummary(patientIntake?.wizardPayload);
              const statusLabel = patientIntake
                ? isFamilyView
                  ? familyIntakeStatusLabel(patientIntake.status)
                  : isCoordinator
                    ? t(`intake.status.${patientIntake.status}`, {
                        defaultValue:
                          FAMILY_INTAKE_STATUS[patientIntake.status] ??
                          patientIntake.status.replace(/_/g, ' '),
                      })
                    : FAMILY_INTAKE_STATUS[patientIntake.status] ??
                      patientIntake.status.replace(/_/g, ' ')
                : null;
              return (
                <li key={patient.id}>
                  <Link
                    to={`${basePath}/${unitId}/${patient.id}`}
                    className="flex items-start gap-3 p-4 hover:bg-teal-50/40 transition-colors"
                  >
                    <div className="mt-0.5 rounded-xl bg-stone-100 p-2 text-stone-600">
                      <UserRound className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-stone-900">{isCoordinator ? localizeGeneratedLabel(patient.name) : patient.name}</p>
                        {statusLabel && (
                          <span className="rounded-full bg-teal-50 border border-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                            {statusLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-stone-500">
                        {[
                          patient.relationship
                            ? isFamilyView
                              ? familyEnumLabel('relationship', patient.relationship)
                              : patient.relationship
                            : null,
                          patient.dateOfBirth
                            ? isFamilyView
                              ? t('careUnit.dob', { date: formatDob(patient.dateOfBirth) })
                              : isCoordinator
                                ? t('patients.dob', { date: formatDob(patient.dateOfBirth) })
                                : `DOB ${formatDob(patient.dateOfBirth)}`
                            : null,
                          patientSummary?.supportCategories?.length
                            ? patientSummary.supportCategories.join(', ')
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || (isFamilyView ? t('careUnit.openCareRequest') : '—')}
                      </p>
                      {!isFamilyView &&
                        patient.diagnosisCodes &&
                        patient.diagnosisCodes.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {patient.diagnosisCodes.map((code) => (
                              <span
                                key={code}
                                className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-900"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!isFamilyView && episodes.length > 0 && (
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">
            {isCoordinator ? t('patients.linkedEpisodes') : 'Linked episodes (unit)'}
          </h3>
          <ul className="space-y-2">
            {episodes.map((ep) => (
              <li
                key={ep.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-stone-900">{isCoordinator ? localizeGeneratedLabel(ep.title) : ep.title}</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  {isCoordinator
                    ? t(`episodes.status.${ep.status}`, {
                        defaultValue: ep.status.replace(/_/g, ' '),
                      })
                    : ep.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isFamilyView && episodes.length > 0 && (
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">{t('careUnit.journeysHeading')}</h3>
          <ul className="space-y-2">
            {episodes.map((ep) => (
              <li
                key={ep.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-stone-900">{isCoordinator ? localizeGeneratedLabel(ep.title) : ep.title}</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  {familyEpisodeStatusLabel(ep.status)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
