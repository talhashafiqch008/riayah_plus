import type { ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ROLE,
  ROLE_HERO_COLORS,
  roleCardStyle,
} from '../shell/RoleChrome';

const logo = require('../../assets/images/logo.png') as number;

interface AuthShellProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backLabel?: string;
  children: ReactNode;
}

export function AuthShell({
  kicker = 'Riayah Plus',
  title,
  subtitle,
  showBack,
  backLabel = 'Back',
  children,
}: AuthShellProps) {
  return (
    <View className="flex-1 bg-stone-50">
      <LinearGradient
        colors={[...ROLE_HERO_COLORS]}
        locations={[0, 0.62, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="px-5 pb-14 pt-3">
            {showBack ? (
              <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                className="mb-5 flex-row items-center gap-1 self-start"
                accessibilityRole="button"
                accessibilityLabel={backLabel}
              >
                <Ionicons name="chevron-back" size={20} color={ROLE.white} />
                <Text className="text-sm font-semibold text-white">{backLabel}</Text>
              </Pressable>
            ) : (
              <View className="mb-4 h-6" />
            )}

            <View
              className="mb-4 h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white"
              style={{
                shadowColor: ROLE.stone900,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.16,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              <Image source={logo} style={{ width: 48, height: 48 }} resizeMode="contain" />
            </View>

            <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-teal-100">
              {kicker}
            </Text>
            <Text
              className="mt-2 text-[28px] font-extrabold text-white"
              style={{ letterSpacing: -0.6 }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text className="mt-2 text-sm leading-5 text-teal-50">{subtitle}</Text>
            ) : null}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="-mt-8 flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[roleCardStyle, { padding: 20 }]}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
      <Text className="text-center text-sm text-red-700">{message}</Text>
    </View>
  );
}
