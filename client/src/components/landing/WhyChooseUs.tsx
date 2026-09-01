import {
  CalendarCheck,
  MessageSquare,
  CalendarDays,
  FileCheck,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic } from './tokens';
import { SectionReveal, Stagger, StaggerItem } from './motion';

export function FamilyExperience() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  const features = [
    {
      step: '01',
      icon: CalendarCheck,
      title: t('familyExperience.features.0.title', 'Book'),
      desc: t(
        'familyExperience.features.0.desc',
        'Request new home visits or telehealth consultations in seconds with your preferred times.'
      ),
      bg: L.iconTeal,
      color: L.sea,
    },
    {
      step: '02',
      icon: MessageSquare,
      title: t('familyExperience.features.1.title', 'Communicate'),
      desc: t(
        'familyExperience.features.1.desc',
        'Message your Care Coordinator and clinical team directly in one encrypted thread.'
      ),
      bg: L.iconBlue,
      color: '#2563EB',
    },
    {
      step: '03',
      icon: CalendarDays,
      title: t('familyExperience.features.2.title', 'View Appointments'),
      desc: t(
        'familyExperience.features.2.desc',
        'Access a clear, shared calendar of upcoming nursing, physio, and support visits.'
      ),
      bg: L.iconGreen,
      color: '#059669',
    },
    {
      step: '04',
      icon: FileCheck,
      title: t('familyExperience.features.3.title', 'Review Care Plan'),
      desc: t(
        'familyExperience.features.3.desc',
        'View live therapeutic goals, clinician notes, and current treatment milestones.'
      ),
      bg: L.iconPurple,
      color: '#7C3AED',
    },
    {
      step: '05',
      icon: TrendingUp,
      title: t('familyExperience.features.4.title', 'Track Progress'),
      desc: t(
        'familyExperience.features.4.desc',
        'Celebrate functional improvements and health milestones documented after each session.'
      ),
      bg: L.iconTeal,
      color: L.sea,
    },
  ];

  return (
    <section id="family-experience" className="py-20 sm:py-28" style={{ background: L.mist }}>
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Leading copy & 5 Pillars */}
          <div className="flex flex-col justify-between lg:col-span-7">
            <SectionReveal>
              <p
                className={`mb-3 text-xs font-bold uppercase ${
                  isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
                }`}
                style={{ color: L.sea, fontFamily: isRTL ? fontArabic : fontBody }}
              >
                {t('familyExperience.eyebrow', 'Family Experience')}
              </p>
              <h2
                className="mb-4"
                style={{
                  fontFamily: isRTL ? fontArabic : fontHeading,
                  fontWeight: 800,
                  fontSize: 'clamp(1.75rem, 3.2vw, 2.45rem)',
                  lineHeight: isRTL ? 1.45 : 1.18,
                  letterSpacing: isRTL ? 'normal' : '-0.03em',
                  color: L.ink,
                }}
              >
                {t('familyExperience.title', 'Total clarity in the palm of your hand')}
              </h2>
              <p
                className="mb-8 max-w-xl text-[1.02rem]"
                style={{
                  color: L.fog,
                  fontFamily: isRTL ? fontArabic : fontBody,
                  lineHeight: isRTL ? 1.75 : 1.65,
                }}
              >
                {t(
                  'familyExperience.subtitle',
                  "Designed specifically for families to stay informed, engaged, and in control of their loved one's care."
                )}
              </p>
            </SectionReveal>

            <Stagger className="flex flex-col gap-3.5">
              {features.map(({ step, icon: Icon, title, desc, bg, color }) => (
                <StaggerItem key={title}>
                  <div
                    className="flex items-start gap-3.5 rounded-2xl bg-white p-4 transition-all duration-200 hover:shadow-sm"
                    style={{ border: `1px solid ${L.lineSoft}` }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: bg, color }}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold tabular-nums"
                          style={{ color: L.lagoon, fontFamily: fontHeading }}
                        >
                          {step}
                        </span>
                        <h3
                          className="text-sm font-bold"
                          style={{
                            color: L.ink,
                            fontFamily: isRTL ? fontArabic : fontHeading,
                            lineHeight: isRTL ? 1.4 : 1.25,
                          }}
                        >
                          {title}
                        </h3>
                      </div>
                      <p
                        className="mt-1 text-xs sm:text-[13px]"
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

          {/* Trailing: Family Photo covering height + Overlapping Trust Strip Card */}
          <div className="flex flex-col lg:col-span-5">
            <SectionReveal delay={0.08} className="relative flex h-full w-full flex-col pb-5 sm:pb-6">
              {/* Full height image container */}
              <div className="relative min-h-[340px] flex-1 overflow-hidden rounded-3xl lg:min-h-[500px]">
                <img
                  src="/landing/family-care-experience.jpg"
                  alt="Arab family with elderly mother receiving compassionate care support"
                  className="h-full w-full object-cover object-center lg:absolute lg:inset-0"
                />
              </div>

              {/* Overlapping trust card hanging across the bottom edge of the photo */}
              <div
                className="absolute inset-x-3 bottom-0 z-10 rounded-2xl bg-white p-4 shadow-xl sm:inset-x-5 sm:p-5"
                style={{
                  boxShadow: '0 20px 45px -12px rgba(15,23,42,0.22)',
                  border: '1px solid rgba(13,148,136,0.18)',
                }}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: L.sky, color: L.sea }}
                  >
                    <Shield className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-bold"
                      style={{
                        color: L.ink,
                        fontFamily: isRTL ? fontArabic : fontHeading,
                        lineHeight: isRTL ? 1.4 : 1.25,
                      }}
                    >
                      {isRTL ? 'رعاية تثق بها عائلتك' : 'Care Your Family Can Rely On'}
                    </p>
                    <p
                      className="mt-0.5 text-xs"
                      style={{
                        color: L.fog,
                        fontFamily: isRTL ? fontArabic : fontBody,
                        lineHeight: isRTL ? 1.6 : 1.4,
                      }}
                    >
                      {isRTL
                        ? 'مقدمو رعاية معتمدون ومرخصون لضمان أمان وراحة أحبائكم.'
                        : 'Vetted, licensed clinicians dedicated to your loved ones.'}
                    </p>
                  </div>
                </div>
              </div>
            </SectionReveal>
          </div>
        </div>
      </div>
    </section>
  );
}

// Backwards compatibility export
export const WhyChooseUs = FamilyExperience;
