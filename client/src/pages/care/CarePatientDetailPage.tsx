import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, History, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  getCareUnit,
  listPatientRevisions,
  updatePatient,
  type CarePatient,
  type CarePatientRevision,
  type CareUnit,
} from '@/lib/api/intake';

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

export default function CarePatientDetailPage({ basePath }: Props) {
  const { unitId = '', patientId = '' } = useParams();
  const [unit, setUnit] = useState<CareUnit | null>(null);
  const [patient, setPatient] = useState<CarePatient | null>(null);
  const [revisions, setRevisions] = useState<CarePatientRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [relationship, setRelationship] = useState('');
  const [pocName, setPocName] = useState('');
  const [pocPhone, setPocPhone] = useState('');
  const [diagnosisCodes, setDiagnosisCodes] = useState('');
  const [notes, setNotes] = useState('');

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
        setName(found.name ?? '');
        setDateOfBirth(toDateInput(found.dateOfBirth));
        setGender(found.gender ?? '');
        setRelationship(found.relationship ?? '');
        setPocName(found.pocName ?? '');
        setPocPhone(found.pocPhone ?? '');
        setDiagnosisCodes((found.diagnosisCodes ?? []).join(', '));
        setNotes(found.notes ?? '');
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

  const handleSave = async () => {
    if (!unitId || !patientId || !name.trim()) {
      toast.error('Patient name is required');
      return;
    }
    const codes = diagnosisCodes
      .split(/[,;\s]+/)
      .map((c) => c.trim())
      .filter(Boolean);

    setSaving(true);
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
      setEditing(false);
      toast.success('Patient profile updated');
      const revData = await listPatientRevisions(unitId, patientId);
      setRevisions(revData);
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error('Save failed');
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

  if (!patient || !unit) {
    return <p className="text-stone-500">Patient not found on this care unit.</p>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          to={`${basePath}/${unitId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft className="size-4" /> Back to {unit.name}
        </Link>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-stone-900">{patient.name}</h2>
            <p className="mt-1 text-sm text-stone-500">
              {unit.name}
              {patient.externalRef ? ` · ${patient.externalRef}` : ''}
            </p>
          </div>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Edit profile
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
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-stone-900">Patient profile</h3>
        {editing ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm">
              <span className="text-xs font-semibold text-stone-500">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">Date of birth</span>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">Gender</span>
              <input
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">Relationship</span>
              <input
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">Point of contact</span>
              <input
                value={pocName}
                onChange={(e) => setPocName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">POC phone</span>
              <input
                value={pocPhone}
                onChange={(e) => setPocPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
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
            <label className="sm:col-span-2 text-sm">
              <span className="text-xs font-semibold text-stone-500">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 min-h-[80px]"
              />
            </label>
          </div>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs font-semibold text-stone-500">Date of birth</dt>
              <dd className="mt-0.5 text-stone-900">
                {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-stone-500">Gender</dt>
              <dd className="mt-0.5 text-stone-900">{patient.gender || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-stone-500">Relationship</dt>
              <dd className="mt-0.5 text-stone-900">{patient.relationship || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-stone-500">Point of contact</dt>
              <dd className="mt-0.5 text-stone-900">
                {patient.pocName || '—'}
                {patient.pocPhone ? ` · ${patient.pocPhone}` : ''}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-stone-500 mb-1.5">Diagnoses</dt>
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
            {patient.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-stone-500">Notes</dt>
                <dd className="mt-0.5 text-stone-900 whitespace-pre-wrap">{patient.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">Linked episodes</h3>
          {linkedEpisodes.length === 0 ? (
            <p className="text-sm text-stone-500">No episodes for this patient yet.</p>
          ) : (
            <ul className="space-y-2">
                  {linkedEpisodes.map((ep) => (
                <li key={ep.id}>
                  <Link
                    to={
                      basePath.startsWith('/family')
                        ? `/family/episodes/${ep.id}`
                        : `/coordinator/episodes/${ep.id}`
                    }
                    className="rounded-xl bg-stone-50 px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2 hover:bg-teal-50/60 transition-colors"
                  >
                    <span className="font-medium text-stone-900">{ep.title}</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      {ep.status.replace(/_/g, ' ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">Intake history</h3>
          {linkedIntakes.length === 0 ? (
            <p className="text-sm text-stone-500">No intake records yet.</p>
          ) : (
            <ul className="space-y-2">
              {linkedIntakes.map((intake) => (
                <li
                  key={intake.id}
                  className="rounded-xl bg-stone-50 px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="text-stone-600 text-xs font-mono">{intake.id.slice(0, 10)}…</span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    {intake.status.replace(/_/g, ' ')}
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
          <h3 className="text-sm font-semibold text-stone-900">Edit history</h3>
        </div>
        {revisions.length === 0 ? (
          <p className="text-sm text-stone-500">No revisions recorded yet.</p>
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
                      {rev.changeSummary || 'Updated'}
                    </span>
                    <span className="text-xs text-stone-500">{formatWhen(rev.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    by {rev.changedBy?.name || rev.changedBy?.email || 'Unknown'}
                  </p>
                  <p className="mt-2 text-stone-700">
                    Snapshot: <span className="font-medium">{snapName}</span>
                    {snapCodes !== '—' && (
                      <>
                        {' '}
                        · diagnoses <span className="font-medium">{snapCodes}</span>
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
