import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Minus, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, easeOut } from './tokens';
import { SectionReveal, Stagger, StaggerItem } from './motion';

export function FAQ() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();
  const [open, setOpen] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();

  const faqs = (
    t('faq.items', { returnObjects: true }) as Array<{ q: string; a: string }>
  ) || [
    {
      q: 'What happens after I create a family account?',
      a: 'You complete a short intake. A coordinator reviews it, opens an episode when appropriate, and assigns the clinical team.',
    },
    {
      q: 'Can we do telehealth and home visits?',
      a: 'Yes. Sessions can be telehealth, in-person, or home visits, scheduled on the same calendar with notes on the care plan.',
    },
    {
      q: 'Who sees our messages and documents?',
      a: 'Only people on the episode: family members with access, assigned clinicians, and the coordinator.',
    },
    {
      q: 'How does billing work?',
      a: 'Invoices appear beside the episode. You can view history and pay from the family billing view.',
    },
  ];

  return (
    <section id="faq" className="py-20 sm:py-28" style={{ background: L.mist }}>
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <SectionReveal>
            <p
              className={`mb-3 text-xs font-bold uppercase ${
                isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
              }`}
              style={{ color: L.lagoon, fontFamily: isRTL ? fontArabic : fontBody }}
            >
              {t('faq.eyebrow', 'FAQ')}
            </p>
            <h2
              className="mb-4"
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                fontWeight: 800,
                fontSize: 'clamp(1.75rem, 3.2vw, 2.35rem)',
                letterSpacing: isRTL ? 'normal' : '-0.03em',
                lineHeight: isRTL ? 1.45 : 1.2,
                color: L.ink,
              }}
            >
              {t('faq.title', 'Helping you understand care on Riayah')}
            </h2>
            <p
              className="mb-8 text-[1.02rem]"
              style={{
                color: L.fog,
                fontFamily: isRTL ? fontArabic : fontBody,
                lineHeight: isRTL ? 1.75 : 1.6,
                letterSpacing: isRTL ? 'normal' : undefined,
              }}
            >
              {t(
                'faq.subtitle',
                'Common questions about intake, visits, privacy, and joining the care team.'
              )}
            </p>
            <div
              className="flex items-start gap-4 rounded-2xl p-5"
              style={{ background: L.paper, border: `1px solid ${L.lineSoft}` }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: L.sky, color: L.sea }}
              >
                <Phone className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p
                  className="mb-1 text-xs font-bold uppercase tracking-wider"
                  style={{
                    color: L.sea,
                    fontFamily: isRTL ? fontArabic : fontBody,
                    letterSpacing: isRTL ? 'normal' : undefined,
                  }}
                >
                  {t('faq.support.needHuman', 'Need a human?')}
                </p>
                <p
                  className="text-sm"
                  style={{
                    color: L.fog,
                    fontFamily: isRTL ? fontArabic : fontBody,
                    lineHeight: isRTL ? 1.65 : 1.5,
                  }}
                >
                  {t(
                    'faq.support.description',
                    'Start an account and your coordinator responds on the episode thread during support hours.'
                  )}
                </p>
              </div>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.06}>
            <Stagger className="space-y-3" stagger={0.07} delayChildren={0.04}>
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
                        className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#14B8A6]"
                      >
                        <span
                          className="text-[0.98rem] font-semibold leading-snug"
                          style={{
                            fontFamily: isRTL ? fontArabic : fontHeading,
                            color: L.ink,
                            lineHeight: isRTL ? 1.45 : 1.3,
                          }}
                        >
                          {q}
                        </span>
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{ background: isOpen ? L.sea : L.sky }}
                        >
                          {isOpen ? (
                            <Minus className="h-4 w-4 text-white" aria-hidden />
                          ) : (
                            <Plus className="h-4 w-4" style={{ color: L.sea }} aria-hidden />
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
                              className="px-5 pb-5 text-sm"
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
