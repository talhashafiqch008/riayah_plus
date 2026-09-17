import {
  CalendarCheck,
  MessageSquare,
  CalendarDays,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, landingContainerClass } from './tokens';
import { SectionReveal, Stagger, StaggerItem } from './motion';

export function FamilyExperience() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  const features = [
    {
      icon: CalendarCheck,
      title: t('familyExperience.features.0.title', 'Book'),
      desc: t('familyExperience.features.0.descShort', 'Request home visits or telehealth in seconds.'),
    },
    {
      icon: MessageSquare,
      title: t('familyExperience.features.1.title', 'Communicate'),
      desc: t('familyExperience.features.1.descShort', 'Message your coordinator and care team in one thread.'),
    },
    {
      icon: CalendarDays,
      title: t('familyExperience.features.2.title', 'Appointments'),
      desc: t('familyExperience.features.2.descShort', 'See upcoming nursing, physio, and support visits.'),
    },
    {
      icon: FileCheck,
      title: t('familyExperience.features.3.title', 'Care plan'),
      desc: t('familyExperience.features.3.descShort', 'View goals, notes, and treatment milestones.'),
    },
    {
      icon: TrendingUp,
      title: t('familyExperience.features.4.title', 'Progress'),
      desc: t('familyExperience.features.4.descShort', 'Follow improvements documented after each session.'),
    },
  ];

  return (
    <section
      id="family-experience"
      className="relative overflow-hidden py-20 sm:py-28"
      style={{
        background: `linear-gradient(180deg, ${L.ice} 0%, ${L.paper} 35%, ${L.ice} 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 55% 45% at 15% 0%, ${L.aqua}66 0%, transparent 60%),
            radial-gradient(ellipse 45% 40% at 90% 5%, ${L.mint}88 0%, transparent 55%),
            radial-gradient(ellipse 70% 55% at 50% 100%, ${L.aqua}55 0%, transparent 70%)
          `,
        }}
      />

      <div className={`${landingContainerClass} z-10`}>
        <SectionReveal className="mx-auto mb-12 max-w-2xl text-center">
          <h2
            className="mb-3"
            style={{
              fontFamily: isRTL ? fontArabic : fontHeading,
              fontWeight: 800,
              fontSize: 'clamp(1.75rem, 3.2vw, 2.45rem)',
              lineHeight: isRTL ? 1.4 : 1.15,
              letterSpacing: isRTL ? 'normal' : '-0.03em',
              color: L.ink,
            }}
          >
            {t('familyExperience.titleShort', 'Clarity for your family, in one place.')}
          </h2>
          <p
            className="text-[1.02rem]"
            style={{
              color: L.fog,
              fontFamily: isRTL ? fontArabic : fontBody,
              lineHeight: isRTL ? 1.75 : 1.65,
            }}
          >
            {t(
              'familyExperience.subtitleShort',
              'Book, message, and follow care progress without chasing updates.',
            )}
          </p>
        </SectionReveal>

        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }, index) => (
            <StaggerItem
              key={title}
              className={index === features.length - 1 ? 'sm:col-span-2 lg:col-span-1' : ''}
            >
              <div
                className="h-full rounded-2xl bg-white px-5 py-5"
                style={{ border: `1px solid ${L.lineSoft}`, boxShadow: L.shadowSoft }}
              >
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: L.sky, color: L.sea }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3
                  className="mb-1 text-[0.98rem] font-bold"
                  style={{
                    color: L.ink,
                    fontFamily: isRTL ? fontArabic : fontHeading,
                  }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm"
                  style={{
                    color: L.fog,
                    fontFamily: isRTL ? fontArabic : fontBody,
                    lineHeight: isRTL ? 1.65 : 1.5,
                  }}
                >
                  {desc}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export const WhyChooseUs = FamilyExperience;
