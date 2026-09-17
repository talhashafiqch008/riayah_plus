import {
  ArrowRight,
  HeartHandshake,
  ShieldCheck,
  Activity,
  Stethoscope,
  Home,
  Users,
  Video,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, landingContainerClass } from './tokens';
import { LandingCard } from './LandingCard';
import { LandingButton } from './LandingButton';
import { SectionReveal, Stagger, StaggerItem } from './motion';

export function Features() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  const services = [
    {
      icon: HeartHandshake,
      title: t('services.items.disability.title', 'Disability Care'),
      description: t(
        'services.items.disability.description',
        'Specialized support programs empowering individuals of all abilities to achieve greater independence.'
      ),
      bg: L.iconTeal,
      color: L.sea,
      fill: 'left' as const,
    },
    {
      icon: ShieldCheck,
      title: t('services.items.aged.title', 'Aged Care'),
      description: t(
        'services.items.aged.description',
        'Comprehensive elder care ensuring comfort, mobility, and dignified living in familiar home environments.'
      ),
      bg: L.iconGreen,
      color: '#059669',
      fill: 'center' as const,
    },
    {
      icon: Activity,
      title: t('services.items.nursing.title', 'Nursing'),
      description: t(
        'services.items.nursing.description',
        'Clinical home nursing including medication management, wound care, vital monitoring, and post-op support.'
      ),
      bg: L.iconBlue,
      color: '#2563EB',
      fill: 'right' as const,
    },
    {
      icon: Stethoscope,
      title: t('services.items.alliedHealth.title', 'Allied Health'),
      description: t(
        'services.items.alliedHealth.description',
        'Physical therapy, occupational therapy, and speech pathology tailored to individualized recovery goals.'
      ),
      bg: L.iconPurple,
      color: '#7C3AED',
      fill: 'left' as const,
    },
    {
      icon: Home,
      title: t('services.items.dailyLiving.title', 'Daily Living & Community Support'),
      description: t(
        'services.items.dailyLiving.description',
        'Assistance with daily activities, personal care, mobility support, and social community engagement.'
      ),
      bg: L.iconTeal,
      color: L.sea,
      fill: 'center' as const,
    },
    {
      icon: Users,
      title: t('services.items.careCoordination.title', 'Care Coordination'),
      description: t(
        'services.items.careCoordination.description',
        'Your single clinical contact who organizes visits, synchronizes clinicians, and supports your family.'
      ),
      bg: L.iconGreen,
      color: '#059669',
      fill: 'right' as const,
    },
    {
      icon: Video,
      title: t('services.items.telehealth.title', 'Telehealth'),
      description: t(
        'services.items.telehealth.description',
        'Secure virtual consultations, quick doctor reviews, and video follow-ups with your care team.'
      ),
      bg: L.iconBlue,
      color: '#2563EB',
      fill: 'center' as const,
    },
  ];

  return (
    <section id="services" className="relative overflow-hidden py-20 sm:py-28" style={{ background: L.paper }}>
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
        style={{
          background: `radial-gradient(ellipse 50% 40% at 10% 20%, ${L.aqua} 0%, transparent 60%), radial-gradient(ellipse 40% 35% at 90% 10%, ${L.mint} 0%, transparent 55%)`,
        }}
      />
      <div className={landingContainerClass}>
        <div className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionReveal className="max-w-2xl">
            <p
              className={`mb-3 text-xs font-bold uppercase ${
                isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
              }`}
              style={{ color: L.sea, fontFamily: isRTL ? fontArabic : fontBody }}
            >
              {t('services.eyebrow', 'Our Services')}
            </p>
            <h2
              className="mb-3"
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                fontWeight: 800,
                fontSize: 'clamp(1.75rem, 3.4vw, 2.5rem)',
                lineHeight: isRTL ? 1.45 : 1.18,
                letterSpacing: isRTL ? 'normal' : '-0.03em',
              }}
            >
              <span className="block" style={{ color: L.ink }}>
                {t('services.titleLine1', 'Comprehensive Disability &')}
              </span>
              <span className="block" style={{ color: L.sea }}>
                {t('services.titleLine2', 'Aged Care Services')}
              </span>
            </h2>
            <p
              className="text-[1.02rem]"
              style={{
                color: L.fog,
                fontFamily: isRTL ? fontArabic : fontBody,
                lineHeight: isRTL ? 1.75 : 1.6,
              }}
            >
              {t(
                'services.subtitle',
                'Specialized clinical care, therapy, and compassionate support delivered in the comfort of your home and community.'
              )}
            </p>
          </SectionReveal>

          <LandingButton
            to="/register"
            variant="solid"
            fill="left"
            className="min-h-11 px-6 text-sm shrink-0"
          >
            {t('services.exploreAll', 'Explore All Services')}
            <ArrowRight className="h-4 w-4 rtl-flip" aria-hidden />
          </LandingButton>
        </div>

        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" stagger={0.05}>
          {services.map(({ icon: Icon, title, description, bg, color, fill }, index) => (
            <StaggerItem
              key={title}
              className={index === 0 ? 'sm:col-span-2 lg:col-span-2 xl:col-span-2' : ''}
            >
              <LandingCard
                tone="light"
                fill={fill}
                fillColor={L.sea}
                className="h-full"
                bodyClassName="!justify-start"
                style={{ padding: '1.4rem' }}
              >
                <div
                  className="lc-icon-wrap mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: bg, color }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3
                  className="lc-title mb-2 text-[1.05rem] font-bold"
                  style={{
                    fontFamily: isRTL ? fontArabic : fontHeading,
                    letterSpacing: isRTL ? 'normal' : '-0.015em',
                    lineHeight: isRTL ? 1.4 : 1.25,
                  }}
                >
                  {title}
                </h3>
                <p
                  className="lc-muted text-xs sm:text-[13.5px]"
                  style={{
                    fontFamily: isRTL ? fontArabic : fontBody,
                    lineHeight: isRTL ? 1.7 : 1.5,
                  }}
                >
                  {description}
                </p>
              </LandingCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
