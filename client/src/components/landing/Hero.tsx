import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Calendar, Phone, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, easeOut, landingContainerClass } from './tokens';
import { LandingButton } from './LandingButton';
import { SoftBackdrop } from './SoftBackdrop';

export function Hero() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="relative overflow-x-clip pt-20"
      style={{ background: L.paper }}
      aria-labelledby="hero-heading"
    >
      <SoftBackdrop intensity="soft" />

      {/* Soft line grid */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.32]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(to right, ${L.sea}22 1px, transparent 1px),
            linear-gradient(to bottom, ${L.sea}22 1px, transparent 1px)
          `,
          backgroundSize: '52px 52px',
          maskImage:
            'radial-gradient(ellipse 80% 75% at 72% 38%, black 8%, transparent 78%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 75% at 72% 38%, black 8%, transparent 78%)',
        }}
      />

      <div className={`${landingContainerClass} z-10`}>
        <div className="grid items-center gap-12 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20 xl:gap-20">
          {/* Left */}
          <div className="relative z-20 max-w-2xl text-start lg:max-w-none lg:pe-4">
            <motion.h1
              id="hero-heading"
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: easeOut }}
              className="mb-5 text-start"
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                fontWeight: 800,
                fontSize: 'clamp(2.55rem, 5vw, 3.85rem)',
                lineHeight: isRTL ? 1.32 : 1.05,
                letterSpacing: isRTL ? 'normal' : '-0.045em',
                color: L.ink,
              }}
            >
              {t('hero.title', 'Care that starts with simplicity and trust.')}
            </motion.h1>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.06, ease: easeOut }}
              className="mb-9 max-w-[34rem] text-[1.05rem]"
              style={{
                color: L.fog,
                fontFamily: isRTL ? fontArabic : fontBody,
                lineHeight: isRTL ? 1.75 : 1.65,
              }}
            >
              {t(
                'hero.subtitle',
                'Riayah Plus connects families, clinicians, and care coordinators in one calm space for plans, visits, messages, and follow-up care.',
              )}
            </motion.p>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.1, ease: easeOut }}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <LandingButton
                to="/register"
                variant="solid"
                fill="none"
                shape="pill"
                className="min-h-12 px-8 text-[15px]"
                style={{ background: L.ink, borderColor: L.ink, boxShadow: L.shadowSoft }}
              >
                {t('hero.bookConsultation', 'Get started')}
                <ArrowRight className="h-4 w-4 rtl-flip" aria-hidden />
              </LandingButton>
              <LandingButton
                href="#how-it-works"
                variant="soft"
                fill="none"
                shape="pill"
                className="min-h-12 px-8 text-[15px]"
              >
                {t('hero.howItWorks', 'How it works')}
              </LandingButton>
            </motion.div>
          </div>

          {/* Right collage — clearer spacing, nothing clipped */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.08, ease: easeOut }}
            className="relative mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none"
            aria-hidden
          >
            <div className="relative mx-auto aspect-[5/4] w-full min-h-[340px] sm:min-h-[390px] lg:min-h-[440px]">
              <div
                className="absolute inset-[6%] rounded-full blur-3xl"
                style={{
                  background: `radial-gradient(circle, ${L.aqua} 0%, ${L.mint} 45%, transparent 72%)`,
                  opacity: 0.8,
                }}
              />

              {/* Check-in */}
              <div
                className="absolute start-[2%] top-[2%] z-[2] w-[54%] rounded-2xl bg-white p-4 sm:p-5"
                style={{ boxShadow: L.shadow, border: `1px solid ${L.lineSoft}` }}
              >
                <p
                  className="mb-3 text-xs font-semibold sm:text-sm"
                  style={{ color: L.ink, fontFamily: isRTL ? fontArabic : fontBody }}
                >
                  {t('hero.ui.checkIn', 'How is care going today?')}
                </p>
                <div className="mb-2 flex justify-between text-[11px]" style={{ color: L.fog }}>
                  <span>{t('hero.ui.low', 'Hard')}</span>
                  <span>{t('hero.ui.high', 'Great')}</span>
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-2.5 flex-1 rounded-full"
                      style={{ background: i <= 3 ? L.sea : L.sky }}
                    />
                  ))}
                </div>
              </div>

              {/* Visits */}
              <div
                className="absolute end-[4%] top-[6%] z-[3] w-[36%] rounded-2xl bg-white p-4"
                style={{ boxShadow: L.shadow, border: `1px solid ${L.lineSoft}` }}
              >
                <p className="text-[11px]" style={{ color: L.fog }}>
                  {t('hero.ui.visits', 'Visits')}
                </p>
                <p
                  className="mt-1 text-2xl font-bold tabular-nums leading-none"
                  style={{ color: L.ink, fontFamily: fontHeading }}
                >
                  1,250
                </p>
                <p className="mt-1.5 text-[11px] font-medium" style={{ color: L.sea }}>
                  +5.8%
                </p>
              </div>

              {/* Featured teal card */}
              <div
                className="absolute start-[8%] top-[34%] z-[3] w-[52%] rounded-[1.4rem] p-5 text-white"
                style={{
                  background: `linear-gradient(145deg, ${L.lagoon}, ${L.sea})`,
                  boxShadow: L.shadow,
                }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <Video className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold">
                    {t('hero.ui.live', 'Telehealth')}
                  </span>
                </div>
                <p
                  className="text-[0.95rem] font-semibold leading-snug"
                  style={{ fontFamily: isRTL ? fontArabic : fontHeading }}
                >
                  {t('hero.ui.sessionTitle', 'Follow-up consultation')}
                </p>
                <p className="mt-1.5 text-xs text-white/85">
                  {t('hero.ui.sessionMeta', 'Tomorrow · 10:00 AM')}
                </p>
              </div>

              {/* Messages — clear of teal card */}
              <div
                className="absolute end-[3%] top-[42%] z-[4] w-[34%] rounded-2xl bg-white p-4"
                style={{ boxShadow: L.shadow, border: `1px solid ${L.lineSoft}` }}
              >
                <p className="text-[11px]" style={{ color: L.fog }}>
                  {t('hero.ui.messagesLabel', 'Messages')}
                </p>
                <p
                  className="mt-1 text-2xl font-bold tabular-nums leading-none"
                  style={{ color: L.ink, fontFamily: fontHeading }}
                >
                  420
                </p>
                <p className="mt-1.5 text-[11px] font-medium" style={{ color: L.sea }}>
                  +12%
                </p>
              </div>

              {/* Phone icon */}
              <div
                className="absolute start-[2%] top-[62%] z-[5] flex h-11 w-11 items-center justify-center rounded-full bg-white"
                style={{ boxShadow: L.shadowSoft, color: L.sea }}
              >
                <Phone className="h-4 w-4" />
              </div>

              {/* Calendar icon */}
              <div
                className="absolute end-[40%] top-[58%] z-[5] flex h-11 w-11 items-center justify-center rounded-full bg-white"
                style={{ boxShadow: L.shadowSoft, color: L.sea }}
              >
                <Calendar className="h-5 w-5" />
              </div>

              {/* Progress chart */}
              <div
                className="absolute bottom-[2%] start-[12%] z-[2] w-[54%] rounded-2xl bg-white p-4 sm:p-5"
                style={{ boxShadow: L.shadow, border: `1px solid ${L.lineSoft}` }}
              >
                <p
                  className="mb-2 text-xs font-semibold"
                  style={{ color: L.ink, fontFamily: isRTL ? fontArabic : fontBody }}
                >
                  {t('hero.ui.milestones', 'Care progress')}
                </p>
                <svg viewBox="0 0 180 52" className="h-14 w-full">
                  <path
                    d="M0 38 C28 38 32 16 54 18 C76 20 80 36 108 24 C136 12 148 8 180 6"
                    fill="none"
                    stroke={L.sea}
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0 42 C32 40 40 28 64 30 C88 32 100 20 128 26 C156 32 168 16 180 18"
                    fill="none"
                    stroke={L.tide}
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    opacity="0.75"
                  />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
