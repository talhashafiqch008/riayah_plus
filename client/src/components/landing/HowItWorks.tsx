import { useState } from 'react';
import { Bell, Building2, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, landingContainerClass } from './tokens';
import { SectionReveal } from './motion';

type Audience = 'clinics' | 'patients';

export function HowItWorks() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();
  const [audience, setAudience] = useState<Audience>('clinics');

  const clinicSteps = [
    {
      step: '01',
      title: t('howItWorks.clinics.01.title', 'Set up your care workflow'),
      body: t(
        'howItWorks.clinics.01.body',
        'Onboard your organization, define roles, and create care units so every clinician and coordinator works from one shared system.',
      ),
      mock: 'setup' as const,
    },
    {
      step: '02',
      title: t('howItWorks.clinics.02.title', 'Manage bookings & care plans'),
      body: t(
        'howItWorks.clinics.02.body',
        'Coordinate visits, telehealth, and multidisciplinary plans with clear ownership. No scattered spreadsheets or missed follow-ups.',
      ),
      mock: 'bookings' as const,
    },
    {
      step: '03',
      title: t('howItWorks.clinics.03.title', 'Stay connected with families'),
      body: t(
        'howItWorks.clinics.03.body',
        'Send updates, notes, and reminders in one secure thread so clinical teams and families stay aligned in real time.',
      ),
      mock: 'alerts' as const,
    },
  ];

  const patientSteps = [
    {
      step: '01',
      title: t('howItWorks.patients.01.title', 'Tell us about your needs'),
      body: t(
        'howItWorks.patients.01.body',
        "Share your family's care requirements, daily routines, goals, and preferences through a guided consultation.",
      ),
      mock: 'setup' as const,
    },
    {
      step: '02',
      title: t('howItWorks.patients.02.title', 'Meet your Care Coordinator'),
      body: t(
        'howItWorks.patients.02.body',
        'You are paired with a dedicated Care Coordinator who acts as your single point of contact and builds your clinical team.',
      ),
      mock: 'bookings' as const,
    },
    {
      step: '03',
      title: t('howItWorks.patients.03.title', 'Start care and track progress'),
      body: t(
        'howItWorks.patients.03.body',
        'Visits begin smoothly. Review notes, message your team, and follow health milestones in one calm family app.',
      ),
      mock: 'alerts' as const,
    },
  ];

  const steps = audience === 'clinics' ? clinicSteps : patientSteps;

  /** Stagger offsets like the reference */
  const offsets = ['lg:ms-0 lg:me-[16%]', 'lg:ms-[16%] lg:me-0', 'lg:ms-[8%] lg:me-[8%]'];

  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden pb-20 pt-24 sm:pb-28 sm:pt-28"
      style={{
        background: `linear-gradient(180deg, ${L.paper} 0%, ${L.paper} 32%, ${L.ice} 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%]"
        aria-hidden
        style={{
          background: `radial-gradient(ellipse 70% 80% at 50% 100%, ${L.aqua}50 0%, transparent 70%), radial-gradient(ellipse 40% 50% at 10% 85%, ${L.mint}55 0%, transparent 60%)`,
        }}
      />
      <div className={`${landingContainerClass} z-10`}>
        <SectionReveal className="mb-12 flex flex-col gap-6 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl text-start">
            <h2
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                fontWeight: 800,
                fontSize: 'clamp(1.9rem, 3.6vw, 2.75rem)',
                letterSpacing: isRTL ? 'normal' : '-0.03em',
                lineHeight: isRTL ? 1.35 : 1.12,
                color: L.ink,
              }}
            >
              {t('howItWorks.title', 'How it works')}
            </h2>
            <p
              className="mt-3 text-[1.02rem]"
              style={{
                color: L.fog,
                fontFamily: isRTL ? fontArabic : fontBody,
                lineHeight: isRTL ? 1.75 : 1.6,
              }}
            >
              {t(
                'howItWorks.subtitle',
                'One platform for clinics and families: clearer workflows, fewer handoffs, better care.',
              )}
            </p>
          </div>

          <div
            className="inline-flex rounded-full p-1.5"
            style={{ background: L.mist, border: `1px solid ${L.lineSoft}` }}
            role="tablist"
            aria-label={t('howItWorks.audienceLabel', 'Audience')}
          >
            {(
              [
                ['clinics', t('howItWorks.tabs.clinics', 'For clinics')],
                ['patients', t('howItWorks.tabs.patients', 'For patients')],
              ] as const
            ).map(([key, label]) => {
              const active = audience === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setAudience(key)}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold transition-colors"
                  style={{
                    background: active ? L.sea : 'transparent',
                    color: active ? '#fff' : L.fog,
                    fontFamily: isRTL ? fontArabic : fontBody,
                    boxShadow: active ? L.shadowSoft : 'none',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </SectionReveal>

        <div className="space-y-8 sm:space-y-10 lg:space-y-12">
          {steps.map(({ step, title, body, mock }, index) => {
            const accent = index === 1;
            return (
              <SectionReveal key={`${audience}-${step}`}>
                <div className={`relative ${offsets[index]}`}>
                  <div
                    className="relative overflow-hidden rounded-[1.75rem] bg-white px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9"
                    style={{
                      border: `1px solid ${L.lineSoft}`,
                      boxShadow: L.shadowSoft,
                    }}
                  >
                    <div className="relative z-[1] grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10">
                      <div className="flex gap-3 sm:gap-5" style={{ textAlign: 'start' }}>
                        <StepNumber value={step} accent={accent} />
                        <div className="min-w-0 pt-2 sm:pt-3">
                          <h3
                            className="mb-2 text-xl font-bold sm:text-2xl"
                            style={{
                              color: L.ink,
                              fontFamily: isRTL ? fontArabic : fontHeading,
                              letterSpacing: isRTL ? 'normal' : '-0.025em',
                              lineHeight: isRTL ? 1.35 : 1.2,
                            }}
                          >
                            {title}
                          </h3>
                          <p
                            className="max-w-md text-sm sm:text-[0.98rem]"
                            style={{
                              color: L.fog,
                              fontFamily: isRTL ? fontArabic : fontBody,
                              lineHeight: isRTL ? 1.7 : 1.65,
                            }}
                          >
                            {body}
                          </p>
                        </div>
                      </div>

                      <div className="lg:justify-self-end lg:w-full lg:max-w-sm">
                        <StepMock kind={mock} audience={audience} isRTL={isRTL} accent={accent} />
                      </div>
                    </div>
                  </div>
                </div>
              </SectionReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StepNumber({ value, accent }: { value: string; accent?: boolean }) {
  return (
    <span
      className="shrink-0 select-none text-[4.5rem] font-light leading-[0.85] tabular-nums sm:text-[6rem] lg:text-[7.25rem]"
      aria-hidden
      style={{
        fontFamily: fontHeading,
        letterSpacing: '-0.06em',
        background: accent
          ? `linear-gradient(180deg, ${L.sea} 0%, ${L.aqua} 50%, transparent 100%)`
          : `linear-gradient(180deg, rgba(15,23,42,0.32) 0%, rgba(15,23,42,0.1) 50%, transparent 100%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      {value}
    </span>
  );
}

function StepMock({
  kind,
  audience,
  isRTL,
  accent,
}: {
  kind: 'setup' | 'bookings' | 'alerts';
  audience: Audience;
  isRTL: boolean;
  accent?: boolean;
}) {
  const { t } = useTranslation('landing');

  if (kind === 'setup') {
    return (
      <div
        className="rounded-2xl bg-white p-5"
        style={{ border: `1px solid ${L.lineSoft}`, boxShadow: L.shadow }}
      >
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4" style={{ color: L.sea }} aria-hidden />
          <p
            className="text-sm font-semibold"
            style={{ color: L.ink, fontFamily: isRTL ? fontArabic : fontBody }}
          >
            {audience === 'clinics'
              ? t('howItWorks.mocks.createOrg', 'Create your organization')
              : t('howItWorks.mocks.createAccount', 'Create your account')}
          </p>
        </div>
        <div className="space-y-2.5">
          <div className="h-9 rounded-xl" style={{ background: L.mist }} />
          <div className="h-9 rounded-xl" style={{ background: L.mist }} />
          <div
            className="flex h-10 items-center justify-center rounded-xl text-sm font-semibold text-white"
            style={{ background: L.ink }}
          >
            {t('howItWorks.mocks.continue', 'Continue')}
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'bookings') {
    return (
      <div
        className="rounded-2xl p-1.5"
        style={{
          background: `linear-gradient(145deg, ${L.lagoon}, ${L.sea})`,
          boxShadow: L.shadow,
          transform: accent ? 'translateY(-4px)' : undefined,
        }}
      >
        <div className="rounded-xl bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: L.ink }}>
              {audience === 'clinics'
                ? t('howItWorks.mocks.schedule', 'Today’s schedule')
                : t('howItWorks.mocks.yourVisit', 'Your next visit')}
            </span>
            <CalendarDays className="h-4 w-4" style={{ color: L.sea }} aria-hidden />
          </div>
          <div className="space-y-2">
            {(audience === 'clinics'
              ? [
                  ['09:00', t('howItWorks.mocks.homeVisit', 'Home visit')],
                  ['11:30', t('howItWorks.mocks.telehealth', 'Telehealth')],
                  ['15:00', t('howItWorks.mocks.careReview', 'Care review')],
                ]
              : [
                  ['09:00', t('howItWorks.mocks.physio', 'Physiotherapy')],
                  ['11:30', t('howItWorks.mocks.nursing', 'Nursing visit')],
                  ['15:00', t('howItWorks.mocks.coordinatorCall', 'Coordinator call')],
                ]
            ).map(([time, label]) => (
              <div
                key={time}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                style={{ background: L.mist, color: L.ink }}
              >
                <span className="font-semibold">{time}</span>
                <span style={{ color: L.fog }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{ border: `1px solid ${L.lineSoft}`, boxShadow: L.shadow }}
    >
      <div className="mb-3 flex items-center gap-2">
        <Bell className="h-4 w-4" style={{ color: L.sea }} aria-hidden />
        <p className="text-sm font-semibold" style={{ color: L.ink }}>
          {t('howItWorks.mocks.notifications', 'Notifications')}
        </p>
      </div>
      <div className="space-y-2.5">
        {[
          t('howItWorks.mocks.n1', 'Care plan updated'),
          t('howItWorks.mocks.n2', 'Visit confirmed for tomorrow'),
          t('howItWorks.mocks.n3', 'New message from coordinator'),
        ].map((label) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ background: L.mist }}
          >
            <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: L.sea }} />
            <span className="text-xs font-medium" style={{ color: L.ink }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
