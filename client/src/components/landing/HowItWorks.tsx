import { ClipboardList, Users, FileCheck2, TrendingUp, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic } from './tokens';
import { LandingCard } from './LandingCard';
import { SectionReveal, Stagger, StaggerItem } from './motion';

export function HowItWorks() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  const steps = [
    {
      step: '01',
      icon: ClipboardList,
      title: t('howItWorks.steps.01.title', 'Tell us about your needs'),
      body: t(
        'howItWorks.steps.01.body',
        "Share your family's care requirements, daily routines, goals, and preferences through a guided consultation."
      ),
      fill: 'left' as const,
    },
    {
      step: '02',
      icon: Users,
      title: t('howItWorks.steps.02.title', 'Meet your Care Coordinator'),
      body: t(
        'howItWorks.steps.02.body',
        'You are paired with a dedicated Care Coordinator who acts as your single point of contact and builds your clinical team.'
      ),
      fill: 'center' as const,
    },
    {
      step: '03',
      icon: FileCheck2,
      title: t('howItWorks.steps.03.title', 'Build your care plan'),
      body: t(
        'howItWorks.steps.03.body',
        'Together, we craft an individualized care plan encompassing clinical goals, therapy schedules, and daily support.'
      ),
      fill: 'center' as const,
    },
    {
      step: '04',
      icon: TrendingUp,
      title: t('howItWorks.steps.04.title', 'Start care and track progress'),
      body: t(
        'howItWorks.steps.04.body',
        'Visits begin smoothly. Review notes, communicate with your team, and track health milestones in real time.'
      ),
      fill: 'right' as const,
    },
  ];

  return (
    <section id="how-it-works" className="pb-20 pt-28 sm:pb-28 sm:pt-32" style={{ background: L.paper }}>
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <SectionReveal className="mb-14 text-center">
          <p
            className={`mb-3 text-xs font-bold uppercase ${
              isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
            }`}
            style={{ color: L.lagoon, fontFamily: isRTL ? fontArabic : fontBody }}
          >
            {t('howItWorks.eyebrow', 'How Riayah Works')}
          </p>
          <h2
            className="mb-3"
            style={{
              fontFamily: isRTL ? fontArabic : fontHeading,
              fontWeight: 800,
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              letterSpacing: isRTL ? 'normal' : '-0.03em',
              lineHeight: isRTL ? 1.45 : 1.2,
              color: L.ink,
            }}
          >
            {t('howItWorks.title', "Your family's care journey in 4 clear steps")}
          </h2>
          <p
            className="mx-auto max-w-2xl text-[1.02rem]"
            style={{
              color: L.fog,
              fontFamily: isRTL ? fontArabic : fontBody,
              lineHeight: isRTL ? 1.75 : 1.6,
            }}
          >
            {t(
              'howItWorks.subtitle',
              'No juggling providers or repeating your medical history. We build and coordinate everything around you.'
            )}
          </p>
        </SectionReveal>

        <Stagger className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {steps.map(({ step, icon: Icon, title, body, fill }, i) => (
            <StaggerItem key={step} className="relative flex">
              {i < steps.length - 1 && (
                <div
                  className="pointer-events-none absolute end-[-1.1rem] top-1/2 z-10 hidden w-4 -translate-y-1/2 items-center lg:flex"
                  aria-hidden
                >
                  <ChevronRight
                    className="h-4 w-4 shrink-0 rtl-flip opacity-40"
                    style={{ color: L.lagoon }}
                    strokeWidth={2.5}
                  />
                </div>
              )}

              <LandingCard
                tone="light"
                fill={fill}
                fillColor={L.sea}
                className="flex h-full w-full"
                bodyClassName="!justify-start"
                style={{ padding: '1.25rem' }}
              >
                <div className="flex w-full flex-col items-start">
                  <div className="mb-4 flex w-full items-center justify-between">
                    <div
                      className="lc-icon-wrap flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: L.sky, color: L.sea }}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <span
                      className="lc-accent text-xs font-bold tabular-nums"
                      style={{
                        fontFamily: fontHeading,
                        color: L.lagoon,
                        letterSpacing: isRTL ? 'normal' : '-0.02em',
                      }}
                    >
                      {step}
                    </span>
                  </div>

                  <h3
                    className="lc-title mb-2"
                    style={{
                      fontFamily: isRTL ? fontArabic : fontHeading,
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      letterSpacing: isRTL ? 'normal' : '-0.02em',
                      lineHeight: isRTL ? 1.4 : 1.3,
                    }}
                  >
                    {title}
                  </h3>
                  <p
                    className="lc-muted text-xs sm:text-[13px]"
                    style={{
                      fontFamily: isRTL ? fontArabic : fontBody,
                      lineHeight: isRTL ? 1.65 : 1.5,
                    }}
                  >
                    {body}
                  </p>
                </div>
              </LandingCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
