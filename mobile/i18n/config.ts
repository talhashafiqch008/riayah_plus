import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * Shared with web via symlinks: mern/mobile/locales → mern/client/src/locales.
 * Metro cannot resolve imports that escape the mobile project root.
 */
import enFamily from '../locales/en/family.json';
import arFamily from '../locales/ar/family.json';
import enClinical from '../locales/en/clinical.json';
import arClinical from '../locales/ar/clinical.json';
import enSupport from '../locales/en/support.json';
import arSupport from '../locales/ar/support.json';
import enCoordinator from '../locales/en/coordinator.json';
import arCoordinator from '../locales/ar/coordinator.json';
import enOrg from '../locales/en/org.json';
import arOrg from '../locales/ar/org.json';
import enCommon from '../locales/en/common.json';
import arCommon from '../locales/ar/common.json';
import enAuth from '../locales/en/auth.json';
import arAuth from '../locales/ar/auth.json';

/** Await before changing language — init is async and would otherwise overwrite lng. */
export const i18nReady = i18n.use(initReactI18next).init({
  resources: {
    en: {
      family: enFamily,
      clinical: enClinical,
      support: enSupport,
      coordinator: enCoordinator,
      org: enOrg,
      common: enCommon,
      auth: enAuth,
    },
    ar: {
      family: arFamily,
      clinical: arClinical,
      support: arSupport,
      coordinator: arCoordinator,
      org: arOrg,
      common: arCommon,
      auth: arAuth,
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'family',
  ns: ['family', 'clinical', 'support', 'coordinator', 'org', 'common', 'auth'],
  compatibilityJSON: 'v4',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
