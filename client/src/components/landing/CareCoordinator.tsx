import { ShieldCheck, PhoneCall, Users2, FileHeart, Sparkles, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic } from './tokens';
import { LandingButton } from './LandingButton';
import { LandingCard } from './LandingCard';
import { SectionReveal, Stagger, StaggerItem } from './motion';

export function CareCoordinator() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  const responsibilities = [
    {
      icon: PhoneCall,
      title: t('coordinator.responsibilities.0.title', 'Single Point of Contact'),
      desc: t(
        'coordinator.responsibilities.0.desc',
        'One phone number and message thread for questions, schedule changes, and updates.'
      ),
      color: '#0D9488',
      bg: '#F0FDFA',
      fill: 'left' as const,
    },
    {
      icon: Users2,
      title: t('coordinator.responsibilities.1.title', 'Team & Provider Assembly'),
      desc: t(
        'coordinator.responsibilities.1.desc',
        'Matches and schedules vetted nurses, therapists, and support workers tailored to your loved one.'
      ),
      color: '#2563EB',
      bg: '#EFF6FF',
      fill: 'top' as const,
    },
    {
      icon: FileHeart,
      title: t('coordinator.responsibilities.2.title', 'Care Plan Ownership'),
      desc: t(
        'coordinator.responsibilities.2.desc',
        'Monitors clinical progress notes, adjusts schedules, and organizes regular family reviews.'
      ),
      color: '#059669',
      bg: '#ECFDF5',
      fill: 'center' as const,
    },
    {
      icon: ShieldCheck,
      title: t('coordinator.responsibilities.3.title', 'Family Advocacy & Peace of Mind'),
      desc: t(
        'coordinator.responsibilities.3.desc',
        'Acts as your trusted partner, ensuring zero administrative friction or missed follow-ups.'
      ),
      color: '#7C3AED',
      bg: '#F5F3FF',
      fill: 'right' as const,
    },
  ];

  return (
    <section id="coordinator" className="py-20 sm:py-28" style={{ background: '#F8FAFC' }}>
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <SectionReveal className="mb-14 text-center">
          <p
            className={`mb-3 text-xs font-bold uppercase ${
              isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
            }`}
            style={{ color: L.lagoon, fontFamily: isRTL ? fontArabic : fontBody }}
          >
            {t('coordinator.eyebrow', 'The Riayah Difference')}
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
            {t('coordinator.title', 'One person connecting your care journey')}
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
              'coordinator.subtitle',
              "Families shouldn't have to navigate fragmented healthcare systems alone. Your dedicated Care Coordinator is with you every step of the way."
            )}
          </p>
        </SectionReveal>

        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Coordinator Profile & Quote Card */}
          <div className="lg:col-span-5">
            <div
              className="relative overflow-hidden rounded-3xl bg-white p-7"
              style={{
                boxShadow: '0 20px 45px -15px rgba(15,23,42,0.15)',
                border: '1px solid #E2E8F0',
              }}
            >
              <div className="aspect-[4/3] overflow-hidden rounded-2xl mb-6">
                <img
                  src="/landing/who-coordinator.jpg"
                  alt="Riayah Care Coordinator"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-[#0D9488]" />
                <span
                  className="text-xs font-bold uppercase tracking-wider text-[#0D9488]"
                  style={{ fontFamily: isRTL ? fontArabic : fontBody }}
                >
                  {t('coordinator.roleTitle', 'Your Dedicated Care Coordinator')}
                </span>
              </div>

              <p
                className="mb-5 text-sm italic"
                style={{
                  color: L.ink,
                  fontFamily: isRTL ? fontArabic : fontBody,
                  lineHeight: isRTL ? 1.8 : 1.65,
                }}
              >
                {t(
                  'coordinator.quote',
                  '“My job is to remove all the stress from healthcare logistics so families can simply focus on loving and supporting each other.”'
                )}
              </p>

              <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: L.lineSoft }}>
                <div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: L.ink, fontFamily: isRTL ? fontArabic : fontHeading }}
                  >
                    {t('coordinator.author', 'Maryam Al-Kuwari, Lead Care Coordinator')}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: L.fog, fontFamily: isRTL ? fontArabic : fontBody }}
                  >
                    {t('coordinator.roleSubtitle', 'Licensed clinical professional')}
                  </p>
                </div>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: '#F0FDFA', color: '#0D9488' }}
                >
                  <MessageCircle className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Core Responsibilities Grid */}
          <div className="lg:col-span-7">
            <Stagger className="grid gap-4 sm:grid-cols-2">
              {responsibilities.map(({ icon: Icon, title, desc, color, bg, fill }) => (
                <StaggerItem key={title} className="h-full">
                  <LandingCard
                    tone="light"
                    fill={fill}
                    fillColor={L.sea}
                    className="flex h-full flex-col justify-between p-5 shadow-sm"
                  >
                    <div>
                      <div
                        className="lc-icon-wrap mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                        style={{ background: bg, color }}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      <h3
                        className="lc-title mb-2 text-base font-bold"
                        style={{
                          fontFamily: isRTL ? fontArabic : fontHeading,
                          lineHeight: isRTL ? 1.4 : 1.25,
                        }}
                      >
                        {title}
                      </h3>
                      <p
                        className="lc-muted text-xs sm:text-[13px]"
                        style={{
                          fontFamily: isRTL ? fontArabic : fontBody,
                          lineHeight: isRTL ? 1.7 : 1.55,
                        }}
                      >
                        {desc}
                      </p>
                    </div>
                  </LandingCard>
                </StaggerItem>
              ))}
            </Stagger>

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <LandingButton
                to="/register"
                variant="solid"
                fill="left"
                className="min-h-12 px-7 text-sm"
              >
                {t('hero.bookConsultation', 'Book a Consultation')}
              </LandingButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
