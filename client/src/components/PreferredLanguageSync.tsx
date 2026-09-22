import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/components/I18nProvider';

/**
 * When the authenticated user has a permanent `uiLanguage`, force i18n to match
 * (overrides localStorage / browser detection).
 */
export function PreferredLanguageSync() {
  const { user } = useAuth();
  const { language, changeLanguage } = useI18n();

  useEffect(() => {
    const preferred = user?.uiLanguage;
    if (preferred !== 'en' && preferred !== 'ar') return;
    if (language === preferred || language.startsWith(preferred)) return;
    changeLanguage(preferred);
  }, [user?.uiLanguage, language, changeLanguage]);

  return null;
}
