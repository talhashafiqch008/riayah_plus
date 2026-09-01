import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  HeartHandshake,
  ShieldCheck,
  Users,
  Home,
  Video,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, easeOut } from './tokens';
import { LandingButton } from './LandingButton';

export function Hero() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();
  const reduceMotion = useReducedMotion();

  const trustStripItems = [
    {
      icon: HeartHandshake,
      title: t('trustStrip.disabilityCare.title', 'Disability Care'),
      desc: t('trustStrip.disabilityCare.desc', 'Individualized support & therapy'),
      bg: L.iconTeal,
      color: L.sea,
    },
    {
      icon: ShieldCheck,
      title: t('trustStrip.agedCare.title', 'Aged Care'),
      desc: t('trustStrip.agedCare.desc', 'Compassionate home & clinical support'),
      bg: L.iconGreen,
      color: '#059669',
    },
    {
      icon: Users,
      title: t('trustStrip.careCoordination.title', 'Care Coordination'),
      desc: t('trustStrip.careCoordination.desc', 'One dedicated person managing care'),
      bg: L.iconBlue,
      color: '#2563EB',
    },
    {
      icon: Home,
      title: t('trustStrip.homeCommunity.title', 'Home & Community Support'),
      desc: t('trustStrip.homeCommunity.desc', 'Daily living & community engagement'),
      bg: L.iconPurple,
      color: '#7C3AED',
    },
    {
      icon: Video,
      title: t('trustStrip.telehealth.title', 'Telehealth'),
      desc: t('trustStrip.telehealth.desc', 'Direct consultations with your team'),
      bg: L.iconTeal,
      color: L.sea,
    },
  ];

  return (
    <section className="relative overflow-x-clip bg-white pt-20" aria-labelledby="hero-heading">
      {/* Soft organic pale-teal shape inside clip */}
      <div
        className="pointer-events-none absolute inset-y-0 end-0 top-8 hidden w-[min(58%,42rem)] overflow-hidden lg:block"
        aria-hidden
      >
        <div
          className="absolute -end-[20%] top-0 h-[90%] w-[120%]"
          style={{
            background: `radial-gradient(ellipse 70% 75% at 55% 40%, ${L.sky} 0%, #E8F8F6 45%, transparent 72%)`,
            borderRadius: '48% 52% 45% 55% / 50% 42% 58% 50%',
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute end-8 top-24 z-[1] hidden h-24 w-32 opacity-45 lg:block"
        aria-hidden
        style={{
          backgroundImage: 'radial-gradient(#38BDF8 1.6px, transparent 1.6px)',
          backgroundSize: '12px 12px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-6">
        <div className="relative lg:min-h-[580px] lg:pb-6">
          {/* Leading copy */}
          <div className="relative z-20 max-w-xl pt-2 text-start lg:w-[46%] lg:max-w-none lg:pt-6 lg:pe-6">
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(12px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.45, ease: easeOut }}
              className={`mb-5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase ${
                isRTL ? 'tracking-normal' : 'tracking-[0.14em]'
              }`}
              style={{
                background: L.sky,
                color: L.sea,
                fontFamily: isRTL ? fontArabic : fontBody,
              }}
            >
              <Sparkles className="h-3.5 w-3.5 text-[#0D9488]" aria-hidden />
              {t('hero.badge', 'Specialized Disability & Aged Care')}
            </motion.p>

            <motion.h1
              id="hero-heading"
              initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(18px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.55, delay: reduceMotion ? 0 : 0.05, ease: easeOut }}
              className="mb-5 text-start"
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                fontWeight: 700,
                fontSize: 'clamp(2.2rem, 5.2vw, 3.6rem)',
                lineHeight: isRTL ? 1.4 : 1.08,
                letterSpacing: isRTL ? 'normal' : '-0.035em',
              }}
            >
              <span className="block" style={{ color: L.ink }}>
                {t('hero.titleLine1', 'Specialized Care.')}
              </span>
              <span className="block" style={{ color: L.sea }}>
                {t('hero.titleLine2', 'Built Around Your Family.')}
              </span>
            </motion.h1>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(10px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.12, ease: easeOut }}
              className="mb-9 max-w-[28rem] text-start text-[1.05rem]"
              style={{
                color: L.fog,
                fontFamily: isRTL ? fontArabic : fontBody,
                lineHeight: isRTL ? 1.75 : 1.6,
                letterSpacing: isRTL ? 'normal' : undefined,
              }}
            >
              {t(
                'hero.subtitle',
                "Disability and aged care designed around your loved one's needs, goals, and everyday life."
              )}
            </motion.p>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(10px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.2, ease: easeOut }}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <LandingButton
                to="/register"
                variant="solid"
                fill="left"
                shape="boxy"
                className="min-h-12 px-7 text-[15px]"
              >
                {t('hero.bookConsultation', 'Book a Consultation')}
                <ArrowRight className="h-4 w-4 rtl-flip" aria-hidden />
              </LandingButton>
              <LandingButton
                href="#how-it-works"
                variant="soft"
                fill="left"
                shape="boxy"
                className="min-h-12 px-7 text-[15px]"
              >
                {t('hero.howItWorks', 'How Riayah Works')}
              </LandingButton>
            </motion.div>
          </div>

          {/* Desktop photographic composition */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.1, ease: easeOut }}
            className={`absolute top-0 z-0 hidden overflow-hidden lg:block ${
              isRTL ? 'end-[44%]' : 'start-[44%]'
            }`}
            style={{
              [isRTL ? 'left' : 'right']: 'calc(-1 * max(0px, (100vw - 72rem) / 2))',
              bottom: '-5.5rem',
            }}
          >
            <img
              src="/landing/who-family.jpg"
              alt="Family and person receiving specialized disability and aged care support"
              className="h-full w-full object-cover object-[center_24%]"
              fetchPriority="high"
            />
            {/* Soft blend into the left column */}
            <div
              className={`pointer-events-none absolute inset-y-0 w-[18%] ${
                isRTL
                  ? 'right-0 bg-gradient-to-l from-white via-white/60 to-transparent'
                  : 'left-0 bg-gradient-to-r from-white via-white/60 to-transparent'
              }`}
              aria-hidden
            />
          </motion.div>

          {/* Mobile / tablet photo */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(14px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.55, delay: reduceMotion ? 0 : 0.1, ease: easeOut }}
            className="relative mt-10 overflow-hidden rounded-2xl lg:hidden"
            style={{ aspectRatio: '4 / 3' }}
          >
            <img
              src="/landing/who-family.jpg"
              alt="Family receiving personalized care support"
              className="h-full w-full object-cover object-[center_20%]"
            />
          </motion.div>
        </div>
      </div>

      {/* 5-Pillar Trust Strip — overlaps the photo */}
      <div className="relative z-20 -mb-14 px-5 sm:-mb-16 sm:px-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(18px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.26, ease: easeOut }}
          className="mx-auto grid max-w-6xl grid-cols-2 gap-4 rounded-[1.5rem] bg-white p-5 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4 sm:p-6"
          style={{
            boxShadow: '0 24px 50px -18px rgba(15,23,42,0.18)',
            border: '1px solid rgba(15,23,42,0.06)',
          }}
        >
          {trustStripItems.map(({ icon: Icon, title, desc, bg, color }, i) => (
            <motion.div
              key={title}
              initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(10px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{
                duration: 0.4,
                delay: reduceMotion ? 0 : 0.3 + i * 0.06,
                ease: easeOut,
              }}
              className="flex items-start gap-3"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11"
                style={{ background: bg, color }}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p
                  className="text-[13.5px] font-bold leading-snug"
                  style={{
                    color: L.ink,
                    fontFamily: isRTL ? fontArabic : fontHeading,
                    lineHeight: isRTL ? 1.4 : 1.25,
                  }}
                >
                  {title}
                </p>
                <p
                  className="mt-0.5 text-xs"
                  style={{
                    color: L.fog,
                    fontFamily: isRTL ? fontArabic : fontBody,
                    lineHeight: isRTL ? 1.5 : 1.35,
                  }}
                >
                  {desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
