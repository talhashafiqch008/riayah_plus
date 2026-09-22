import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/components/I18nProvider';
import { client } from '@/lib/api/client';

type UiLang = 'en' | 'ar';

/**
 * Forced permanent language chooser when `user.uiLanguage` is unset.
 * Blocks the app until the user picks EN or AR (stored on the user record).
 */
export function LanguagePreferenceGate() {
  const { user, loading, refreshUser } = useAuth();
  const { changeLanguage } = useI18n();
  const { t, i18n } = useTranslation('common');
  const [saving, setSaving] = useState<UiLang | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading || !user) return null;
  if (user.uiLanguage === 'en' || user.uiLanguage === 'ar') return null;

  const choose = async (language: UiLang) => {
    if (saving) return;
    setSaving(language);
    setError(null);
    try {
      await client.put('/me/language', { language });
      changeLanguage(language);
      await refreshUser();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('languageGate.error');
      setError(msg);
    } finally {
      setSaving(null);
    }
  };

  const preview = (lang: UiLang) => {
    void i18n.changeLanguage(lang);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-gate-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">
          {t('languageGate.eyebrow')}
        </p>
        <h2 id="language-gate-title" className="mt-2 text-2xl font-bold text-stone-900">
          {t('languageGate.title')}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">{t('languageGate.body')}</p>
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          {t('languageGate.permanent')}
        </p>

        <form
          className="mt-6 grid gap-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
          }}
        >
          <button
            type="button"
            disabled={!!saving}
            onMouseEnter={() => preview('en')}
            onFocus={() => preview('en')}
            onClick={() => void choose('en')}
            className="rounded-xl border-2 border-stone-200 bg-white px-4 py-4 text-start transition hover:border-teal-500 hover:bg-teal-50 disabled:opacity-60"
          >
            <span className="block text-base font-bold text-stone-900">{t('language.en')}</span>
            <span className="mt-0.5 block text-xs text-stone-500">{t('languageGate.enHint')}</span>
          </button>
          <button
            type="button"
            disabled={!!saving}
            onMouseEnter={() => preview('ar')}
            onFocus={() => preview('ar')}
            onClick={() => void choose('ar')}
            className="rounded-xl border-2 border-stone-200 bg-white px-4 py-4 text-start transition hover:border-teal-500 hover:bg-teal-50 disabled:opacity-60"
            lang="ar"
            dir="rtl"
          >
            <span className="block text-base font-bold text-stone-900">{t('language.ar')}</span>
            <span className="mt-0.5 block text-xs text-stone-500">{t('languageGate.arHint')}</span>
          </button>
        </form>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {saving ? (
          <p className="mt-4 text-center text-sm text-stone-500">{t('languageGate.saving')}</p>
        ) : null}
      </div>
    </div>
  );
}
