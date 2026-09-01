import {
  Target,
  Stethoscope,
  CalendarDays,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Clock,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic } from './tokens';
import { SectionReveal, Stagger, StaggerItem } from './motion';

export function CarePlan() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  const pillars = [
    {
      icon: Target,
      title: t('carePlan.pillars.goals.title', 'Goals'),
      desc: t(
        'carePlan.pillars.goals.desc',
        'Clear, measurable wellness and independence targets defined with the family.'
      ),
      color: '#0D9488',
      bg: '#F0FDFA',
    },
    {
      icon: Stethoscope,
      title: t('carePlan.pillars.services.title', 'Services'),
      desc: t(
        'carePlan.pillars.services.desc',
        'Multi-disciplinary care matched to clinical, physical, and daily living needs.'
      ),
      color: '#2563EB',
      bg: '#EFF6FF',
    },
    {
      icon: CalendarDays,
      title: t('carePlan.pillars.appointments.title', 'Appointments'),
      desc: t(
        'carePlan.pillars.appointments.desc',
        'Synchronized calendar for home visits, clinical sessions, and telehealth.'
      ),
      color: '#059669',
      bg: '#ECFDF5',
    },
    {
      icon: TrendingUp,
      title: t('carePlan.pillars.progress.title', 'Progress'),
      desc: t(
        'carePlan.pillars.progress.desc',
        'Real-time session notes, outcome indicators, and milestone tracking.'
      ),
      color: '#7C3AED',
      bg: '#F5F3FF',
    },
    {
      icon: RefreshCw,
      title: t('carePlan.pillars.reviews.title', 'Reviews'),
      desc: t(
        'carePlan.pillars.reviews.desc',
        'Scheduled quarterly assessments ensuring care continually evolves with your needs.'
      ),
      color: '#EA580C',
      bg: '#FFF7ED',
    },
  ];

  return (
    <section id="care-plan" className="py-20 sm:py-28" style={{ background: L.paper }}>
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <SectionReveal className="mb-14 text-center">
          <p
            className={`mb-3 text-xs font-bold uppercase ${
              isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
            }`}
            style={{ color: L.lagoon, fontFamily: isRTL ? fontArabic : fontBody }}
          >
            {t('carePlan.eyebrow', 'The Riayah Care Plan')}
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
            {t(
              'carePlan.title',
              'More than appointments. A living, individualized care plan.'
            )}
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
              'carePlan.subtitle',
              "Riayah organizes your loved one's entire care ecosystem into a centralized, transparent plan that adapts as their needs evolve."
            )}
          </p>
        </SectionReveal>

        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left / Leading: 5 Care Plan Pillars */}
          <div className="lg:col-span-6">
            <Stagger className="flex flex-col gap-4">
              {pillars.map(({ icon: Icon, title, desc, color, bg }) => (
                <StaggerItem key={title}>
                  <div
                    className="flex items-start gap-4 rounded-2xl bg-white p-4 transition-all duration-200 hover:shadow-md"
                    style={{
                      border: `1px solid ${L.lineSoft}`,
                      boxShadow: '0 4px 16px -8px rgba(15,23,42,0.06)',
                    }}
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: bg, color }}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3
                        className="mb-1 text-base font-bold"
                        style={{
                          color: L.ink,
                          fontFamily: isRTL ? fontArabic : fontHeading,
                          lineHeight: isRTL ? 1.4 : 1.25,
                        }}
                      >
                        {title}
                      </h3>
                      <p
                        className="text-xs sm:text-[13px]"
                        style={{
                          color: L.fog,
                          fontFamily: isRTL ? fontArabic : fontBody,
                          lineHeight: isRTL ? 1.65 : 1.5,
                        }}
                      >
                        {desc}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>

          {/* Right / Trailing: Realistic Living Care Plan Preview Dashboard Card */}
          <div className="lg:col-span-6">
            <div
              className="relative rounded-3xl bg-white p-6 sm:p-8"
              style={{
                boxShadow: '0 24px 60px -20px rgba(15,23,42,0.18)',
                border: '1px solid rgba(13,148,136,0.15)',
              }}
            >
              {/* Header inside preview card */}
              <div className="flex items-start justify-between border-b pb-5" style={{ borderColor: L.lineSoft }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
                      style={{ background: '#ECFDF5', color: '#059669' }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('carePlan.previewCard.status', 'Active Plan')}
                    </span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: L.lagoon, fontFamily: isRTL ? fontArabic : fontBody }}
                    >
                      {t('carePlan.badge', 'Individualized Blueprint')}
                    </span>
                  </div>
                  <h4
                    className="mt-2 text-xl font-bold"
                    style={{ color: L.ink, fontFamily: isRTL ? fontArabic : fontHeading }}
                  >
                    {t('carePlan.previewCard.patientName', 'Fatima')}
                  </h4>
                  <p
                    className="mt-0.5 text-xs font-medium"
                    style={{ color: L.fog, fontFamily: isRTL ? fontArabic : fontBody }}
                  >
                    {t('carePlan.previewCard.planType', 'Comprehensive Disability & Wellness Plan')}
                  </p>
                </div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: L.sky, color: L.sea }}
                >
                  <Sparkles className="h-6 w-6" />
                </div>
              </div>

              {/* Goals Spotlight */}
              <div className="mt-5 rounded-2xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <p
                  className={`text-[11px] font-bold uppercase ${
                    isRTL ? 'tracking-normal' : 'tracking-wider'
                  }`}
                  style={{ color: L.lagoon, fontFamily: isRTL ? fontArabic : fontBody }}
                >
                  {isRTL ? 'الهدف التأهيلي الأساسي' : 'Primary Functional Goal'}
                </p>
                <p
                  className="mt-1 text-sm font-semibold"
                  style={{ color: L.ink, fontFamily: isRTL ? fontArabic : fontBody }}
                >
                  {t(
                    'carePlan.previewCard.primaryGoal',
                    'Maintain independent mobility & continuous speech therapy progress'
                  )}
                </p>
              </div>

              {/* Live Status Indicators */}
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#F0FDFA' }}>
                  <UserCheck className="h-5 w-5 shrink-0 text-[#0D9488]" />
                  <div className="min-w-0 flex-1 text-xs sm:text-sm">
                    <span className="font-semibold text-[#0B3B3E]">
                      {t('carePlan.previewCard.coordinatorLabel', 'Dedicated Coordinator:')}{' '}
                    </span>
                    <span className="text-[#0D9488] font-bold">
                      {t('carePlan.previewCard.coordinatorName', 'Sara Al-Harbi, RN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#F8FAFC' }}>
                  <Clock className="h-5 w-5 shrink-0 text-blue-600" />
                  <div className="min-w-0 flex-1 text-xs sm:text-sm font-medium" style={{ color: L.ink }}>
                    {t('carePlan.previewCard.nextVisit', 'Tomorrow at 10:00 AM • Home Physiotherapy')}
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#FAF5FF' }}>
                  <TrendingUp className="h-5 w-5 shrink-0 text-purple-600" />
                  <div className="min-w-0 flex-1 text-xs sm:text-sm font-semibold text-purple-900">
                    {t('carePlan.previewCard.recentProgress', 'Mobility score +18% over last 6 weeks')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
