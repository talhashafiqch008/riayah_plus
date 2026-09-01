import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';

/**
 * I18n & RTL Provider
 * Handles language initialization, RTL detection, and document direction
 */

export interface I18nContextType {
  language: string;
  isRTL: boolean;
  direction: 'ltr' | 'rtl';
  changeLanguage: (lang: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  isRTL: false,
  direction: 'ltr',
  changeLanguage: () => {},
  t: (key) => key,
});

export function useI18n() {
  return useContext(I18nContext);
}

// RTL Languages
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isInitialized, setIsInitialized] = useState(i18n.isInitialized);

  useEffect(() => {
    if (!i18n.isInitialized) {
      i18n.init().then(() => {
        setIsInitialized(true);
      });
    } else {
      setIsInitialized(true);
    }
  }, []);

  if (!isInitialized) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <I18nInnerProvider>{children}</I18nInnerProvider>
    </I18nextProvider>
  );
}

function I18nInnerProvider({ children }: { children: ReactNode }) {
  const { i18n: i18nInstance, t } = useTranslation();
  const [language, setLanguage] = useState(i18nInstance.language || 'en');
  const [isRTL, setIsRTL] = useState(RTL_LANGUAGES.includes(i18nInstance.language || 'en'));

  useEffect(() => {
    const currentLang = i18nInstance.language || 'en';
    const rtl = RTL_LANGUAGES.includes(currentLang);

    setLanguage(currentLang);
    setIsRTL(rtl);

    // Update document root attributes
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;

    if (rtl) {
      document.documentElement.classList.add('rtl');
      document.documentElement.classList.remove('ltr');
    } else {
      document.documentElement.classList.add('ltr');
      document.documentElement.classList.remove('rtl');
    }
  }, [i18nInstance.language]);

  useEffect(() => {
    const handleLanguageChange = (lang: string) => {
      const rtl = RTL_LANGUAGES.includes(lang);
      setLanguage(lang);
      setIsRTL(rtl);
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
      if (rtl) {
        document.documentElement.classList.add('rtl');
        document.documentElement.classList.remove('ltr');
      } else {
        document.documentElement.classList.add('ltr');
        document.documentElement.classList.remove('rtl');
      }
    };

    i18nInstance.on('languageChanged', handleLanguageChange);
    return () => {
      i18nInstance.off('languageChanged', handleLanguageChange);
    };
  }, [i18nInstance]);

  const changeLanguage = (lang: string) => {
    i18nInstance.changeLanguage(lang);
    try {
      localStorage.setItem('i18nextLng', lang);
    } catch {
      // ignore
    }
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        isRTL,
        direction: isRTL ? 'rtl' : 'ltr',
        changeLanguage,
        t,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}
