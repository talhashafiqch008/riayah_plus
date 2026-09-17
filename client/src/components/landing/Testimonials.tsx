import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, easeOut, landingContainerClass } from './tokens';
import { SectionReveal } from './motion';

const TESTIMONIALS_EN = [
  {
    quote:
      'Our Care Coordinator built a clear plan for our son and checks in every week. Care finally feels manageable.',
    name: 'Nasser Al-Kuwari',
    role: 'Parent · Doha',
    initials: 'NK',
  },
  {
    quote:
      'Riayah synced nursing, meds, and physio for my mother into one weekly schedule. We stopped worrying about missed visits.',
    name: 'Mona Al-Attiyah',
    role: 'Family caregiver · Al Rayyan',
    initials: 'MA',
  },
  {
    quote:
      'We see goals and therapy notes right after each session. No paperwork chase, just clear progress.',
    name: 'Rashid Al-Thani',
    role: 'Family member · Lusail',
    initials: 'RT',
  },
  {
    quote:
      'One coordinator meant we never had to repeat our daughter’s history to every therapist. The team arrives prepared.',
    name: 'Huda Al-Marri',
    role: 'Parent · Al Wakrah',
    initials: 'HM',
  },
  {
    quote:
      'After my father’s stroke, Riayah handled rehab logistics completely. Nursing and physio just showed up on time.',
    name: 'Fahad Al-Nuaimi',
    role: 'Family caregiver · Doha',
    initials: 'FN',
  },
  {
    quote:
      'The team gave my grandmother confidence and dignity. She looks forward to her sessions every week.',
    name: 'Noor Al-Sulaiti',
    role: 'Granddaughter · Al Khor',
    initials: 'NS',
  },
];

const TESTIMONIALS_AR = [
  {
    quote:
      'منسقة الرعاية وضعت خطة واضحة لابني وتتابع معنا أسبوعياً. أصبحت الرعاية أسهل بكثير.',
    name: 'ناصر الكواري',
    role: 'ولي أمر · الدوحة',
    initials: 'ن ك',
  },
  {
    quote:
      'نظّمت رعاية بلس التمريض والأدوية والعلاج الطبيعي لوالدتي في جدول أسبوعي واحد دون انقطاع.',
    name: 'منى العطية',
    role: 'مقدمة رعاية · الريان',
    initials: 'م ع',
  },
  {
    quote:
      'نرى الأهداف وملاحظات العلاج فور انتهاء كل جلسة. وضوح كامل دون مطاردة التقارير.',
    name: 'راشد آل ثاني',
    role: 'فرد من العائلة · لوسيل',
    initials: 'ر ث',
  },
  {
    quote:
      'منسق واحد أغنانا عن تكرار تاريخ ابنتنا الطبي لكل معالج. الفريق يصل مستعداً ويعمل بتناغم.',
    name: 'هدى المري',
    role: 'والدة · الوكرة',
    initials: 'هـ م',
  },
  {
    quote:
      'بعد جلطة والدي تولّت رعاية بلس ترتيب التأهيل بالكامل. التمريض والعلاج الطبيعي في مواعيدهم.',
    name: 'فهد النعيمي',
    role: 'مقدم رعاية · الدوحة',
    initials: 'ف ن',
  },
  {
    quote:
      'اللطف والاحترافية منحتا جدتي ثقة وكرامة. تنتظر جلساتها كل أسبوع بسعادة.',
    name: 'نور السليطي',
    role: 'حفيدة · الخور',
    initials: 'ن س',
  },
];

const PER_PAGE = 3;

function TestimonialCard({
  quote,
  name,
  role,
  initials,
}: {
  quote: string;
  name: string;
  role: string;
  initials: string;
}) {
  const { isRTL } = useI18n();

  return (
    <article
      className="flex h-full flex-col rounded-2xl bg-white p-5 sm:p-6"
      style={{
        border: `1px solid ${L.lineSoft}`,
        boxShadow: L.shadowSoft,
      }}
    >
      <div className="mb-3 flex gap-0.5" style={{ color: L.sea }} aria-label="5 star rating">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden />
        ))}
      </div>
      <p
        className="mb-5 flex-1 text-sm"
        style={{
          color: L.ink,
          fontFamily: isRTL ? fontArabic : fontBody,
          lineHeight: isRTL ? 1.75 : 1.6,
        }}
      >
        “{quote}”
      </p>
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: L.sea, fontFamily: isRTL ? fontArabic : fontHeading }}
        >
          {initials}
        </div>
        <div>
          <p
            className="text-sm font-bold"
            style={{
              color: L.ink,
              fontFamily: isRTL ? fontArabic : fontHeading,
            }}
          >
            {name}
          </p>
          <p className="text-xs" style={{ color: L.fog, fontFamily: isRTL ? fontArabic : fontBody }}>
            {role}
          </p>
        </div>
      </div>
    </article>
  );
}

export function Testimonials() {
  const { t } = useTranslation('landing');
  const { language, isRTL } = useI18n();
  const [page, setPage] = useState(0);
  const reduceMotion = useReducedMotion();

  const list = language === 'ar' ? TESTIMONIALS_AR : TESTIMONIALS_EN;
  const pageCount = Math.ceil(list.length / PER_PAGE);

  const go = useCallback(
    (index: number) => {
      setPage((index + pageCount) % pageCount);
    },
    [pageCount],
  );

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setPage((prev) => (prev + 1) % pageCount);
    }, 7000);
    return () => clearInterval(interval);
  }, [pageCount, reduceMotion]);

  const visible = useMemo(() => {
    const start = page * PER_PAGE;
    return list.slice(start, start + PER_PAGE);
  }, [page, list]);

  return (
    <section
      id="testimonials"
      className="relative overflow-hidden py-20 sm:py-28"
      style={{
        background: `linear-gradient(180deg, ${L.paper} 0%, ${L.paper} 35%, ${L.ice} 100%)`,
      }}
      aria-label="Testimonials"
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%]"
        aria-hidden
        style={{
          background: `radial-gradient(ellipse 70% 75% at 50% 100%, ${L.aqua}45 0%, transparent 70%)`,
        }}
      />

      <div className={`${landingContainerClass} z-10`}>
        <SectionReveal className="mb-10 max-w-2xl text-start sm:mb-12">
          <h2
            style={{
              fontFamily: isRTL ? fontArabic : fontHeading,
              fontWeight: 800,
              fontSize: 'clamp(1.75rem, 3.5vw, 2.45rem)',
              letterSpacing: isRTL ? 'normal' : '-0.03em',
              lineHeight: isRTL ? 1.4 : 1.15,
              color: L.ink,
            }}
          >
            {t('testimonials.titleShort', 'Stories from families who trust Riayah.')}
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
              'testimonials.subtitleShort',
              'Real families in Qatar on coordinated disability and aged care.',
            )}
          </p>
        </SectionReveal>

        <SectionReveal className="relative min-h-[240px]" delay={0.06}>
          <div aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${language}-${page}`}
                initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(12px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                exit={reduceMotion ? undefined : { opacity: 0, transform: 'translateY(-8px)' }}
                transition={{ duration: 0.35, ease: easeOut }}
                className="grid gap-4 md:grid-cols-3"
              >
                {visible.map((item) => (
                  <TestimonialCard key={`${page}-${item.name}`} {...item} />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </SectionReveal>

        <div className="mt-8 flex justify-center gap-1" role="tablist" aria-label="Testimonial pages">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === page}
              aria-label={`Show stories page ${i + 1}`}
              onClick={() => go(i)}
              className="flex items-center justify-center p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
              style={{ minHeight: 0, minWidth: 0 }}
            >
              <span
                className="block rounded-full transition-all duration-200"
                style={{
                  height: 5,
                  width: i === page ? 16 : 5,
                  background: i === page ? L.sea : `${L.lagoon}55`,
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
