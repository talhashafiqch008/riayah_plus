const originalLog = console.log;
console.log = (...args: unknown[]) => {
    if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('Locize')) {
        return;
    }
    originalLog.apply(console, args);
};

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './en.json';
import arTranslation from './ar.json';

import enLanding from '@/locales/en/landing.json';
import arLanding from '@/locales/ar/landing.json';

import enAbout from '@/locales/en/about.json';
import arAbout from '@/locales/ar/about.json';

import enCommon from '@/locales/en/common.json';
import arCommon from '@/locales/ar/common.json';

import enBlog from '@/locales/en/blog.json';
import arBlog from '@/locales/ar/blog.json';

import enFamily from '@/locales/en/family.json';
import arFamily from '@/locales/ar/family.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: enTranslation,
                landing: enLanding,
                about: enAbout,
                common: enCommon,
                blog: enBlog,
                family: enFamily,
            },
            ar: {
                translation: arTranslation,
                landing: arLanding,
                about: arAbout,
                common: arCommon,
                blog: arBlog,
                family: arFamily,
            },
        },
        fallbackLng: 'en',
        defaultNS: 'translation',
        ns: ['translation', 'landing', 'about', 'common', 'blog', 'family'],
        debug: false,
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },
    });

export default i18n;
