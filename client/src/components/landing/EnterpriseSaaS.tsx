import { Building2, Lock, Layers, UsersRound, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, landingContainerClass } from './tokens';
import { LandingButton } from './LandingButton';
import { SectionReveal, Stagger, StaggerItem } from './motion';

export function EnterpriseSaaS() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  const pillars = [
    {
      icon: Building2,
      title: t('enterprise.pillars.orgs.title', 'Multi-organization ready'),
      desc: t(
        'enterprise.pillars.orgs.descShort',
        'Run clinics and care networks from one SaaS with tenant isolation built in.',
      ),
    },
    {
      icon: UsersRound,
      title: t('enterprise.pillars.roles.title', 'Role-based access'),
      desc: t(
        'enterprise.pillars.roles.descShort',
        'Family, clinical, coordinator, billing, and admin, each with the right permissions.',
      ),
    },
    {
      icon: Layers,
      title: t('enterprise.pillars.workflows.title', 'End-to-end care workflows'),
      desc: t(
        'enterprise.pillars.workflows.descShort',
        'Plans, scheduling, telehealth, messaging, and billing in one connected system.',
      ),
    },
    {
      icon: Lock,
      title: t('enterprise.pillars.security.title', 'Security & compliance minded'),
      desc: t(
        'enterprise.pillars.security.descShort',
        'PHI-aware storage, audit trails, and retention controls for regulated care.',
      ),
    },
  ];

  return (
    <section
      id="enterprise"
      className="relative overflow-hidden py-20 sm:py-28"
      style={{
        background: `linear-gradient(180deg, ${L.paper} 0%, ${L.paper} 42%, ${L.ice} 100%)`,
      }}
    >
      {/* Soft teal bloom — lower half only so the top stays white */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%]"
        aria-hidden
        style={{
          background: `radial-gradient(ellipse 70% 80% at 50% 100%, ${L.aqua}55 0%, transparent 70%)`,
        }}
      />

      <div className={landingContainerClass}>
        <div className="mb-12 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <SectionReveal>
            <p
              className={`mb-3 text-xs font-bold uppercase ${
                isRTL ? 'tracking-normal' : 'tracking-[0.18em]'
              }`}
              style={{ color: L.sea, fontFamily: isRTL ? fontArabic : fontBody }}
            >
              {t('enterprise.eyebrow', 'Enterprise SaaS')}
            </p>
            <h2
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                fontWeight: 800,
                fontSize: 'clamp(1.85rem, 3.5vw, 2.55rem)',
                letterSpacing: isRTL ? 'normal' : '-0.03em',
                lineHeight: isRTL ? 1.4 : 1.15,
                color: L.ink,
              }}
            >
              {t(
                'enterprise.titleShort',
                'Enterprise care software, not a brochure site.',
              )}
            </h2>
          </SectionReveal>
          <SectionReveal>
            <p
              className="text-[1.02rem]"
              style={{
                color: L.fog,
                fontFamily: isRTL ? fontArabic : fontBody,
                lineHeight: isRTL ? 1.75 : 1.65,
              }}
            >
              {t(
                'enterprise.subtitleShort',
                'Scale across clinics and care teams with real operational workflows, from intake to outcomes.',
              )}
            </p>
            <LandingButton
              to="/register"
              variant="solid"
              fill="none"
              className="mt-5 min-h-11 px-6 text-sm"
              style={{ background: L.ink, borderColor: L.ink }}
            >
              {t('enterprise.cta', 'Talk to us about enterprise')}
              <ArrowRight className="h-4 w-4 rtl-flip" aria-hidden />
            </LandingButton>
          </SectionReveal>
        </div>

        <Stagger className="grid gap-4 sm:grid-cols-2">
          {pillars.map(({ icon: Icon, title, desc }) => (
            <StaggerItem key={title}>
              <div
                className="h-full rounded-[1.5rem] bg-white p-6"
                style={{ border: `1px solid ${L.lineSoft}`, boxShadow: L.shadowSoft }}
              >
                <div
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: L.sky, color: L.sea }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3
                  className="mb-2 text-lg font-bold"
                  style={{
                    color: L.ink,
                    fontFamily: isRTL ? fontArabic : fontHeading,
                    letterSpacing: isRTL ? 'normal' : '-0.02em',
                  }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm"
                  style={{
                    color: L.fog,
                    fontFamily: isRTL ? fontArabic : fontBody,
                    lineHeight: isRTL ? 1.7 : 1.55,
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
