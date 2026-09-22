import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { navBackIcon } from '../../lib/rtlIcons';

/** Website tokens from mern/client/src/index.css */
export const FAMILY = {
  teal: '#0D9488',
  tealDark: '#0F766E',
  tealLight: '#14B8A6',
  teal50: '#F0FDFA',
  stone50: '#FAFAF9',
  stone100: '#F5F5F4',
  stone200: '#E7E5E4',
  stone400: '#A8A29E',
  stone500: '#78716C',
  stone900: '#1C1917',
  amber: '#F59E0B',
  amber50: '#FFFBEB',
  white: '#FFFFFF',
} as const;

export const FAMILY_HERO_COLORS = [FAMILY.tealDark, FAMILY.teal, FAMILY.tealLight] as const;

export const familyCardStyle = {
  backgroundColor: FAMILY.white,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: FAMILY.stone200,
  shadowColor: FAMILY.stone900,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
} as const;

export const familyPressSpring = { mass: 0.5, stiffness: 400, damping: 20 } as const;
export const familyReleaseSpring = { mass: 0.5, stiffness: 250, damping: 18 } as const;

export function FamilyTabHero({
  title,
  subtitle,
  right,
  showBack,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  showBack?: boolean;
}) {
  const { t } = useTranslation('common');
  return (
    <LinearGradient
      colors={[...FAMILY_HERO_COLORS]}
      locations={[0, 0.62, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, overflow: 'hidden' }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -40,
          top: -28,
          height: 140,
          width: 140,
          borderRadius: 70,
          backgroundColor: 'rgba(255,255,255,0.12)',
        }}
      />
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('a11y.back')}
              onPress={() => router.back()}
              hitSlop={12}
              className="mb-3 h-[38px] w-[38px] items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
            >
              <Ionicons name={navBackIcon()} size={22} color={FAMILY.white} />
            </Pressable>
          ) : null}
          <Text
            className="text-[22px] font-extrabold text-white"
            style={{ letterSpacing: -0.8 }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-[13px] leading-5 text-white/70">{subtitle}</Text>
          ) : null}
        </View>
        {right}
      </View>
    </LinearGradient>
  );
}

export function FamilySectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="mb-3 text-[10px] font-bold uppercase tracking-[2.5px] text-stone-400">
      {children}
    </Text>
  );
}
