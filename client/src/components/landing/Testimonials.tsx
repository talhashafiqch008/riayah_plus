import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, easeOut } from './tokens';
import { SectionReveal } from './motion';

const TESTIMONIALS_EN = [
  {
    quote:
      'Finding specialized physical therapy and daily living support for my son with cerebral palsy was overwhelming. Our Riayah Care Coordinator built a personalized plan and stays in touch every week. It has brought peace back to our household.',
    name: 'Nasser Al-Kuwari',
    role: 'Parent of child with disability · Doha',
    initials: 'NK',
  },
  {
    quote:
      'My 84-year-old mother wanted to remain in her home. Riayah coordinated her home nurse, medication checks, and geriatric physio into one synchronized weekly schedule. We never worry about missed visits.',
    name: 'Mona Al-Attiyah',
    role: 'Family caregiver (Aged Care) · Al Rayyan',
    initials: 'MA',
  },
  {
    quote:
      'The Riayah Care Plan makes all the difference. We see real mobility progress targets and therapy notes immediately after every session. No paperwork chase, just compassionate care.',
    name: 'Rashid Al-Thani',
    role: 'Family member · Lusail',
    initials: 'RT',
  },
  {
    quote:
      'Having one dedicated coordinator meant we didn’t have to repeat our daughter’s medical background to five different therapists. Everyone arrives prepared and works as a true team.',
    name: 'Huda Al-Marri',
    role: 'Parent · Al Wakrah',
    initials: 'HM',
  },
  {
    quote:
      'After my father’s stroke, coordinating rehabilitation felt like a full-time job. Riayah took over the logistics completely, organizing home physiotherapy, nursing, and doctor check-ins seamlessly.',
    name: 'Fahad Al-Nuaimi',
    role: 'Family caregiver · Doha',
    initials: 'FN',
  },
  {
    quote:
      'The warmth and professionalism of the care team gave my grandmother confidence and dignity. She looks forward to her companion and rehabilitation sessions every week.',
    name: 'Noor Al-Sulaiti',
    role: 'Granddaughter · Al Khor',
    initials: 'NS',
  },
];

const TESTIMONIALS_AR = [
  {
    quote:
      'كان العثور على أخصائي علاج طبيعي ومساندة يومية لابني من أصحاب الهمم أمراً شاقاً ومشتتاً. صاغت منسقة رعاية بلس خطة مخصصة وتتابع معنا أسبوعياً، مما أعاد الهدوء والاطمئنان لبيتنا.',
    name: 'ناصر الكواري',
    role: 'ولي أمر (دعم ذوي الإعاقة) · الدوحة',
    initials: 'ن ك',
  },
  {
    quote:
      'كانت رغبة والدتي البالغة 84 عاماً هي البقاء في منزلها المألوف. نظمت رعاية بلس زيارات التمريض المنزلي والعلاج الطبيعي في جدول موحد ودقيق دون أي انقطاع أو تأخير.',
    name: 'منى العطية',
    role: 'مقدمة رعاية أسرية (رعاية كبار السن) · الريان',
    initials: 'م ع',
  },
  {
    quote:
      'خطة الرعاية الفردية من رعاية بلس أحدثت فارقاً حقيقياً؛ نرى أهداف التحسن وملاحظات المعالجين فور انتهاء كل جلسة دون الحاجة لطلب تقارير يدوية.',
    name: 'راشد آل ثاني',
    role: 'فرد من العائلة · لوسيل',
    initials: 'ر ث',
  },
  {
    quote:
      'وجود منسق رعاية مخصص وفّر علينا عناء تكرار شرح التاريخ الطبي لابنتنا لكل معالج جديد؛ فالفريق الطبي يأتي مطلعاً تماماً ويعمل بتناغم مذهل.',
    name: 'هدى المري',
    role: 'والدة مريضة · الوكرة',
    initials: 'هـ م',
  },
  {
    quote:
      'بعد إصابة والدي بالجلطة، كان تنسيق جلسات التأهيل مرهقاً جداً لنا كعائلة. تولت رعاية بلس كافة الترتيبات التمريضية والتأهيلية باحترافية وتفانٍ كبير.',
    name: 'فهد النعيمي',
    role: 'مقدم رعاية أسرية · الدوحة',
    initials: 'ف ن',
  },
  {
    quote:
      'اللطف والاهتمام الذي لمسناه من الكادر الطبي منح جدتي شعوراً بالأمان والراحة، وأصبحت تنتظر مواعيد جلسات التأهيل والمرافقة الأسبوعية بكل سعادة.',
    name: 'نور السليطي',
    role: 'فرد من العائلة · الخور',
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
      className="flex h-full flex-col rounded-2xl bg-white p-6"
      style={{
        border: `1px solid ${L.lineSoft}`,
        boxShadow: '0 14px 36px -20px rgba(15,23,42,0.18)',
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-0.5" style={{ color: L.sea }} aria-label="5 star rating">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" />
          ))}
        </div>
        <Quote className="h-6 w-6 rtl-flip" style={{ color: `${L.lagoon}66` }} aria-hidden />
      </div>
      <p
        className="mb-6 flex-1 text-sm italic"
        style={{
          color: L.fog,
          fontFamily: isRTL ? fontArabic : fontBody,
          lineHeight: isRTL ? 1.75 : 1.6,
        }}
      >
        “{quote}”
      </p>
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
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
              lineHeight: isRTL ? 1.4 : 1.25,
            }}
          >
            {name}
          </p>
          <p
            className="text-xs"
            style={{
              color: L.fog,
              fontFamily: isRTL ? fontArabic : fontBody,
              lineHeight: isRTL ? 1.5 : 1.3,
            }}
          >
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
    [pageCount]
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
    <section id="testimonials" className="py-20 sm:py-28" style={{ background: L.paper }} aria-label="Testimonials">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <SectionReveal className="mb-12 text-center">
          <p
            className={`mb-3 text-xs font-bold uppercase ${
              isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
            }`}
            style={{ color: L.lagoon, fontFamily: isRTL ? fontArabic : fontBody }}
          >
            {t('testimonials.eyebrow', 'Real Families, Real Stories')}
          </p>
          <h2
            style={{
              fontFamily: isRTL ? fontArabic : fontHeading,
              fontWeight: 800,
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              letterSpacing: isRTL ? 'normal' : '-0.03em',
              lineHeight: isRTL ? 1.45 : 1.2,
              color: L.ink,
            }}
          >
            {t('testimonials.title', 'How Riayah transforms everyday family life')}
          </h2>
          <p
            className="mx-auto max-w-2xl mt-3 text-[1.02rem]"
            style={{
              color: L.fog,
              fontFamily: isRTL ? fontArabic : fontBody,
              lineHeight: isRTL ? 1.75 : 1.6,
            }}
          >
            {t(
              'testimonials.subtitle',
              'Hear from families in Qatar who found peace of mind with our coordinated disability and aged care.'
            )}
          </p>
        </SectionReveal>

        <SectionReveal className="relative min-h-[280px]" delay={0.06}>
          <div aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${language}-${page}`}
                initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(12px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                exit={reduceMotion ? undefined : { opacity: 0, transform: 'translateY(-8px)' }}
                transition={{ duration: 0.35, ease: easeOut }}
                className="grid gap-5 md:grid-cols-3"
              >
                {visible.map((t) => (
                  <TestimonialCard key={`${page}-${t.name}`} {...t} />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </SectionReveal>

        <div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="Testimonial pages">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === page}
              aria-label={`Show stories page ${i + 1}`}
              onClick={() => go(i)}
              className="h-2.5 rounded-full transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
              style={{
                width: i === page ? 22 : 10,
                background: i === page ? L.sea : `${L.lagoon}44`,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
