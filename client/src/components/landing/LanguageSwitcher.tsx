import { Globe } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { fontBody, fontArabic } from './tokens';

interface LanguageSwitcherProps {
  variant?: 'nav' | 'footer' | 'mobile';
  className?: string;
}

export function LanguageSwitcher({ variant = 'nav', className = '' }: LanguageSwitcherProps) {
  const { language, changeLanguage, isRTL } = useI18n();

  const toggleLanguage = () => {
    changeLanguage(language === 'ar' ? 'en' : 'ar');
  };

  if (variant === 'footer') {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14B8A6] ${className}`}
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          color: '#F0F7F6',
          fontFamily: isRTL ? fontArabic : fontBody,
        }}
      >
        <Globe className="h-3.5 w-3.5 text-[#14B8A6]" aria-hidden />
        <span>{language === 'ar' ? 'English' : 'العربية'}</span>
      </button>
    );
  }

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors duration-200 ${className}`}
        style={{
          background: '#F0FDFA',
          color: '#0D9488',
          border: '1px solid rgba(13, 148, 136, 0.2)',
          fontFamily: isRTL ? fontArabic : fontBody,
        }}
      >
        <span className="flex items-center gap-2">
          <Globe className="h-4 w-4" aria-hidden />
          <span>{language === 'ar' ? 'اللغة' : 'Language'}</span>
        </span>
        <span className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-[#0D9488] shadow-sm">
          {language === 'ar' ? 'English' : 'العربية'}
        </span>
      </button>
    );
  }

  // Navbar variant: compact, crisp pill
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:bg-[#F0FDFA] hover:text-[#0D9488] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14B8A6] ${className}`}
      style={{
        background: 'rgba(15, 23, 42, 0.04)',
        color: '#0F172A',
        fontFamily: isRTL ? fontArabic : fontBody,
      }}
    >
      <Globe className="h-3.5 w-3.5 text-[#0D9488]" aria-hidden />
      <span>{language === 'ar' ? 'English' : 'العربية'}</span>
    </button>
  );
}
