import { ArrowRight, Calendar, MessageSquare, Video, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, landingContainerClass } from './tokens';
import { SoftBackdrop } from './SoftBackdrop';
import { LandingButton } from './LandingButton';
import { SectionReveal } from './motion';

/** Carely-inspired product overview bento — sits with services content */
export function ProductOverview() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  return (
    <section
      id="product-overview"
      className="relative overflow-hidden py-20 sm:py-24"
      style={{ background: L.ice }}
    >
      <SoftBackdrop />
      <div className={landingContainerClass}>
        <SectionReveal className="mb-10 max-w-2xl text-start sm:mb-12">
          <h2
            style={{
              fontFamily: isRTL ? fontArabic : fontHeading,
              fontWeight: 800,
              fontSize: 'clamp(1.75rem, 3.4vw, 2.45rem)',
              letterSpacing: isRTL ? 'normal' : '-0.03em',
              lineHeight: isRTL ? 1.4 : 1.15,
              color: L.ink,
            }}
          >
            {t('productOverview.title', 'Everything your care team needs in one calm product.')}
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
              'productOverview.subtitle',
              'Appointments, messaging, telehealth, and follow-up care designed for clinics and families together.',
            )}
          </p>
        </SectionReveal>

        <div className="grid gap-4 md:grid-cols-6 md:grid-rows-[auto_auto]">
          {/* Large photo tile */}
          <div className="relative min-h-[280px] overflow-hidden rounded-[1.75rem] md:col-span-2 md:row-span-2 md:min-h-[420px]">
            <img
              src="/landing/who-family.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <p
              className="absolute bottom-5 start-5 end-5 text-3xl font-bold leading-tight text-white sm:text-4xl"
              style={{ fontFamily: isRTL ? fontArabic : fontHeading, letterSpacing: '-0.03em' }}
            >
              {t('productOverview.satisfied', 'Families supported with coordinated care')}
            </p>
          </div>

          {/* Integrations */}
          <div
            className="rounded-[1.75rem] bg-white p-5 md:col-span-2"
            style={{ border: `1px solid ${L.lineSoft}`, boxShadow: L.shadowSoft }}
          >
            <p className="mb-4 text-sm font-semibold" style={{ color: L.ink }}>
              {t('productOverview.integrations', 'Integrations')}
            </p>
            <div className="flex flex-wrap gap-3">
              {[Video, Calendar, MessageSquare, Sparkles].map((Icon, i) => (
                <div
                  key={i}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: i % 2 === 0 ? L.sky : L.iconPurple, color: L.sea }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs" style={{ color: L.fog }}>
              {t(
                'productOverview.integrationsBody',
                'Telehealth, calendars, and secure messaging connected to your care workflows.',
              )}
            </p>
          </div>

          {/* Coral CTA tile */}
          <div
            className="flex flex-col justify-between rounded-[1.75rem] p-5 text-white md:col-span-2"
            style={{ background: `linear-gradient(145deg, ${L.lagoon}, ${L.sea})` }}
          >
            <div>
              <h3
                className="text-xl font-bold"
                style={{ fontFamily: isRTL ? fontArabic : fontHeading }}
              >
                {t('productOverview.followUpTitle', 'Follow-up care made easy')}
              </h3>
              <p className="mt-2 text-sm text-white/90">
                {t(
                  'productOverview.followUpBody',
                  'Keep plans, notes, and next steps visible for every clinician and family member.',
                )}
              </p>
            </div>
            <LandingButton
              to="/register"
              variant="on-dark"
              fill="none"
              className="mt-5 min-h-10 w-fit px-5 text-sm"
            >
              {t('productOverview.learnMore', 'Learn more')}
              <ArrowRight className="h-4 w-4 rtl-flip" aria-hidden />
            </LandingButton>
          </div>

          {/* Appointments */}
          <div
            className="rounded-[1.75rem] bg-white p-5 md:col-span-2"
            style={{ border: `1px solid ${L.lineSoft}`, boxShadow: L.shadowSoft }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" style={{ color: L.sea }} aria-hidden />
              <p className="text-sm font-semibold" style={{ color: L.ink }}>
                {t('productOverview.appointments', 'Appointments, simplified')}
              </p>
            </div>
            <div className="space-y-2">
              {[
                t('productOverview.visit1', 'Home nursing'),
                t('productOverview.visit2', 'Physiotherapy'),
                t('productOverview.visit3', 'Telehealth review'),
              ].map((label) => (
                <div
                  key={label}
                  className="rounded-xl px-3 py-2.5 text-xs font-medium"
                  style={{ background: L.mist, color: L.ink }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Messaging */}
          <div
            className="rounded-[1.75rem] bg-white p-5 md:col-span-2"
            style={{ border: `1px solid ${L.lineSoft}`, boxShadow: L.shadowSoft }}
          >
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" style={{ color: L.sea }} aria-hidden />
              <p className="text-sm font-semibold" style={{ color: L.ink }}>
                {t('productOverview.messaging', 'Secure patient messaging')}
              </p>
            </div>
            <div className="space-y-2">
              <div
                className="ml-auto max-w-[80%] rounded-2xl rounded-ee-md px-3 py-2 text-xs text-white"
                style={{ background: L.sea }}
              >
                {t('productOverview.msg1', 'Visit notes are ready for review.')}
              </div>
              <div
                className="max-w-[80%] rounded-2xl rounded-es-md px-3 py-2 text-xs"
                style={{ background: L.mist, color: L.ink }}
              >
                {t('productOverview.msg2', 'Thank you. We’ll join tomorrow’s session.')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
