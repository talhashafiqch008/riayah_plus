import { I18nManager, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import i18n, { i18nReady } from '../i18n/config';

export type UiLanguage = 'en' | 'ar';

const STORAGE_KEY = 'ui_language';

export async function persistLocalUiLanguage(lang: UiLanguage): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, lang).catch(() => undefined);
}

export async function readLocalUiLanguage(): Promise<UiLanguage | null> {
  const v = await SecureStore.getItemAsync(STORAGE_KEY).catch(() => null);
  if (v === 'en' || v === 'ar') return v;
  return null;
}

function normalizeLang(code: string | undefined | null): UiLanguage | null {
  if (!code) return null;
  if (code === 'ar' || code.startsWith('ar-')) return 'ar';
  if (code === 'en' || code.startsWith('en-')) return 'en';
  return null;
}

function reloadForRtl(): void {
  if (Platform.OS === 'web') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DevSettings } = require('react-native') as typeof import('react-native');
    DevSettings.reload?.();
  } catch {
    /* ignore */
  }
}

/**
 * Apply RTL/LTR + i18next language for the permanent UI language.
 * Persists locally BEFORE any reload so cold start can restore Arabic.
 *
 * Important: React Native only flips layout for views mounted *after* a restart
 * when `I18nManager.forceRTL` changes. Always reload when the direction flips.
 */
export async function applyUiLanguage(
  lang: UiLanguage,
  options?: { reloadIfRtlChanges?: boolean },
): Promise<void> {
  const wantRtl = lang === 'ar';
  const reloadIfRtlChanges = options?.reloadIfRtlChanges ?? true;

  await i18nReady;
  await persistLocalUiLanguage(lang);
  if (normalizeLang(i18n.language) !== lang) {
    await i18n.changeLanguage(lang);
  }

  if (I18nManager.isRTL === wantRtl) return;

  I18nManager.allowRTL(wantRtl);
  I18nManager.forceRTL(wantRtl);

  if (reloadIfRtlChanges) {
    reloadForRtl();
    // Native reload is async; don't block forever if DevSettings is unavailable.
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

/**
 * Sync i18n (and RTL flags) from stored / account preference without forcing a chooser.
 * Reloads when native RTL does not match the chosen language (fixes Arabic text + LTR layout).
 */
export async function bootstrapUiLanguage(preferred?: UiLanguage | null): Promise<UiLanguage> {
  await i18nReady;
  const lang = preferred ?? (await readLocalUiLanguage()) ?? 'en';
  if (normalizeLang(i18n.language) !== lang) {
    await i18n.changeLanguage(lang);
  }
  await persistLocalUiLanguage(lang);

  const wantRtl = lang === 'ar';
  if (I18nManager.isRTL !== wantRtl) {
    I18nManager.allowRTL(wantRtl);
    I18nManager.forceRTL(wantRtl);
    reloadForRtl();
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return lang;
}

/** Keep i18n in sync with the account language after hydrate/login. */
export async function syncI18nToAccountLanguage(lang: UiLanguage | null | undefined): Promise<void> {
  if (lang !== 'en' && lang !== 'ar') return;
  // Reload when RTL mismatches — otherwise Arabic strings render in an LTR shell until remount.
  await applyUiLanguage(lang, { reloadIfRtlChanges: true });
}
