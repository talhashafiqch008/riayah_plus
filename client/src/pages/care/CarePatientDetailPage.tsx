import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, History, Loader2, Save } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  getCareUnit,
  listPatientRevisions,
  updateIntakeRequest,
  updatePatient,
  type CarePatient,
  type CarePatientRevision,
  type CareUnit,
} from '@/lib/api/intake';
import { FamilyCareRequestPanel } from '@/components/care/FamilyCareRequestPanel';
import {
  buildReasonForCare,
  countryToIso2,
  emptyFamilyWizardDraft,
  getFamilyWizardDraft,
  mapCareCategoriesToServices,
  mergeFamilyWizardPayload,
  type FamilyWizardDraft,
} from '@/lib/familyCareseekerIntake';
import {
  formatFamilyDate,
  formatFamilyDateTime,
  familyEpisodeStatusLabel,
  familyIntakeStatusLabel,
  familyEnumLabel,
} from '@/lib/familyLanguage';
import {
  localizeGeneratedLabel,
  localizeStoredNarrative,
} from '@/lib/localizeStoredEnglish';

type Props = {
  basePath: string;
};

function toDateInput(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function formatWhen(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

/** Same options as careseeker onboarding gender preference. */
const GENDER_OPTIONS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'no_preference', label: 'No Preference' },
] as const;

function genderLabel(
  value: string | null | undefined,
  localized: boolean,
  t: (key: string) => string,
) {
  if (!value) return '—';
  if (localized) {
    if (value === 'male') return t('patientDetail.male');
    if (value === 'female') return t('patientDetail.female');
    if (value === 'no_preference') return t('patientDetail.noPreference');
  }
  const match = GENDER_OPTIONS.find((o) => o.id === value);
  return match?.label ?? value;
}

function profileFieldLabel(
  key: string,
  localized: boolean,
  t: (key: string) => string,
  staffFallback: string,
) {
  return localized ? t(`patientDetail.${key}`) : staffFallback;
}

export default function CarePatientDetailPage({ basePath }: Props) {
  const { unitId = '', patientId = '' } = useParams();
  const isFamilyView = basePath.startsWith('/family');
  const isCoordinator = basePath.startsWith('/coordinator');
  const localized = isFamilyView || isCoordinator;
  const { t } = useTranslation(isFamilyView ? 'family' : isCoordinator ? 'coordinator' : 'family');
  const [unit, setUnit] = useState<CareUnit | null>(null);
  const [patient, setPatient] = useState<CarePatient | null>(null);
  const [revisions, setRevisions] = useState<CarePatientRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingRequest, setEditingRequest] = useState(false);

  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [relationship, setRelationship] = useState('');
  const [pocName, setPocName] = useState('');
  const [pocPhone, setPocPhone] = useState('');
  const [diagnosisCodes, setDiagnosisCodes] = useState('');
  const [notes, setNotes] = useState('');
  const [requestDraft, setRequestDraft] = useState<FamilyWizardDraft>(emptyFamilyWizardDraft());

  const applyProfileToForm = (found: CarePatient) => {
    setName(found.name ?? '');
    setDateOfBirth(toDateInput(found.dateOfBirth));
    setGender(found.gender ?? '');
    setRelationship(found.relationship ?? '');
    setPocName(found.pocName ?? '');
    setPocPhone(found.pocPhone ?? '');
    setDiagnosisCodes((found.diagnosisCodes ?? []).join(', '));
    setNotes(found.notes ?? '');
  };

  const applyRequestToForm = (found: CarePatient, intakes: CareUnit['intakeRecords']) => {
    const patientIntake = (intakes ?? []).find((i) => i.careRecipientId === found.id);
    setRequestDraft(getFamilyWizardDraft(patientIntake?.wizardPayload ?? null));
  };

  const load = useCallback(async () => {
    if (!unitId || !patientId) return;
    setLoading(true);
    try {
      const [unitData, revData] = await Promise.all([
        getCareUnit(unitId),
        listPatientRevisions(unitId, patientId),
      ]);
      const found = (unitData.careRecipients ?? []).find((p) => p.id === patientId) ?? null;
      setUnit(unitData);
      setPatient(found);
      setRevisions(revData);
      if (found) {
        applyProfileToForm(found);
        applyRequestToForm(found, unitData.intakeRecords);
      }
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error('Failed to load patient');
    } finally {
      setLoading(false);
    }
  }, [unitId, patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const linkedEpisodes = useMemo(() => {
    return (unit?.careEpisodes ?? []).filter((ep) => ep.careRecipientId === patientId);
  }, [unit, patientId]);

  const linkedIntakes = useMemo(() => {
    return (unit?.intakeRecords ?? []).filter((i) => i.careRecipientId === patientId);
  }, [unit, patientId]);

  const latestRequest = linkedIntakes[0];

  const handleSaveProfile = async () => {
    if (!unitId || !patientId || !name.trim()) {
      toast.error('Patient name is required');
      return;
    }
    const codes = diagnosisCodes
      .split(/[,;\s]+/)
      .map((c) => c.trim())
      .filter(Boolean);

    setSavingProfile(true);
    try {
      const updated = await updatePatient(unitId, patientId, {
        name: name.trim(),
        dateOfBirth: dateOfBirth || undefined,
        gender: gender.trim() || undefined,
        relationship: relationship.trim() || undefined,
        pocName: pocName.trim() || undefined,
        pocPhone: pocPhone.trim() || undefined,
        diagnosisCodes: codes,
        notes: notes.trim() || undefined,
      });
      setPatient(updated);
      setEditingProfile(false);
      toast.success(localized ? t(isFamilyView ? 'patientDetail.updated' : 'patientDetail.profileUpdated') : 'Patient profile updated');
      const revData = await listPatientRevisions(unitId, patientId);
      setRevisions(revData);
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error(localized ? t('patientDetail.saveFailed') : 'Save failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveRequest = async () => {
    if (!latestRequest?.id) {
      toast.error('No care request to update');
      return;
    }

    setSavingRequest(true);
    try {
      const existingPayload = (latestRequest.wizardPayload ?? {}) as Record<string, unknown>;
      const wizardPayload = mergeFamilyWizardPayload(existingPayload, requestDraft);
      const formForReason = {
        ...wizardPayload,
        careNeeds: existingPayload.careNeeds ?? {},
      };
      const serviceInterests = mapCareCategoriesToServices(
        requestDraft.careCategories,
        existingPayload.careNeeds,
      );
      const intakeUpdated = await updateIntakeRequest(latestRequest.id, {
        wizardPayload,
        reasonForCare: buildReasonForCare(formForReason),
        serviceInterests,
        syncCareUnit: {
          address: requestDraft.address.trim() || undefined,
          country: countryToIso2(requestDraft.country),
        },
      });

      setUnit((prev) => {
        if (!prev) return prev;
        const intakes = [...(prev.intakeRecords ?? [])];
        const idx = intakes.findIndex((i) => i.id === latestRequest.id);
        if (idx >= 0) {
          intakes[idx] = {
            ...intakes[idx],
            wizardPayload: intakeUpdated.wizardPayload as Record<string, unknown> | null,
            reasonForCare: intakeUpdated.reasonForCare,
            serviceInterests: intakeUpdated.serviceInterests,
          };
        }
        return { ...prev, intakeRecords: intakes };
      });

      setEditingRequest(false);
      toast.success('Care request updated');
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error(localized ? t('patientDetail.saveFailed') : 'Save failed');
    } finally {
      setSavingRequest(false);
    }
  };

  const sectionActions = (
    editing: boolean,
    saving: boolean,
    onEdit: () => void,
    onCancel: () => void,
    onSave: () => void,
    editLabel: string,
  ) =>
    !editing ? (
      <button
        type="button"
        onClick={onEdit}
        className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
      >
        {editLabel}
      </button>
    ) : (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save
        </button>
      </div>
    );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!patient || !unit) {
    return (
      <p className="text-stone-500">
        {localized ? t('patientDetail.notFound') : 'Patient not found on this care unit.'}
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Breadcrumb
          items={[
            { label: localized ? t(isFamilyView ? 'patientDetail.home' : 'patientDetail.breadcrumb') : 'Care Units', href: basePath },
            { label: localized ? localizeGeneratedLabel(unit.name) : unit.name, href: `${basePath}/${unitId}` },
            { label: localized ? localizeGeneratedLabel(patient.name) : patient.name },
          ]}
        />
        <Link
          to={`${basePath}/${unitId}`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft className="size-4" />{' '}
          {localized
            ? t(isFamilyView ? 'patientDetail.backTo' : 'patientDetail.back', {
                name: localizeGeneratedLabel(unit.name),
              })
            : `Back to ${unit.name}`}
        </Link>
        <div className="mt-3">
          <h2 className="text-2xl font-semibold text-stone-900">{localized ? localizeGeneratedLabel(patient.name) : patient.name}</h2>
          <p className="mt-1 text-sm text-stone-500">
            {localized ? localizeGeneratedLabel(unit.name) : unit.name}
            {!isFamilyView && patient.externalRef ? ` · ${patient.externalRef}` : ''}
          </p>
        </div>
      </div>

      {isFamilyView &&
        (latestRequest ? (
          <FamilyCareRequestPanel
            intakes={linkedIntakes}
            variant="family"
            editing={editingRequest}
            draft={requestDraft}
            onDraftChange={setRequestDraft}
            actions={sectionActions(
              editingRequest,
              savingRequest,
              () => {
                applyRequestToForm(patient, unit.intakeRecords);
                setEditingRequest(true);
              },
              () => {
                setEditingRequest(false);
                applyRequestToForm(patient, unit.intakeRecords);
              },
              () => void handleSaveRequest(),
              'Edit request',
            )}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-5 text-sm text-stone-500">
            No care request linked to this person yet. Submit one from Onboarding, or ask your care
            team to attach an intake.
          </div>
        ))}

      {!isFamilyView && linkedIntakes.length > 0 && (
        <FamilyCareRequestPanel
          intakes={linkedIntakes}
          variant="staff"
          localeNs={isCoordinator ? 'coordinator' : undefined}
        />
      )}

      <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-sm font-semibold text-stone-900">
            {localized ? t(isFamilyView ? 'patientDetail.personProfile' : 'patientDetail.profile') : 'Patient profile'}
          </h3>
          {sectionActions(
            editingProfile,
            savingProfile,
            () => {
              applyProfileToForm(patient);
              setEditingProfile(true);
            },
            () => {
              setEditingProfile(false);
              applyProfileToForm(patient);
            },
            () => void handleSaveProfile(),
            localized ? t('patientDetail.edit') : 'Edit profile',
          )}
        </div>
        {editingProfile ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm">
              <span className="text-xs font-semibold text-stone-500">
                {profileFieldLabel('name', localized, t, 'Name')}
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">
                {profileFieldLabel('dateOfBirth', localized, t, 'Date of birth')}
              </span>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">
                {profileFieldLabel('gender', localized, t, 'Gender')}
              </span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 bg-white"
              >
                <option value="">
                  {localized ? t(isFamilyView ? 'patientDetail.gender' : 'patientDetail.selectGender') : 'Select gender'}
                </option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {genderLabel(option.id, localized, t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">
                {profileFieldLabel('relationship', localized, t, 'Relationship')}
              </span>
              <input
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">
                {profileFieldLabel('pointOfContact', localized, t, 'Point of contact')}
              </span>
              <input
                value={pocName}
                onChange={(e) => setPocName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">
                {profileFieldLabel('pocPhone', localized, t, 'POC phone')}
              </span>
              <input
                value={pocPhone}
                onChange={(e) => setPocPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            {!isFamilyView && (
              <label className="sm:col-span-2 text-sm">
                <span className="text-xs font-semibold text-stone-500">
                  Diagnosis codes (comma-separated)
                </span>
                <input
                  value={diagnosisCodes}
                  onChange={(e) => setDiagnosisCodes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
                  placeholder="I10, E11"
                />
              </label>
            )}
            <label className="sm:col-span-2 text-sm">
              <span className="text-xs font-semibold text-stone-500">
                {profileFieldLabel('notes', localized, t, 'Notes')}
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 min-h-[80px]"
              />
            </label>
          </div>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-stone-500">
                {profileFieldLabel('name', localized, t, 'Name')}
              </dt>
              <dd className="mt-0.5 text-stone-900">{patient.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-stone-500">
                {profileFieldLabel('dateOfBirth', localized, t, 'Date of birth')}
              </dt>
              <dd className="mt-0.5 text-stone-900">
                {patient.dateOfBirth
                  ? isFamilyView
                    ? formatFamilyDate(patient.dateOfBirth)
                    : new Date(patient.dateOfBirth).toLocaleDateString()
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-stone-500">
                {profileFieldLabel('gender', localized, t, 'Gender')}
              </dt>
              <dd className="mt-0.5 text-stone-900">
                {genderLabel(patient.gender, localized, t)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-stone-500">
                {profileFieldLabel('relationship', localized, t, 'Relationship')}
              </dt>
              <dd className="mt-0.5 text-stone-900">{patient.relationship ? (localized ? familyEnumLabel('relationship', patient.relationship) : patient.relationship) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-stone-500">
                {profileFieldLabel('pointOfContact', localized, t, 'Point of contact')}
              </dt>
              <dd className="mt-0.5 text-stone-900">
                {patient.pocName || '—'}
                {patient.pocPhone ? ` · ${patient.pocPhone}` : ''}
              </dd>
            </div>
            {!isFamilyView && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-stone-500 mb-1.5">
                  {profileFieldLabel('diagnoses', localized, t, 'Diagnoses')}
                </dt>
                <dd className="flex flex-wrap gap-1.5">
                  {(patient.diagnosisCodes ?? []).length > 0 ? (
                    patient.diagnosisCodes!.map((code) => (
                      <span
                        key={code}
                        className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-900"
                      >
                        {code}
                      </span>
                    ))
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </dd>
              </div>
            )}
            {patient.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-stone-500">
                  {profileFieldLabel('notes', localized, t, 'Notes')}
                </dt>
                <dd className="mt-0.5 text-stone-900 whitespace-pre-wrap">
                  {patient.notes
                    ? localized
                      ? localizeStoredNarrative(patient.notes)
                      : patient.notes
                    : '—'}
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">
            {localized ? t(isFamilyView ? 'patientDetail.careJourneys' : 'patientDetail.linkedEpisodes') : 'Linked episodes'}
          </h3>
          {linkedEpisodes.length === 0 ? (
            <p className="text-sm text-stone-500">
              {localized ? t(isFamilyView ? 'patientDetail.noJourneys' : 'patientDetail.noEpisodes') : 'No episodes for this patient yet.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {linkedEpisodes.map((ep) => (
                <li key={ep.id}>
                  <Link
                    to={
                      isFamilyView
                        ? `/family/episodes/${ep.id}`
                        : `/coordinator/episodes/${ep.id}`
                    }
                    className="rounded-xl bg-stone-50 px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2 hover:bg-teal-50/60 transition-colors"
                  >
                    <span className="font-medium text-stone-900">{isCoordinator ? localizeGeneratedLabel(ep.title) : ep.title}</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      {isFamilyView
                        ? familyEpisodeStatusLabel(ep.status)
                        : isCoordinator
                          ? t(`episodes.status.${ep.status}`, {
                              defaultValue: ep.status.replace(/_/g, ' '),
                            })
                          : ep.status.replace(/_/g, ' ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">
            {localized ? t(isFamilyView ? 'patientDetail.requestHistory' : 'patientDetail.intakeHistory') : 'Intake history'}
          </h3>
          {linkedIntakes.length === 0 ? (
            <p className="text-sm text-stone-500">
              {localized ? t(isFamilyView ? 'patientDetail.noRequests' : 'patientDetail.noIntake') : 'No intake records yet.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {linkedIntakes.map((intake) => (
                <li
                  key={intake.id}
                  className="rounded-xl bg-stone-50 px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="text-stone-600 text-xs">
                    {intake.submittedAt
                      ? isFamilyView
                        ? formatFamilyDateTime(intake.submittedAt)
                        : new Date(intake.submittedAt).toLocaleString()
                      : isFamilyView
                        ? 'Care request'
                        : `${intake.id.slice(0, 10)}…`}
                  </span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    {isFamilyView
                      ? familyIntakeStatusLabel(intake.status)
                      : isCoordinator
                        ? t(`intake.status.${intake.status}`, {
                            defaultValue: intake.status.replace(/_/g, ' '),
                          })
                        : intake.status.replace(/_/g, ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <History className="size-4 text-stone-500" />
          <h3 className="text-sm font-semibold text-stone-900">
            {localized ? t('patientDetail.editHistory') : 'Edit history'}
          </h3>
        </div>
        {revisions.length === 0 ? (
          <p className="text-sm text-stone-500">
            {localized ? t('patientDetail.noRevisions') : 'No revisions recorded yet.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {revisions.map((rev) => {
              const snap = rev.snapshot ?? {};
              const snapName = typeof snap.name === 'string' ? snap.name : '—';
              const snapCodes = Array.isArray(snap.diagnosisCodes)
                ? (snap.diagnosisCodes as string[]).join(', ')
                : '—';
              return (
                <li key={rev.id} className="rounded-xl border border-stone-100 bg-stone-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-stone-900">
                      {localized
                        ? (rev.changeSummary
                            ? localizeStoredNarrative(rev.changeSummary)
                                .replace(/^Updated\b/i, t('patientDetail.updated'))
                                .replace(/^Created\b/i, t('patientDetail.created'))
                                .replace(/^تم التحديث\b/, t('patientDetail.updated'))
                                .replace(/^تم الإنشاء\b/, t('patientDetail.created'))
                            : t('patientDetail.updated'))
                        : rev.changeSummary || 'Updated'}
                    </span>
                    <span className="text-xs text-stone-500">
                      {localized
                        ? formatFamilyDateTime(rev.createdAt)
                        : formatWhen(rev.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {localized ? t('patientDetail.by') : 'by'}{' '}
                    {rev.changedBy?.name || rev.changedBy?.email || (localized ? t('patientDetail.unknown') : 'Unknown')}
                  </p>
                  <p className="mt-2 text-stone-700">
                    {localized ? t('patientDetail.snapshot') : 'Snapshot'}:{' '}
                    <span className="font-medium">{localizeGeneratedLabel(snapName)}</span>
                    {!isFamilyView && snapCodes !== '—' && (
                      <>
                        {' '}
                        · {localized ? t('patientDetail.diagnosesWord') : 'diagnoses'}{' '}
                        <span className="font-medium">{snapCodes}</span>
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
