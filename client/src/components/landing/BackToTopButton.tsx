import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { scrollToTop } from '@/components/ScrollToTop';

const LANDING_PAGE_PREFIXES = [
  '/',
  '/about',
  '/blog',
  '/knowledge-hub',
  '/privacy',
  '/terms',
  '/delete-account',
  '/browse',
  '/find-care',
  '/find-support',
  '/doctor',
];

function isLandingPage(pathname: string): boolean {
  if (pathname === '/') return true;
  // Exclude dashboard / auth paths explicitly
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/trainer') ||
    pathname.startsWith('/coordinator') ||
    pathname.startsWith('/family') ||
    pathname.startsWith('/clinical') ||
    pathname.startsWith('/proposals') ||
    pathname.startsWith('/shells') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/set-password') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/video-room') ||
    pathname.startsWith('/ai-meet')
  ) {
    return false;
  }
  return LANDING_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function BackToTopButton() {
  const { pathname } = useLocation();
  const { t } = useTranslation('common');
  const { isRTL } = useI18n();
  const reduceMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);

  const shouldRenderOnPage = isLandingPage(pathname);

  useEffect(() => {
    if (!shouldRenderOnPage) {
      setIsVisible(false);
      return;
    }

    const handleScroll = () => {
      if (window.scrollY > 320) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [shouldRenderOnPage, pathname]);

  if (!shouldRenderOnPage) {
    return null;
  }

  const label = t('actions.scrollToTop', isRTL ? 'العودة للأعلى' : 'Back to top');

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={() => scrollToTop('smooth')}
          aria-label={label}
          title={label}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.85 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          whileHover={reduceMotion ? undefined : { y: -3, scale: 1.06 }}
          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
          className="fixed bottom-6 end-6 z-40 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-lg shadow-slate-900/10 backdrop-blur-md transition-colors duration-200 hover:border-teal-600 hover:bg-teal-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          style={{ minHeight: 'auto', minWidth: 'auto' }}
        >
          <ArrowUp className="h-5 w-5 transition-transform duration-200" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
