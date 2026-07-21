import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  createCareUnit,
  createPatient,
  listCareUnits,
  submitIntake,
  updateCareUnit,
  uploadIntakeDocumentSmart,
  type IntakeDocument,
  type IntakeDocumentCategory,
  type ServiceCategory,
  type UrgencyLevel,
} from '@/lib/api/intake';

const STEPS = [
  'Care Unit',
  'Patient',
  'Caregiver',
  'Reason for care',
  'Medical history',
  'Urgency',
  'Services',
  'Docs & consent',
] as const;

const DOC_CATEGORIES: { value: IntakeDocumentCategory; label: string }[] = [
  { value: 'referral', label: 'Referral letter' },
  { value: 'prior_assessment', label: 'Prior assessment' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'medical_report', label: 'Medical report' },
  { value: 'consent', label: 'Consent form' },
  { value: 'other', label: 'Other' },
];

const DIAGNOSIS_OPTIONS = [
  { code: 'I10', label: 'I10 — Essential hypertension' },
  { code: 'E11', label: 'E11 — Type 2 diabetes' },
  { code: 'F03', label: 'F03 — Unspecified dementia' },
  { code: 'G20', label: 'G20 — Parkinson disease' },
  { code: 'I63', label: 'I63 — Cerebral infarction' },
  { code: 'M54', label: 'M54 — Dorsalgia / back pain' },
  { code: 'J44', label: 'J44 — COPD' },
  { code: 'F32', label: 'F32 — Depressive episode' },
];

const SERVICE_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: 'physiotherapy', label: 'Physiotherapy' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'occupational_therapy', label: 'Occupational therapy' },
  { value: 'speech_therapy', label: 'Speech therapy' },
  { value: 'behavioral_support', label: 'Behavioral support' },
  { value: 'companion_care', label: 'Companion care' },
];

const URGENCY_OPTIONS: { value: UrgencyLevel; label: string; hint: string }[] = [
  { value: 'low', label: 'Low', hint: 'Can wait 2+ weeks' },
  { value: 'medium', label: 'Medium', hint: 'Needed within 1–2 weeks' },
  { value: 'high', label: 'High', hint: 'Needed this week' },
  { value: 'urgent', label: 'Urgent', hint: 'Needs review ASAP' },
];

interface WizardState {
  careUnitId: string;
  careUnitName: string;
  address: string;
  city: string;
  patientName: string;
  dateOfBirth: string;
  gender: string;
  relationship: string;
  caregiverName: string;
  caregiverPhone: string;
  caregiverRelation: string;
  reasonForCare: string;
  medicalHistory: string;
  currentMeds: string;
  diagnoses: string[];
  customDiagnosis: string;
  urgencyLevel: UrgencyLevel | '';
  serviceInterests: ServiceCategory[];
  documentNotes: string;
  privacyConsent: boolean;
  treatmentConsent: boolean;
}

const initialState: WizardState = {
  careUnitId: '',
  careUnitName: '',
  address: '',
  city: 'Doha',
  patientName: '',
  dateOfBirth: '',
  gender: '',
  relationship: '',
  caregiverName: '',
  caregiverPhone: '',
  caregiverRelation: '',
  reasonForCare: '',
  medicalHistory: '',
  currentMeds: '',
  diagnoses: [],
  customDiagnosis: '',
  urgencyLevel: '',
  serviceInterests: [],
  documentNotes: '',
  privacyConsent: false,
  treatmentConsent: false,
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-stone-700 mb-1.5">{children}</label>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 border border-stone-300 rounded-xl text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent ${props.className ?? ''}`}
    />
  );
}

function TextTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2.5 border border-stone-300 rounded-xl text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[96px] ${props.className ?? ''}`}
    />
  );
}

export default function FamilyClinicalOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardState>(initialState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedIntakeId, setSubmittedIntakeId] = useState<string | null>(null);
  const [docCategory, setDocCategory] = useState<IntakeDocumentCategory>('referral');
  const [uploadedDocs, setUploadedDocs] = useState<IntakeDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const units = await listCareUnits();
        const existing = units.data[0];
        if (!cancelled && existing) {
          setForm((prev) => ({
            ...prev,
            careUnitId: existing.id,
            careUnitName: existing.name,
            address: existing.address ?? '',
            city: existing.city ?? 'Doha',
            caregiverName: existing.primaryCaregiverName ?? '',
            caregiverPhone: existing.primaryCaregiverPhone ?? '',
            caregiverRelation: existing.primaryCaregiverRelation ?? '',
          }));
        }
      } catch {
        // first-time family with no unit yet is fine
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  const setField = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDiagnosis = (code: string) => {
    setForm((prev) => ({
      ...prev,
      diagnoses: prev.diagnoses.includes(code)
        ? prev.diagnoses.filter((d) => d !== code)
        : [...prev.diagnoses, code],
    }));
  };

  const toggleService = (value: ServiceCategory) => {
    setForm((prev) => ({
      ...prev,
      serviceInterests: prev.serviceInterests.includes(value)
        ? prev.serviceInterests.filter((s) => s !== value)
        : [...prev.serviceInterests, value],
    }));
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 0:
        if (form.careUnitName.trim().length < 2) {
          toast.error('Care unit name is required.');
          return false;
        }
        return true;
      case 1:
        if (form.patientName.trim().length < 2) {
          toast.error('Patient name is required.');
          return false;
        }
        return true;
      case 2:
        if (form.caregiverName.trim().length < 2) {
          toast.error('Primary caregiver name is required.');
          return false;
        }
        return true;
      case 3:
        if (form.reasonForCare.trim().length < 5) {
          toast.error('Please describe the reason for care (at least a short sentence).');
          return false;
        }
        return true;
      case 4: {
        const codes = [...form.diagnoses];
        if (form.customDiagnosis.trim()) codes.push(form.customDiagnosis.trim());
        if (codes.length === 0) {
          toast.error('Select at least one coded diagnosis (ICD-style).');
          return false;
        }
        return true;
      }
      case 5:
        if (!form.urgencyLevel) {
          toast.error('Select an urgency level.');
          return false;
        }
        return true;
      case 6:
        if (form.serviceInterests.length === 0) {
          toast.error('Select at least one service interest.');
          return false;
        }
        return true;
      case 7:
        if (!form.privacyConsent || !form.treatmentConsent) {
          toast.error('Privacy and Treatment consent are required.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const ensureCareUnitId = async (): Promise<string> => {
    if (!form.careUnitName.trim()) {
      throw new Error('Care unit name is required before uploading documents.');
    }
    if (form.careUnitId) {
      await updateCareUnit(form.careUnitId, {
        name: form.careUnitName.trim(),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        primaryCaregiverName: form.caregiverName.trim() || undefined,
        primaryCaregiverPhone: form.caregiverPhone.trim() || undefined,
        primaryCaregiverRelation: form.caregiverRelation.trim() || undefined,
      });
      return form.careUnitId;
    }
    const unit = await createCareUnit({
      name: form.careUnitName.trim(),
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      country: 'QA',
      primaryCaregiverName: form.caregiverName.trim() || undefined,
      primaryCaregiverPhone: form.caregiverPhone.trim() || undefined,
      primaryCaregiverRelation: form.caregiverRelation.trim() || undefined,
    });
    setField('careUnitId', unit.id);
    return unit.id;
  };

  const handleDocUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploadingDoc(true);
    try {
      const careUnitId = await ensureCareUnitId();
      const created: IntakeDocument[] = [];
      for (const file of files) {
        const doc = await uploadIntakeDocumentSmart(careUnitId, docCategory, file);
        created.push(doc);
      }
      setUploadedDocs((prev) => [...prev, ...created]);
      toast.success(
        created.length === 1
          ? `Uploaded ${created[0].name}`
          : `Uploaded ${created.length} files`,
      );
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else if (error instanceof Error) toast.error(error.message);
      else toast.error('Upload failed');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      let careUnitId = form.careUnitId;
      if (careUnitId) {
        await updateCareUnit(careUnitId, {
          name: form.careUnitName.trim(),
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          primaryCaregiverName: form.caregiverName.trim(),
          primaryCaregiverPhone: form.caregiverPhone.trim() || undefined,
          primaryCaregiverRelation: form.caregiverRelation.trim() || undefined,
        });
      } else {
        const unit = await createCareUnit({
          name: form.careUnitName.trim(),
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          country: 'QA',
          primaryCaregiverName: form.caregiverName.trim(),
          primaryCaregiverPhone: form.caregiverPhone.trim() || undefined,
          primaryCaregiverRelation: form.caregiverRelation.trim() || undefined,
        });
        careUnitId = unit.id;
        setField('careUnitId', unit.id);
      }

      const diagnoses = [...form.diagnoses];
      if (form.customDiagnosis.trim()) {
        diagnoses.push(form.customDiagnosis.trim().toUpperCase());
      }

      const patient = await createPatient(careUnitId, {
        name: form.patientName.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        relationship: form.relationship || undefined,
        diagnosisCodes: diagnoses,
        pocName: form.caregiverName.trim(),
        pocPhone: form.caregiverPhone.trim() || undefined,
        notes: form.medicalHistory.trim() || undefined,
      });

      const intake = await submitIntake({
        careUnitId,
        careRecipientId: patient.id,
        reasonForCare: form.reasonForCare.trim(),
        medicalHistory: form.medicalHistory.trim() || undefined,
        currentMeds: form.currentMeds.trim() || undefined,
        diagnoses,
        serviceInterests: form.serviceInterests,
        urgencyLevel: form.urgencyLevel as UrgencyLevel,
        primaryCaregiverName: form.caregiverName.trim(),
        primaryCaregiverPhone: form.caregiverPhone.trim() || undefined,
        primaryCaregiverRelation: form.caregiverRelation.trim() || undefined,
        wizardPayload: {
          steps: STEPS,
          documentNotes: form.documentNotes,
          privacyConsent: form.privacyConsent,
          treatmentConsent: form.treatmentConsent,
          documentIds: uploadedDocs.map((d) => d.id),
        },
        documentIds: uploadedDocs.map((d) => d.id),
        privacyConsent: form.privacyConsent,
        treatmentConsent: form.treatmentConsent,
      });

      setSubmittedIntakeId(intake.id);
      toast.success('Intake submitted — a coordinator will review it soon.');
    } catch (error: unknown) {
      if (isApiError(error)) {
        toast.error(error.message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to submit intake.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[240px]">
        <Loader2 className="size-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (submittedIntakeId) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-teal-100">
          <Check className="size-6 text-teal-700" />
        </div>
        <h2 className="text-2xl font-semibold text-stone-900 mb-2">Intake submitted</h2>
        <p className="text-stone-600 mb-6">
          Status is <span className="font-semibold text-teal-700">Submitted</span>. Your care
          coordinator will review this and may create a care episode.
        </p>
        <p className="text-xs text-stone-400 mb-6 font-mono">Intake ID: {submittedIntakeId}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate('/family')}
            className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Back to dashboard
          </button>
          <Link
            to="/family/documents"
            className="rounded-xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Documents (upload later)
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Clinical onboarding</h2>
        <p className="mt-1 text-stone-600">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
        <div className="mt-4 h-2 rounded-full bg-stone-200 overflow-hidden">
          <div
            className="h-full bg-teal-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                i === step
                  ? 'bg-teal-600 text-white'
                  : i < step
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-stone-100 text-stone-500'
              }`}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        {step === 0 && (
          <>
            <FieldLabel>Care unit name</FieldLabel>
            <TextInput
              value={form.careUnitName}
              onChange={(e) => setField('careUnitName', e.target.value)}
              placeholder="e.g. Al-Mansoori Family"
            />
            <FieldLabel>Address</FieldLabel>
            <TextInput
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="Street / building"
            />
            <FieldLabel>City</FieldLabel>
            <TextInput value={form.city} onChange={(e) => setField('city', e.target.value)} />
            {form.careUnitId && (
              <p className="text-xs text-stone-500">
                Using your existing care unit — details will be updated on submit.
              </p>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <FieldLabel>Patient full name</FieldLabel>
            <TextInput
              value={form.patientName}
              onChange={(e) => setField('patientName', e.target.value)}
              placeholder="Who needs care?"
            />
            <FieldLabel>Date of birth</FieldLabel>
            <TextInput
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setField('dateOfBirth', e.target.value)}
            />
            <FieldLabel>Gender</FieldLabel>
            <select
              value={form.gender}
              onChange={(e) => setField('gender', e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-xl"
            >
              <option value="">Select…</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>
            <FieldLabel>Relationship to you</FieldLabel>
            <TextInput
              value={form.relationship}
              onChange={(e) => setField('relationship', e.target.value)}
              placeholder="e.g. parent, spouse"
            />
          </>
        )}

        {step === 2 && (
          <>
            <FieldLabel>Primary caregiver name</FieldLabel>
            <TextInput
              value={form.caregiverName}
              onChange={(e) => setField('caregiverName', e.target.value)}
            />
            <FieldLabel>Phone</FieldLabel>
            <TextInput
              value={form.caregiverPhone}
              onChange={(e) => setField('caregiverPhone', e.target.value)}
              placeholder="+974…"
            />
            <FieldLabel>Relation to patient</FieldLabel>
            <TextInput
              value={form.caregiverRelation}
              onChange={(e) => setField('caregiverRelation', e.target.value)}
              placeholder="e.g. daughter"
            />
          </>
        )}

        {step === 3 && (
          <>
            <FieldLabel>Reason for care</FieldLabel>
            <TextTextarea
              value={form.reasonForCare}
              onChange={(e) => setField('reasonForCare', e.target.value)}
              placeholder="What support do you need, and why now?"
            />
          </>
        )}

        {step === 4 && (
          <>
            <FieldLabel>Medical history</FieldLabel>
            <TextTextarea
              value={form.medicalHistory}
              onChange={(e) => setField('medicalHistory', e.target.value)}
              placeholder="Relevant conditions, hospitalizations, allergies…"
            />
            <FieldLabel>Current medications</FieldLabel>
            <TextInput
              value={form.currentMeds}
              onChange={(e) => setField('currentMeds', e.target.value)}
              placeholder="e.g. Amlodipine 5mg daily"
            />
            <FieldLabel>Diagnoses (coded — select all that apply)</FieldLabel>
            <div className="space-y-2">
              {DIAGNOSIS_OPTIONS.map((opt) => (
                <label
                  key={opt.code}
                  className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2 cursor-pointer hover:bg-stone-50"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.diagnoses.includes(opt.code)}
                    onChange={() => toggleDiagnosis(opt.code)}
                  />
                  <span className="text-sm text-stone-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <FieldLabel>Other ICD / code</FieldLabel>
            <TextInput
              value={form.customDiagnosis}
              onChange={(e) => setField('customDiagnosis', e.target.value)}
              placeholder="Optional extra code e.g. R26"
            />
          </>
        )}

        {step === 5 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {URGENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setField('urgencyLevel', opt.value)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  form.urgencyLevel === opt.value
                    ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-200'
                    : 'border-stone-200 hover:border-teal-300'
                }`}
              >
                <p className="font-semibold text-stone-900">{opt.label}</p>
                <p className="text-xs text-stone-500 mt-1">{opt.hint}</p>
              </button>
            ))}
          </div>
        )}

        {step === 6 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {SERVICE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-2 rounded-xl border px-3 py-3 cursor-pointer ${
                  form.serviceInterests.includes(opt.value)
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-stone-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.serviceInterests.includes(opt.value)}
                  onChange={() => toggleService(opt.value)}
                />
                <span className="text-sm font-medium text-stone-800">{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {step === 7 && (
          <>
            <p className="text-sm text-stone-600">
              Upload referral letters, prior assessments, insurance, or medical reports. Files go to
              secure storage (S3 when configured; local fallback in development).
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>Document category</FieldLabel>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as IntakeDocumentCategory)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-stone-900"
                >
                  {DOC_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Choose file(s)</FieldLabel>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,image/*"
                  disabled={uploadingDoc}
                  onChange={(e) => {
                    // Snapshot before clearing — FileList is a live reference
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    e.target.value = '';
                    void handleDocUpload(files);
                  }}
                  className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-800"
                />
              </div>
            </div>

            {uploadingDoc && (
              <p className="text-sm text-teal-700 inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Uploading…
              </p>
            )}

            {uploadedDocs.length > 0 && (
              <ul className="rounded-xl border border-stone-200 divide-y bg-stone-50">
                {uploadedDocs.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-stone-800 truncate">{doc.name}</span>
                    <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">
                      {(doc.category || docCategory).replace(/_/g, ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <FieldLabel>Document notes (optional)</FieldLabel>
            <TextTextarea
              value={form.documentNotes}
              onChange={(e) => setField('documentNotes', e.target.value)}
              placeholder="e.g. Hospital discharge summary attached"
            />
            <label className="flex items-start gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.privacyConsent}
                onChange={(e) => setField('privacyConsent', e.target.checked)}
              />
              I agree to the Privacy Consent for processing this intake.
            </label>
            <label className="flex items-start gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.treatmentConsent}
                onChange={(e) => setField('treatmentConsent', e.target.checked)}
              />
              I agree to the Treatment Consent for clinical review of this information.
            </label>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={step === 0 || submitting}
          className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 disabled:opacity-40 hover:bg-stone-50"
        >
          <ChevronLeft className="size-4" /> Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Next <ChevronRight className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Submitting…
              </>
            ) : (
              'Submit intake'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
