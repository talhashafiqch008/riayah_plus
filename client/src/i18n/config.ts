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

import enCoordinator from '@/locales/en/coordinator.json';
import arCoordinator from '@/locales/ar/coordinator.json';

import enClinical from '@/locales/en/clinical.json';
import arClinical from '@/locales/ar/clinical.json';

import enSupport from '@/locales/en/support.json';
import arSupport from '@/locales/ar/support.json';

import enOrg from '@/locales/en/org.json';
import arOrg from '@/locales/ar/org.json';

import enAuth from '@/locales/en/auth.json';
import arAuth from '@/locales/ar/auth.json';

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
                coordinator: enCoordinator,
                clinical: enClinical,
                support: enSupport,
                org: enOrg,
                auth: enAuth,
            },
            ar: {
                translation: arTranslation,
                landing: arLanding,
                about: arAbout,
                common: arCommon,
                blog: arBlog,
                family: arFamily,
                coordinator: arCoordinator,
                clinical: arClinical,
                support: arSupport,
                org: arOrg,
                auth: arAuth,
            },
        },
        fallbackLng: 'en',
        defaultNS: 'translation',
        ns: ['translation', 'landing', 'about', 'common', 'blog', 'family', 'coordinator', 'clinical', 'support', 'org', 'auth'],
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
