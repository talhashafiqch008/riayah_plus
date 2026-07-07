
import { useEffect, useState, useRef, createContext, useContext, ReactNode } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';

/**
 * I18n & RTL Provider
 * Handles language initialization, RTL detection, and document direction
 */

interface I18nContextType {
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

function useI18n() {
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
 // Initialize i18n on client side
 if (!i18n.isInitialized) {
 i18n.init().then(() => {
 setIsInitialized(true);
 });
 } else {
 setIsInitialized(true);
 }
 }, []);

 // Show nothing until i18n is initialized (prevents hydration mismatch)
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
 const [isRTL, setIsRTL] = useState(false);

 // Update RTL and document direction when language changes
 useEffect(() => {
 const currentLang = i18nInstance.language || 'en';
 const rtl = RTL_LANGUAGES.includes(currentLang);
 
 setLanguage(currentLang);
 setIsRTL(rtl);

 // Update document direction
 document.documentElement.dir = rtl ? 'rtl' : 'ltr';
 document.documentElement.lang = currentLang;

 // Add RTL class for Tailwind utilities
 if (rtl) {
 document.documentElement.classList.add('rtl');
 } else {
 document.documentElement.classList.remove('rtl');
 }
 }, [i18nInstance.language]);

 // Listen for language changes
 useEffect(() => {
 const handleLanguageChange = (lang: string) => {
 const rtl = RTL_LANGUAGES.includes(lang);
 setLanguage(lang);
 setIsRTL(rtl);
 document.documentElement.dir = rtl ? 'rtl' : 'ltr';
 document.documentElement.lang = lang;
 };

 i18nInstance.on('languageChanged', handleLanguageChange);
 return () => {
 i18nInstance.off('languageChanged', handleLanguageChange);
 };
 }, [i18nInstance]);

 const changeLanguage = (lang: string) => {
 i18nInstance.changeLanguage(lang);
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

/**
 * Language Toggle Component
 * Prominently displayed for Middle East users
 */
interface LanguageToggleProps {
 className?: string;
 compact?: boolean;
}

function LanguageToggle({ className = '', compact = false }: LanguageToggleProps) {
 const { language, changeLanguage } = useI18n();

 const languages = [
 { code: 'en', label: 'English', shortLabel: 'EN' },
 { code: 'ar', label: 'العربية', shortLabel: 'ع' },
 ];

 if (compact) {
 return (
 <button
 onClick={() => changeLanguage(language === 'en' ? 'ar' : 'en')}
 className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all duration-200 ${className}`}
 >
 <span className="text-sm font-medium">
 {language === 'en' ? 'ع' : 'EN'}
 </span>
 </button>
 );
 }

 return (
 <div className={`flex items-center gap-1 p-1 bg-stone-100 rounded-lg ${className}`}>
 {languages.map((lang) => (
 <button
 key={lang.code}
 onClick={() => changeLanguage(lang.code)}
 className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${language === lang.code ? 'bg-white text-teal-600 shadow-sm' : 'text-stone-600 hover:text-stone-900' }`}
 >
 {lang.shortLabel}
 </button>
 ))}
 </div>
 );
}

