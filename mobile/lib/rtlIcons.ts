import { I18nManager } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

/** Directional chevrons that flip under RTL (Ionicons do not auto-mirror). */
export function navForwardIcon(): IconName {
  return I18nManager.isRTL ? 'chevron-back' : 'chevron-forward';
}

export function navBackIcon(): IconName {
  return I18nManager.isRTL ? 'chevron-forward' : 'chevron-back';
}

export function navArrowForwardIcon(): IconName {
  return I18nManager.isRTL ? 'arrow-back' : 'arrow-forward';
}
