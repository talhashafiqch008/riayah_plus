import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  getCareUnit,
  updateCareUnit,
  type CareUnit,
} from '@/lib/api/intake';

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

export default function CareUnitDetailPage({ basePath }: Props) {
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

  const load = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    try {
      const data = await getCareUnit(unitId);
      setUnit(data);
      setName(data.name ?? '');
      setCaregiverName(data.primaryCaregiverName ?? '');
      setCaregiverPhone(data.primaryCaregiverPhone ?? '');
      setCaregiverRelation(data.primaryCaregiverRelation ?? '');
      setAddress(data.address ?? '');
      setCity(data.city ?? '');
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error('Failed to load care unit');
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!unitId || !name.trim()) {
      toast.error('Care unit name is required');
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
      setEditing(false);
      toast.success('Care unit updated');
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

  if (!unit) {
    return <p className="text-stone-500">Care unit not found.</p>;
  }

  const patients = unit.careRecipients ?? [];
  const episodes = unit.careEpisodes ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          to={basePath}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft className="size-4" /> Back to care units
        </Link>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-stone-900">{unit.name}</h2>
            <p className="mt-1 text-sm text-stone-500">
              {patients.length} patient{patients.length === 1 ? '' : 's'} · {episodes.length}{' '}
              episode{episodes.length === 1 ? '' : 's'}
            </p>
          </div>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Edit care unit
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
        <h3 className="text-sm font-semibold text-stone-900">Care unit details</h3>
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
              <span className="text-xs font-semibold text-stone-500">Primary caregiver</span>
              <input
                value={caregiverName}
                onChange={(e) => setCaregiverName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">Phone</span>
              <input
                value={caregiverPhone}
                onChange={(e) => setCaregiverPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">Relation</span>
              <input
                value={caregiverRelation}
                onChange={(e) => setCaregiverRelation(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">City</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="sm:col-span-2 text-sm">
              <span className="text-xs font-semibold text-stone-500">Address</span>
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
              <dt className="text-xs font-semibold text-stone-500">Primary caregiver</dt>
              <dd className="mt-0.5 text-stone-900">{unit.primaryCaregiverName || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-stone-500">Phone</dt>
              <dd className="mt-0.5 text-stone-900">{unit.primaryCaregiverPhone || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-stone-500">Relation</dt>
              <dd className="mt-0.5 text-stone-900">{unit.primaryCaregiverRelation || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-stone-500">Location</dt>
              <dd className="mt-0.5 text-stone-900">
                {[unit.address, unit.city, unit.country].filter(Boolean).join(', ') || '—'}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="text-sm font-semibold text-stone-900">Patients</h3>
        </div>
        {patients.length === 0 ? (
          <p className="p-6 text-sm text-stone-500">No patients on this care unit yet.</p>
        ) : (
          <ul className="divide-y">
            {patients.map((patient) => (
              <li key={patient.id}>
                <Link
                  to={`${basePath}/${unitId}/${patient.id}`}
                  className="flex items-start gap-3 p-4 hover:bg-teal-50/40 transition-colors"
                >
                  <div className="mt-0.5 rounded-xl bg-stone-100 p-2 text-stone-600">
                    <UserRound className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-stone-900">{patient.name}</p>
                    <p className="mt-0.5 text-sm text-stone-500">
                      DOB {formatDob(patient.dateOfBirth)}
                      {patient.relationship ? ` · ${patient.relationship}` : ''}
                      {patient.externalRef ? ` · ${patient.externalRef}` : ''}
                    </p>
                    {patient.diagnosisCodes && patient.diagnosisCodes.length > 0 && (
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
            ))}
          </ul>
        )}
      </div>

      {episodes.length > 0 && (
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">Linked episodes (unit)</h3>
          <ul className="space-y-2">
            {episodes.map((ep) => (
              <li
                key={ep.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-stone-900">{ep.title}</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  {ep.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
