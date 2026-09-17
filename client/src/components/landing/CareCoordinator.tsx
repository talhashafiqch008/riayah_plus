import { PhoneCall, Users2, FileHeart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, landingContainerClass } from './tokens';
import { LandingButton } from './LandingButton';
import { SectionReveal, Stagger, StaggerItem } from './motion';

export function CareCoordinator() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  const points = [
    {
      icon: PhoneCall,
      label: t('coordinator.simple.contact', 'One contact for questions and schedules'),
    },
    {
      icon: Users2,
      label: t('coordinator.simple.team', 'Builds and manages the care team'),
    },
    {
      icon: FileHeart,
      label: t('coordinator.simple.plan', 'Owns the care plan and follow-ups'),
    },
  ];

  return (
    <section id="coordinator" className="py-20 sm:py-28" style={{ background: L.paper }}>
      <div className={landingContainerClass}>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <SectionReveal className="order-2 lg:order-1">
            <div
              className="relative overflow-hidden rounded-[1.75rem]"
              style={{ boxShadow: L.shadow }}
            >
              <img
                src="/landing/who-coordinator.jpg"
                alt=""
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-5 pb-5 pt-16">
                <p
                  className="text-lg font-bold text-white"
                  style={{ fontFamily: isRTL ? fontArabic : fontHeading }}
                >
                  {t('coordinator.authorShort', 'Maryam Al-Kuwari')}
                </p>
                <p className="text-sm text-white/85">
                  {t('coordinator.roleSubtitleShort', 'Lead Care Coordinator')}
                </p>
              </div>
            </div>
          </SectionReveal>

          <SectionReveal className="order-1 lg:order-2">
            <h2
              className="mb-3"
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                fontWeight: 800,
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                letterSpacing: isRTL ? 'normal' : '-0.03em',
                lineHeight: isRTL ? 1.4 : 1.15,
                color: L.ink,
              }}
            >
              {t('coordinator.title', 'One person connecting your care journey')}
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
                'coordinator.simple.subtitle',
                'A dedicated Care Coordinator keeps your family and clinical team aligned.',
              )}
            </p>

            <Stagger className="mb-8 flex flex-col gap-4">
              {points.map(({ icon: Icon, label }) => (
                <StaggerItem key={label}>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: L.sky, color: L.sea }}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <p
                      className="text-[0.95rem] font-medium"
                      style={{
                        color: L.ink,
                        fontFamily: isRTL ? fontArabic : fontBody,
                      }}
                    >
                      {label}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>

            <LandingButton
              to="/register"
              variant="solid"
              fill="left"
              className="min-h-11 px-6 text-sm"
            >
              {t('coordinator.cta', 'Meet a Care Coordinator')}
            </LandingButton>
          </SectionReveal>
        </div>
      </div>
    </section>
  );
}
