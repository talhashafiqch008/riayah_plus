import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontBody, fontHeading, fontArabic, easeOut } from './tokens';
import { LandingButton } from './LandingButton';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Navbar() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const isHomePage = location.pathname === '/';

  const navLinks = [
    { label: t('nav.howItWorks', 'How it works'), href: isHomePage ? '#how-it-works' : '/#how-it-works' },
    { label: t('nav.carePlan', 'Care Plan'), href: isHomePage ? '#care-plan' : '/#care-plan' },
    { label: t('nav.services', 'Services'), href: isHomePage ? '#services' : '/#services' },
    { label: t('nav.enterprise', 'Enterprise'), href: isHomePage ? '#enterprise' : '/#enterprise' },
    { label: t('nav.coordinator', 'Care Coordinator'), href: isHomePage ? '#coordinator' : '/#coordinator' },
    { label: t('nav.faq', 'FAQ'), href: isHomePage ? '#faq' : '/#faq' },
    { label: t('nav.about', 'About'), href: '/about' },
    { label: t('nav.knowledgeHub', 'Blogs'), href: '/blog' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <motion.header
        initial={reduceMotion ? false : { y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: easeOut }}
        className="fixed inset-x-0 top-0 z-50 transition-[background,border-color,box-shadow] duration-300"
        style={{
          background: scrolled || open ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom:
            scrolled || open ? `1px solid ${L.lineSoft}` : '1px solid rgba(15,23,42,0.04)',
          boxShadow: scrolled ? '0 8px 24px -16px rgba(15,23,42,0.12)' : 'none',
        }}
      >
        <div className={`mx-auto flex h-[4.5rem] w-full max-w-[90rem] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12`}>
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14B8A6]"
            style={{ borderRadius: 10 }}
          >
            <img
              src="/logo.png"
              alt=""
              width={42}
              height={42}
              className="h-10 w-10 shrink-0 object-contain"
            />
            <span className="flex shrink-0 flex-col leading-none">
              <span
                className="whitespace-nowrap text-[16px] font-bold tracking-tight"
                style={{ color: L.ink, fontFamily: fontHeading }}
              >
                Riayah Plus
              </span>
              <span
                className="mt-0.5 whitespace-nowrap text-[11px] font-medium"
                style={{ color: L.fog, fontFamily: fontArabic }}
                lang="ar"
              >
                رعاية بلس
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary">
            {navLinks.map(({ label, href }) => {
              const isInternalRoute = href.startsWith('/') && !href.includes('#');
              const isActive =
                isInternalRoute &&
                (location.pathname === href || (href === '/blog' && location.pathname.startsWith('/blog')));

              return isInternalRoute ? (
                <Link
                  key={label}
                  to={href}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors duration-200 hover:bg-[#F0FDFA] hover:text-[#0D9488] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14B8A6] ${
                    isActive ? 'bg-[#F0FDFA] text-[#0D9488]' : ''
                  }`}
                  style={{
                    color: isActive ? '#0D9488' : L.fog,
                    fontFamily: isRTL ? fontArabic : fontBody,
                  }}
                >
                  {label}
                </Link>
              ) : (
                <a
                  key={label}
                  href={href}
                  className="whitespace-nowrap rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors duration-200 hover:bg-[#F0FDFA] hover:text-[#0D9488] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14B8A6]"
                  style={{ color: L.fog, fontFamily: isRTL ? fontArabic : fontBody }}
                >
                  {label}
                </a>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            <LanguageSwitcher variant="nav" />
            <Link
              to="/login"
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 hover:text-[#0D9488] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14B8A6]"
              style={{ color: L.fog, fontFamily: isRTL ? fontArabic : fontBody }}
            >
              {t('nav.signIn', 'Sign In')}
            </Link>
            <LandingButton
              to="/register"
              variant="solid"
              fill="none"
              className="min-h-10 whitespace-nowrap px-5 text-sm"
              style={{ background: L.ink, borderColor: L.ink, boxShadow: 'none' }}
            >
              {t('nav.bookConsultation', 'Sign up')}
            </LandingButton>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher variant="nav" />
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14B8A6]"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              style={{ color: L.ink }}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-[4.5rem] z-40 flex max-h-[calc(100vh-4.5rem)] flex-col gap-1 overflow-y-auto px-5 py-5 lg:hidden"
            style={{
              background: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(16px)',
              borderBottom: `1px solid ${L.lineSoft}`,
            }}
          >
            {navLinks.map(({ label, href }) => {
              const isInternalRoute = href.startsWith('/') && !href.includes('#');
              return isInternalRoute ? (
                <Link
                  key={label}
                  to={href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium"
                  style={{ color: L.ink, fontFamily: isRTL ? fontArabic : fontBody }}
                >
                  {label}
                </Link>
              ) : (
                <a
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium"
                  style={{ color: L.ink, fontFamily: isRTL ? fontArabic : fontBody }}
                >
                  {label}
                </a>
              );
            })}
            <div className="mt-2 flex flex-col gap-2 border-t pt-4" style={{ borderColor: L.lineSoft }}>
              <LanguageSwitcher variant="mobile" />
              <LandingButton
                to="/register"
                variant="solid"
                fill="left"
                className="min-h-11 w-full text-sm"
                onClick={() => setOpen(false)}
              >
                {t('nav.bookConsultation', 'Book a Consultation')}
              </LandingButton>
              <LandingButton
                to="/login"
                variant="outline"
                fill="left"
                className="min-h-11 w-full text-sm"
                onClick={() => setOpen(false)}
              >
                {t('nav.signIn', 'Sign In')}
              </LandingButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
