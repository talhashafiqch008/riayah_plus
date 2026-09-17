import { Target, CalendarDays, TrendingUp, CheckCircle2, Clock, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, landingContainerClass } from './tokens';
import { SectionReveal, Stagger, StaggerItem } from './motion';

export function CarePlan() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  const pillars = [
    {
      icon: Target,
      title: t('carePlan.pillars.goals.title', 'Goals'),
      desc: t('carePlan.pillars.goals.descShort', 'Clear wellness targets set with the family.'),
    },
    {
      icon: CalendarDays,
      title: t('carePlan.pillars.appointments.title', 'Appointments'),
      desc: t('carePlan.pillars.appointments.descShort', 'Home visits, clinic sessions, and telehealth in one calendar.'),
    },
    {
      icon: TrendingUp,
      title: t('carePlan.pillars.progress.title', 'Progress'),
      desc: t('carePlan.pillars.progress.descShort', 'Notes, milestones, and outcomes you can actually follow.'),
    },
  ];

  return (
    <section
      id="care-plan"
      className="py-20 sm:py-28"
      style={{ background: L.paper }}
    >
      <div className={landingContainerClass}>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <SectionReveal className="text-start">
            <h2
              className="mb-3"
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                fontWeight: 800,
                fontSize: 'clamp(1.85rem, 3.5vw, 2.6rem)',
                letterSpacing: isRTL ? 'normal' : '-0.03em',
                lineHeight: isRTL ? 1.4 : 1.15,
                color: L.ink,
              }}
            >
              {t('carePlan.titleShort', 'A living care plan, not just appointments.')}
            </h2>
            <p
              className="mb-8 max-w-md text-[1.02rem]"
              style={{
                color: L.fog,
                fontFamily: isRTL ? fontArabic : fontBody,
                lineHeight: isRTL ? 1.75 : 1.65,
              }}
            >
              {t(
                'carePlan.subtitleShort',
                'Goals, visits, and progress stay in one place so families and clinicians stay aligned.',
              )}
            </p>

            <Stagger className="flex flex-col gap-3">
              {pillars.map(({ icon: Icon, title, desc }) => (
                <StaggerItem key={title}>
                  <div
                    className="flex items-start gap-3.5 rounded-2xl bg-white/90 px-4 py-3.5"
                    style={{ border: `1px solid ${L.lineSoft}`, boxShadow: L.shadowSoft }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: L.sky, color: L.sea }}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <h3
                        className="text-[0.95rem] font-bold"
                        style={{
                          color: L.ink,
                          fontFamily: isRTL ? fontArabic : fontHeading,
                        }}
                      >
                        {title}
                      </h3>
                      <p
                        className="mt-0.5 text-sm"
                        style={{
                          color: L.fog,
                          fontFamily: isRTL ? fontArabic : fontBody,
                          lineHeight: isRTL ? 1.6 : 1.5,
                        }}
                      >
                        {desc}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </SectionReveal>

          <SectionReveal>
            <div
              className="rounded-[1.75rem] bg-white p-6 sm:p-7"
              style={{ boxShadow: L.shadow, border: `1px solid ${L.lineSoft}` }}
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ background: L.sky, color: L.sea }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    {t('carePlan.previewCard.status', 'Active plan')}
                  </span>
                  <h3
                    className="mt-2.5 text-xl font-bold"
                    style={{ color: L.ink, fontFamily: isRTL ? fontArabic : fontHeading }}
                  >
                    {t('carePlan.previewCard.patientName', 'Fatima')}
                  </h3>
                  <p className="mt-0.5 text-sm" style={{ color: L.fog }}>
                    {t('carePlan.previewCard.planTypeShort', 'Disability & wellness plan')}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="rounded-xl px-3.5 py-3" style={{ background: L.mist }}>
                  <p className="text-[11px] font-semibold" style={{ color: L.sea }}>
                    {t('carePlan.previewCard.goalLabel', 'Primary goal')}
                  </p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: L.ink }}>
                    {t('carePlan.previewCard.primaryGoalShort', 'Maintain mobility & speech progress')}
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: L.sky }}>
                  <UserCheck className="h-4 w-4 shrink-0" style={{ color: L.sea }} aria-hidden />
                  <p className="text-sm" style={{ color: L.ink }}>
                    <span className="font-semibold">
                      {t('carePlan.previewCard.coordinatorLabel', 'Coordinator:')}{' '}
                    </span>
                    {t('carePlan.previewCard.coordinatorName', 'Sara Al-Harbi, RN')}
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: L.mist }}>
                  <Clock className="h-4 w-4 shrink-0" style={{ color: L.sea }} aria-hidden />
                  <p className="text-sm font-medium" style={{ color: L.ink }}>
                    {t('carePlan.previewCard.nextVisitShort', 'Tomorrow · 10:00 AM · Home physio')}
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: L.mist }}>
                  <TrendingUp className="h-4 w-4 shrink-0" style={{ color: L.sea }} aria-hidden />
                  <p className="text-sm font-semibold" style={{ color: L.ink }}>
                    {t('carePlan.previewCard.recentProgressShort', 'Mobility +18% in 6 weeks')}
                  </p>
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
      </div>
    </section>
  );
}
