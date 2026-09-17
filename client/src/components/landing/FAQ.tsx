import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, easeOut, landingContainerClass } from './tokens';
import { LandingButton } from './LandingButton';
import { SectionReveal, Stagger, StaggerItem } from './motion';

export function FAQ() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();
  const [open, setOpen] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();

  const faqs =
    (t('faq.items', { returnObjects: true }) as Array<{ q: string; a: string }>) || [];

  return (
    <section
      id="faq"
      className="relative overflow-hidden py-20 sm:py-28"
      style={{
        background: `linear-gradient(180deg, ${L.paper} 0%, ${L.paper} 35%, ${L.mist} 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%]"
        aria-hidden
        style={{
          background: `radial-gradient(ellipse 65% 70% at 80% 100%, ${L.aqua}40 0%, transparent 68%)`,
        }}
      />

      <div className={`${landingContainerClass} z-10`}>
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:items-start">
          <SectionReveal>
            <h2
              className="mb-3"
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                fontWeight: 800,
                fontSize: 'clamp(1.75rem, 3.2vw, 2.35rem)',
                letterSpacing: isRTL ? 'normal' : '-0.03em',
                lineHeight: isRTL ? 1.4 : 1.15,
                color: L.ink,
              }}
            >
              {t('faq.titleShort', 'Common questions from families')}
            </h2>
            <p
              className="mb-6 max-w-sm text-[1.02rem]"
              style={{
                color: L.fog,
                fontFamily: isRTL ? fontArabic : fontBody,
                lineHeight: isRTL ? 1.75 : 1.6,
              }}
            >
              {t(
                'faq.subtitleShort',
                'Quick answers on starting care, coordinators, and home support.',
              )}
            </p>
            <LandingButton
              to="/register"
              variant="solid"
              fill="left"
              className="min-h-11 px-6 text-sm"
            >
              {t('faq.support.cta', 'Talk to a coordinator')}
            </LandingButton>
          </SectionReveal>

          <SectionReveal delay={0.06}>
            <Stagger className="space-y-2.5" stagger={0.06} delayChildren={0.04}>
              {faqs.map(({ q, a }, i) => {
                const isOpen = open === i;
                return (
                  <StaggerItem key={q}>
                    <div
                      className="overflow-hidden rounded-2xl bg-white"
                      style={{ border: `1px solid ${L.lineSoft}` }}
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpen(isOpen ? null : i)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#14B8A6]"
                        style={{ minHeight: 52, minWidth: 0 }}
                      >
                        <span
                          className="text-[0.95rem] font-semibold leading-snug"
                          style={{
                            fontFamily: isRTL ? fontArabic : fontHeading,
                            color: L.ink,
                            lineHeight: isRTL ? 1.45 : 1.3,
                          }}
                        >
                          {q}
                        </span>
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                          style={{
                            background: isOpen ? L.sea : L.sky,
                            minHeight: 0,
                            minWidth: 0,
                          }}
                        >
                          {isOpen ? (
                            <Minus className="h-3.5 w-3.5 text-white" aria-hidden />
                          ) : (
                            <Plus className="h-3.5 w-3.5" style={{ color: L.sea }} aria-hidden />
                          )}
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                            transition={{ duration: 0.28, ease: easeOut }}
                            className="overflow-hidden"
                          >
                            <p
                              className="px-5 pb-4 text-sm"
                              style={{
                                color: L.fog,
                                fontFamily: isRTL ? fontArabic : fontBody,
                                lineHeight: isRTL ? 1.75 : 1.6,
                              }}
                            >
                              {a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </SectionReveal>
        </div>
      </div>
    </section>
  );
}
