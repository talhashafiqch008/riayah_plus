import { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Clock,
  Calendar,
  ExternalLink,
  SlidersHorizontal,
  FileText,
  Sparkles,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { Navbar } from '@/components/landing/Navbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingButton } from '@/components/landing/LandingButton';
import { LandingCard } from '@/components/landing/LandingCard';
import { SectionReveal, Stagger, StaggerItem } from '@/components/landing/motion';
import { L, fontHeading, fontBody, fontArabic, easeOut } from '@/components/landing/tokens';
import {
  BLOG_ARTICLES,
  VERIFIED_DIRECTORIES,
  type BlogArticle,
} from '@/data/blogArticles';

type CategoryFilter = 'all' | 'disability-care' | 'aged-care' | 'care-coordination' | 'policy-research' | 'family-support';
type CountryFilter = 'all' | 'qatar' | 'saudi-arabia' | 'uae' | 'egypt' | 'regional' | 'unicef';

export default function BlogIndexPage() {
  const { t, i18n } = useTranslation('blog');
  const { isRTL } = useI18n();
  const reduceMotion = useReducedMotion();
  const currentLang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as 'ar' | 'en';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedCountry, setSelectedCountry] = useState<CountryFilter>('all');

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: t('categories.all', 'All Topics') },
    { key: 'disability-care', label: t('categories.disability-care', 'Disability Care') },
    { key: 'aged-care', label: t('categories.aged-care', 'Aged Care') },
    { key: 'care-coordination', label: t('categories.care-coordination', 'Care Coordination') },
    { key: 'policy-research', label: t('categories.policy-research', 'Policy & Research') },
    { key: 'family-support', label: t('categories.family-support', 'Family Support') },
  ];

  const countries: { key: CountryFilter; label: string }[] = [
    { key: 'all', label: t('countries.all', 'All Regions') },
    { key: 'qatar', label: t('countries.qatar', 'Qatar') },
    { key: 'regional', label: t('countries.regional', 'WHO & Regional') },
    { key: 'unicef', label: t('countries.unicef', 'UNICEF & MENA') },
  ];

  const filteredArticles = useMemo(() => {
    return BLOG_ARTICLES.filter((article) => {
      const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
      const matchesCountry = selectedCountry === 'all' || article.country === selectedCountry;

      if (!matchesCategory || !matchesCountry) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const title = (article.title[currentLang] || article.title.en).toLowerCase();
      const summary = (article.summary[currentLang] || article.summary.en).toLowerCase();
      const catLabel = (article.categoryLabel[currentLang] || article.categoryLabel.en).toLowerCase();
      const countryLabel = (article.countryLabel[currentLang] || article.countryLabel.en).toLowerCase();

      return title.includes(q) || summary.includes(q) || catLabel.includes(q) || countryLabel.includes(q);
    });
  }, [searchQuery, selectedCategory, selectedCountry, currentLang]);

  const featuredArticle = useMemo(() => {
    return BLOG_ARTICLES.find((a) => a.isFeatured) || BLOG_ARTICLES[0];
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: L.mist,
        color: L.ink,
        fontFamily: isRTL ? fontArabic : fontBody,
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 pt-12 pb-14 sm:px-6 sm:pt-16 sm:pb-18 lg:px-8">
          {/* Subtle Background Glow */}
          <div
            className="pointer-events-none absolute -top-24 start-1/2 -z-10 h-96 w-full max-w-4xl -translate-x-1/2 opacity-40 blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(20,184,166,0.25) 0%, rgba(13,148,136,0.05) 60%, transparent 80%)',
            }}
          />

          <div className="mx-auto max-w-4xl text-center">
            {/* Brand Motto Badge */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: easeOut }}
              className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50/90 px-4 py-1.5 text-xs font-semibold text-teal-800 shadow-sm sm:text-sm"
              style={{ fontFamily: fontArabic }}
            >
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span>{t('hub.brandLine', 'خبرة عالمية. برؤية محلية.')}</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: easeOut }}
              className="mt-6 text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-5xl"
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                color: L.ink,
                lineHeight: isRTL ? 1.35 : 1.15,
              }}
            >
              {t('hub.title', 'Evidence-Based Care & Regional Insights')}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.14, ease: easeOut }}
              className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-slate-600"
              style={{
                fontFamily: isRTL ? fontArabic : fontBody,
                lineHeight: isRTL ? 1.75 : 1.6,
              }}
            >
              {t(
                'hub.subtitle',
                'Rigorous analyses, policy breakdowns, and practical guidance on disability care, aged care, and family care coordination across Qatar, the GCC, and Egypt.'
              )}
            </motion.p>

            {/* Interactive Search Bar */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: easeOut }}
              className="relative mx-auto mt-8 max-w-xl"
            >
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute start-4 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('hub.searchPlaceholder', 'Search analyses, policies, or clinical topics...')}
                  className="w-full rounded-2xl border border-slate-200 bg-white/95 py-3.5 pe-4 ps-11 text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 sm:text-base"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute end-3 text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </motion.div>

            {/* Topic & Region Filters */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.26, ease: easeOut }}
              className="mt-8 flex flex-col items-center gap-3"
            >
              {/* Category Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {categories.map((cat) => {
                  const active = selectedCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/20'
                          : 'bg-white/80 text-slate-600 hover:bg-white hover:text-teal-700 border border-slate-200/80'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Country / Region Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <span className="flex items-center gap-1 text-xs text-slate-400 me-1">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </span>
                {countries.map((c) => {
                  const active = selectedCountry === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => setSelectedCountry(c.key)}
                      className={`rounded-lg px-2.5 py-1 text-xs transition-all duration-150 ${
                        active
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Featured Article Banner (if no active restrictive search) */}
        {!searchQuery && selectedCategory === 'all' && selectedCountry === 'all' && (
          <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
            <SectionReveal>
              <div className="relative overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-900 via-teal-950 to-slate-900 p-6 sm:p-10 lg:p-12 text-white shadow-xl">
                {/* Background Pattern */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: 'radial-gradient(#5EEAD4 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

                <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center">
                  <div className="lg:col-span-7">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="rounded-full bg-teal-400/20 px-3 py-1 text-xs font-bold text-teal-200 backdrop-blur-sm border border-teal-300/30">
                        {t('hub.featuredBadge', 'Featured Regional Analysis')}
                      </span>
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-teal-100">
                        {featuredArticle.countryLabel[currentLang] || featuredArticle.countryLabel.en}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-teal-200/80">
                        <Clock className="h-3.5 w-3.5" />
                        {t('hub.readTime', { min: featuredArticle.readTimeMin })}
                      </span>
                    </div>

                    {/* Title */}
                    <h2
                      className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white"
                      style={{
                        fontFamily: isRTL ? fontArabic : fontHeading,
                        lineHeight: isRTL ? 1.35 : 1.2,
                      }}
                    >
                      {featuredArticle.title[currentLang] || featuredArticle.title.en}
                    </h2>

                    {/* Summary */}
                    <p
                      className="mt-3 text-sm sm:text-base text-teal-100/90 leading-relaxed"
                      style={{
                        fontFamily: isRTL ? fontArabic : fontBody,
                        lineHeight: isRTL ? 1.75 : 1.6,
                      }}
                    >
                      {featuredArticle.summary[currentLang] || featuredArticle.summary.en}
                    </p>

                    {/* Verified Citations preview */}
                    <div className="mt-6 flex flex-wrap items-center gap-4">
                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-teal-800/40 px-3 py-1.5 text-xs font-medium text-teal-200 border border-teal-500/20">
                        <ShieldCheck className="h-4 w-4 text-teal-300" />
                        <span>
                          {t('hub.verifiedSourcesCount', {
                            count: featuredArticle.sources.length,
                          })}
                        </span>
                      </div>

                      <Link
                        to={`/blog/${featuredArticle.slug}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition-all duration-200 hover:bg-teal-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                      >
                        <span>{t('hub.readArticle', 'Read Full Analysis')}</span>
                        <ArrowRight className="h-4 w-4 rtl-flip" />
                      </Link>
                    </div>
                  </div>

                  {/* Key Takeaways Box */}
                  <div className="lg:col-span-5">
                    <div className="rounded-2xl border border-teal-400/20 bg-white/5 p-5 sm:p-6 backdrop-blur-md">
                      <h3
                        className="text-sm font-bold uppercase tracking-wider text-teal-300 mb-3 flex items-center gap-2"
                        style={{ fontFamily: fontHeading }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {t('article.keyTakeawaysTitle', 'Key Takeaways for Families')}
                      </h3>
                      <ul className="space-y-2.5">
                        {(featuredArticle.keyTakeaways[currentLang] || featuredArticle.keyTakeaways.en).map(
                          (takeaway, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-teal-100/90 leading-relaxed">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                              <span>{takeaway}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </SectionReveal>
          </section>
        )}

        {/* Articles Grid Section */}
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {filteredArticles.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-bold text-slate-800" style={{ fontFamily: fontHeading }}>
                {t('hub.noResultsTitle', 'No analyses found')}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {t('hub.noResultsDesc', 'Try adjusting your search query or removing active category/region filters.')}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedCountry('all');
                }}
                className="mt-5 inline-flex rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                {t('article.viewAll', 'View All Articles')}
              </button>
            </div>
          ) : (
            <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map((article, idx) => {
                const title = article.title[currentLang] || article.title.en;
                const summary = article.summary[currentLang] || article.summary.en;
                const categoryLabel = article.categoryLabel[currentLang] || article.categoryLabel.en;
                const countryLabel = article.countryLabel[currentLang] || article.countryLabel.en;
                const fillDir = (['left', 'center', 'right', 'top'][idx % 4]) as 'left' | 'center' | 'right' | 'top';

                return (
                  <StaggerItem key={article.id} className="h-full">
                    <Link
                      to={`/blog/${article.slug}`}
                      className="group block h-full !min-h-0 !min-w-0"
                      style={{ minHeight: 'auto', minWidth: 'auto' }}
                    >
                      <LandingCard
                        tone="light"
                        fill={fillDir}
                        fillColor={L.sea}
                        className="flex h-full flex-col justify-between p-6 shadow-sm"
                        style={{ minHeight: '340px' }}
                      >
                        <div>
                          {/* Top Metadata */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <span className="lc-badge rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 border border-teal-200/50">
                              {categoryLabel}
                            </span>
                            <span className="lc-badge rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-200/40">
                              {countryLabel}
                            </span>
                          </div>

                          {/* Title */}
                          <h3
                            className="lc-title text-lg font-bold line-clamp-2"
                            style={{
                              fontFamily: isRTL ? fontArabic : fontHeading,
                              lineHeight: isRTL ? 1.4 : 1.3,
                            }}
                          >
                            {title}
                          </h3>

                          {/* Summary */}
                          <p
                            className="lc-muted mt-2.5 text-xs sm:text-sm line-clamp-3 leading-relaxed"
                            style={{
                              fontFamily: isRTL ? fontArabic : fontBody,
                              lineHeight: isRTL ? 1.7 : 1.55,
                            }}
                          >
                            {summary}
                          </p>
                        </div>

                        {/* Card Footer */}
                        <div className="lc-rule mt-6 pt-4 border-t border-slate-100">
                          {/* Verified Sources snippet */}
                          <div className="lc-muted flex items-center justify-between text-xs mb-3">
                            <span className="lc-accent inline-flex items-center gap-1 text-teal-700 font-medium">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {article.sources.length} {t('article.officialSource', 'Official Sources')}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {t('hub.readTime', { min: article.readTimeMin })}
                            </span>
                          </div>

                          {/* Action Link */}
                          <div className="lc-btn-link flex items-center justify-between text-xs font-bold text-teal-700">
                            <span>{t('hub.readArticle', 'Read Full Analysis')}</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1 rtl-flip" />
                          </div>
                        </div>
                      </LandingCard>
                    </Link>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </section>

        {/* Verified Data & Policy Sources Directory */}
        <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 lg:px-8">
          <SectionReveal className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 lg:p-12 shadow-sm">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span
                className="text-xs font-bold uppercase tracking-widest text-teal-600"
                style={{ fontFamily: fontHeading }}
              >
                {t('verifiedDirectory.eyebrow', 'Institutional Rigor')}
              </span>
              <h2
                className="mt-2 text-2xl font-bold sm:text-3xl text-slate-900"
                style={{
                  fontFamily: isRTL ? fontArabic : fontHeading,
                  lineHeight: isRTL ? 1.35 : 1.2,
                }}
              >
                {t('verifiedDirectory.title', 'Verified Data & Policy Directory')}
              </h2>
              <p
                className="mt-3 text-sm sm:text-base text-slate-600"
                style={{
                  fontFamily: isRTL ? fontArabic : fontBody,
                  lineHeight: isRTL ? 1.7 : 1.6,
                }}
              >
                {t(
                  'verifiedDirectory.subtitle',
                  'Riayah Plus builds its care models upon validated national strategies, demographic datasets, and WHO/UNICEF standards.'
                )}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {VERIFIED_DIRECTORIES.map((dirGroup) => {
                const countryTitle = dirGroup.countryName[currentLang] || dirGroup.countryName.en;
                return (
                  <div
                    key={dirGroup.country}
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-sm">
                      <Building2 className="h-4 w-4 text-teal-600 shrink-0" />
                      <span>{countryTitle}</span>
                    </div>

                    <ul className="space-y-3">
                      {dirGroup.sources.map((src, idx) => {
                        const name = src.name[currentLang] || src.name.en;
                        const desc = src.description[currentLang] || src.description.en;
                        return (
                          <li key={idx} className="text-xs">
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-900"
                            >
                              <span>{name}</span>
                              <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                            </a>
                            <p className="mt-0.5 text-slate-500 line-clamp-2">{desc}</p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 text-center text-xs text-slate-400 border-t border-slate-100 pt-6">
              {t(
                'verifiedDirectory.disclaimer',
                'Note: Riayah Plus regularly audits and updates primary statistical citations to ensure fidelity with official government publications.'
              )}
            </div>
          </SectionReveal>
        </section>

        {/* Final Consultation CTA */}
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <SectionReveal className="rounded-3xl border border-teal-100 bg-gradient-to-r from-teal-50 via-teal-100/50 to-white p-8 sm:p-12 text-center shadow-sm">
            <span
              className="text-xs font-bold uppercase tracking-widest text-teal-700"
              style={{ fontFamily: fontHeading }}
            >
              {t('cta.eyebrow', 'From Insight to Action')}
            </span>
            <h2
              className="mx-auto mt-2 max-w-2xl text-2xl font-extrabold sm:text-3xl text-slate-900"
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                lineHeight: isRTL ? 1.35 : 1.2,
              }}
            >
              {t(
                'cta.title',
                'Turn clinical evidence into a structured care plan for your loved one'
              )}
            </h2>
            <p
              className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-slate-600"
              style={{
                fontFamily: isRTL ? fontArabic : fontBody,
                lineHeight: isRTL ? 1.7 : 1.6,
              }}
            >
              {t(
                'cta.subtitle',
                "Speak directly with a dedicated Care Coordinator who understands your family's daily routines, goals, and regional healthcare resources."
              )}
            </p>
            <div className="mt-6 flex justify-center">
              <LandingButton
                to="/register"
                variant="solid"
                fill="left"
                className="px-6 py-3 text-sm font-bold shadow-md"
              >
                <span>{t('cta.button', 'Book a Free Consultation')}</span>
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </LandingButton>
            </div>
          </SectionReveal>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
