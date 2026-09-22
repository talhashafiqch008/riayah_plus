import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { extractApiError } from '@/lib/errors';
import {
  getMyStaffProfile,
  updateMyStaffProfile,
  uploadMyStaffAvatar,
  resolveMediaUrl,
  type StaffSelfProfile,
} from '@/lib/api/staffProfile';
import {
  RolePageHeader,
  RolePageShell,
  btnPrimaryClass,
  fieldClass,
} from '@/components/care/RolePageChrome';

const LANGUAGE_OPTIONS = [
  'English',
  'Arabic',
  'Urdu',
  'Tagalog',
  'Hindi',
  'Malayalam',
  'Bengali',
  'French',
];

const DAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

function splitTags(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function StaffProfileSettingsPage() {
  const { pathname } = useLocation();
  const isClinical = pathname.startsWith('/clinical');
  const isSupport = pathname.startsWith('/support');
  const isStaffLocalized = isClinical || isSupport;
  const { t } = useTranslation(isSupport ? 'support' : isClinical ? 'clinical' : 'coordinator');
  const p = (key: string, fallback: string) => (isStaffLocalized ? t(`profile.${key}`) : fallback);
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    avatar: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    languages: [] as string[],
    qatarId: '',
    yearsExperience: '',
    certifications: '',
    specialties: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    serviceAreas: '',
    bio: '',
    mohLicenseNumber: '',
    availDays: [] as number[],
    availStart: '09:00',
    availEnd: '17:00',
  });

  const applyProfile = useCallback((p: StaffSelfProfile) => {
    const schedule = p.availabilitySchedule;
    setForm({
      name: p.name ?? '',
      phone: p.phone ?? '',
      avatar: p.avatar ?? '',
      dateOfBirth: p.dateOfBirth ?? '',
      gender: p.gender ?? '',
      nationality: p.nationality ?? '',
      languages: p.languages ?? [],
      qatarId: p.qatarId ?? '',
      yearsExperience: p.yearsExperience != null ? String(p.yearsExperience) : '',
      certifications: (p.certifications ?? []).join(', '),
      specialties: (p.specialties ?? []).join(', '),
      emergencyContactName: p.emergencyContactName ?? '',
      emergencyContactPhone: p.emergencyContactPhone ?? '',
      serviceAreas: (p.serviceAreas ?? []).join(', '),
      bio: p.bio ?? '',
      mohLicenseNumber: p.mohLicenseNumber ?? '',
      availDays: schedule?.days ?? [],
      availStart: schedule?.windows?.[0]?.start ?? '09:00',
      availEnd: schedule?.windows?.[0]?.end ?? '17:00',
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const profile = await getMyStaffProfile();
        if (!cancelled) applyProfile(profile);
      } catch (error: unknown) {
        if (!cancelled) {
          toast.error(extractApiError(error).message || p('loadFailed', 'Failed to load profile'));
          if (user) {
            setForm((f) => ({
              ...f,
              name: `${user.firstName} ${user.lastName}`.trim() || user.email,
            }));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyProfile, user]);

  const toggleLanguage = (lang: string) => {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      availDays: prev.availDays.includes(day)
        ? prev.availDays.filter((d) => d !== day)
        : [...prev.availDays, day].sort(),
    }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      toast.error(p('photoOneOnly', 'Select only one profile photo'));
      e.target.value = '';
      return;
    }
    const file = files[0];
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(p('photoType', 'Use JPEG, PNG, or WebP only'));
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(p('photoSize', 'Photo must be 2 MB or smaller'));
      e.target.value = '';
      return;
    }

    setUploadingPhoto(true);
    try {
      const { avatar } = await uploadMyStaffAvatar(file);
      setForm((f) => ({ ...f, avatar }));
      await refreshUser().catch(() => undefined);
      toast.success(p('photoUpdated', 'Photo updated'));
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || p('photoUploadFailed', 'Failed to upload photo'));
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const years = form.yearsExperience.trim()
        ? Number.parseInt(form.yearsExperience, 10)
        : null;
      const updated = await updateMyStaffProfile({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender.trim() || null,
        nationality: form.nationality.trim() || null,
        languages: form.languages,
        qatarId: form.qatarId.trim() || null,
        yearsExperience: Number.isFinite(years) ? years : null,
        certifications: splitTags(form.certifications),
        specialties: splitTags(form.specialties),
        emergencyContactName: form.emergencyContactName.trim() || null,
        emergencyContactPhone: form.emergencyContactPhone.trim() || null,
        serviceAreas: splitTags(form.serviceAreas),
        bio: form.bio.trim() || null,
        mohLicenseNumber: form.mohLicenseNumber.trim() || null,
        availabilitySchedule: {
          days: form.availDays,
          windows: [{ start: form.availStart, end: form.availEnd }],
        },
      });
      applyProfile(updated);
      await refreshUser().catch(() => undefined);
      toast.success(p('saved', 'Profile saved'));
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || p('saveFailed', 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <RolePageShell>
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-teal-600" />
        </div>
      </RolePageShell>
    );
  }

  return (
    <RolePageShell>
      <RolePageHeader
        title={isStaffLocalized ? t('profile.title') : 'Profile settings'}
        description={
          isStaffLocalized
            ? t('profile.description')
            : 'Your public care profile and internal contact details. Families see photo, role, languages, and bio — not Qatar ID or emergency contacts.'
        }
      />

      <div className="space-y-6 max-w-3xl">
        <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-20 rounded-full bg-teal-100 overflow-hidden flex items-center justify-center">
              {form.avatar ? (
                <img
                  src={resolveMediaUrl(form.avatar) ?? undefined}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <User className="size-10 text-teal-700" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-xs font-semibold text-stone-500">{p('photo', 'Profile photo')}</span>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={`inline-flex cursor-pointer items-center rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 ${
                    uploadingPhoto ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {uploadingPhoto ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> {p('uploading', 'Uploading…')}
                    </span>
                  ) : (
                    p('choosePhoto', 'Choose photo')
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploadingPhoto}
                    onChange={(e) => void handlePhotoChange(e)}
                  />
                </label>
              </div>
              <p className="text-[11px] text-stone-400">
                {p('photoHint', 'One image only · JPEG, PNG, or WebP · max 2 MB. Shown on assessments and sessions.')}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="text-xs font-semibold text-stone-500">{p('fullName', 'Full name')}</span>
              <input
                className={`mt-1 ${fieldClass}`}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">{p('phone', 'Phone')}</span>
              <input
                className={`mt-1 ${fieldClass}`}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">{p('dateOfBirth', 'Date of birth (internal)')}</span>
              <input
                type="date"
                className={`mt-1 ${fieldClass}`}
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">{p('gender', 'Gender')}</span>
              <select
                className={`mt-1 ${fieldClass}`}
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              >
                <option value="">{p('genderSelect', 'Select…')}</option>
                <option value="female">{p('genderFemale', 'Female')}</option>
                <option value="male">{p('genderMale', 'Male')}</option>
                <option value="other">{p('genderOther', 'Other')}</option>
                <option value="prefer_not">{p('genderPreferNot', 'Prefer not to say')}</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">{p('nationality', 'Nationality')}</span>
              <input
                className={`mt-1 ${fieldClass}`}
                value={form.nationality}
                onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">{p('yearsExperience', 'Years of experience')}</span>
              <input
                type="number"
                min={0}
                max={80}
                className={`mt-1 ${fieldClass}`}
                value={form.yearsExperience}
                onChange={(e) => setForm((f) => ({ ...f, yearsExperience: e.target.value }))}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-xs font-semibold text-stone-500">{p('specialty', 'Specialty / role detail')}</span>
              <input
                className={`mt-1 ${fieldClass}`}
                value={form.specialties}
                onChange={(e) => setForm((f) => ({ ...f, specialties: e.target.value }))}
                placeholder={p('specialtyPlaceholder', 'e.g. General Practice, Physiotherapy')}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-xs font-semibold text-stone-500">{p('mohLicense', 'MOH license number (clinicians)')}</span>
              <input
                className={`mt-1 ${fieldClass}`}
                value={form.mohLicenseNumber}
                onChange={(e) => setForm((f) => ({ ...f, mohLicenseNumber: e.target.value }))}
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-stone-900">{p('languagesSpoken', 'Languages spoken')}</h3>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((lang) => {
              const on = form.languages.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${
                    on
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {isStaffLocalized ? t(`profile.lang.${lang}`, { defaultValue: lang }) : lang}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-stone-900">{p('publicDetails', 'Public details')}</h3>
          <label className="block text-sm">
            <span className="text-xs font-semibold text-stone-500">{p('certifications', 'Certifications (comma-separated)')}</span>
            <input
              className={`mt-1 ${fieldClass}`}
              value={form.certifications}
              onChange={(e) => setForm((f) => ({ ...f, certifications: e.target.value }))}
              placeholder={p('certificationsPlaceholder', 'First Aid, CPR, Dementia Care')}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold text-stone-500">{p('serviceAreas', 'Service areas')}</span>
            <input
              className={`mt-1 ${fieldClass}`}
              value={form.serviceAreas}
              onChange={(e) => setForm((f) => ({ ...f, serviceAreas: e.target.value }))}
              placeholder={p('serviceAreasPlaceholder', 'West Bay, Al Sadd, Lusail')}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold text-stone-500">{p('bio', 'Bio')}</span>
            <textarea
              rows={3}
              className={`mt-1 ${fieldClass}`}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder={p('bioPlaceholder', '2–3 sentences about your experience')}
            />
          </label>
          <div>
            <p className="text-xs font-semibold text-stone-500 mb-2">{p('availabilityDays', 'Availability days')}</p>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((d) => {
                const on = form.availDays.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border ${
                      on
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-stone-600 border-stone-200'
                    }`}
                  >
                    {isStaffLocalized ? t(`profile.days.${d.value}`) : d.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-xs font-semibold text-stone-500">{p('from', 'From')}</span>
                <input
                  type="time"
                  className={`mt-1 ${fieldClass}`}
                  value={form.availStart}
                  onChange={(e) => setForm((f) => ({ ...f, availStart: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="text-xs font-semibold text-stone-500">{p('to', 'To')}</span>
                <input
                  type="time"
                  className={`mt-1 ${fieldClass}`}
                  value={form.availEnd}
                  onChange={(e) => setForm((f) => ({ ...f, availEnd: e.target.value }))}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-stone-900">{p('internalOnly', 'Internal only')}</h3>
          <p className="text-xs text-stone-500">
            {p('internalHint', 'Not shown to families. Visible to you and operations staff.')}
          </p>
          <label className="block text-sm">
            <span className="text-xs font-semibold text-stone-500">{p('qatarId', 'Qatar ID / Residence no.')}</span>
            <input
              className={`mt-1 ${fieldClass}`}
              value={form.qatarId}
              onChange={(e) => setForm((f) => ({ ...f, qatarId: e.target.value }))}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">{p('emergencyName', 'Emergency contact name')}</span>
              <input
                className={`mt-1 ${fieldClass}`}
                value={form.emergencyContactName}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs font-semibold text-stone-500">{p('emergencyPhone', 'Emergency contact phone')}</span>
              <input
                className={`mt-1 ${fieldClass}`}
                value={form.emergencyContactPhone}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))}
              />
            </label>
          </div>
        </section>

        <button
          type="button"
          disabled={saving || !form.name.trim()}
          onClick={() => void handleSave()}
          className={`${btnPrimaryClass} inline-flex items-center gap-2`}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? p('saving', 'Saving…') : p('save', 'Save profile')}
        </button>
      </div>
    </RolePageShell>
  );
}
