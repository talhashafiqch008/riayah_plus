import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../../components/ui';
import { AuthError, AuthShell } from '../../components/auth/AuthShell';
import { ROLE, useRolePressScale } from '../../components/shell/RoleChrome';
import { useAuthStore } from '../../stores/authStore';
import { apiErrorMessage } from '../../lib/format';

type FormValues = {
  email: string;
  password: string;
};

export default function LoginScreen() {
  const { t } = useTranslation('auth');
  const login = useAuthStore((s) => s.login);
  const rememberBiometricEmail = useAuthStore((s) => s.rememberBiometricEmail);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const registerPress = useRolePressScale();

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email({ message: t('login.emailInvalid') }),
        password: z.string().min(6, { message: t('login.passwordMin') }),
      }),
    [t],
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
      await rememberBiometricEmail(values.email.trim());
    } catch (e: unknown) {
      setError(apiErrorMessage(e, t('login.signInFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      kicker={t('kicker.carePlatform')}
      title={t('login.title')}
      subtitle={t('login.subtitle')}
    >
      <View className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('login.email')}
              placeholder={t('login.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('login.password')}
              placeholder={t('login.passwordPlaceholder')}
              secureTextEntry={!showPassword}
              autoComplete="password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              rightIcon={
                <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? t('login.hidePassword') : t('login.showPassword')
                  }
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={ROLE.stone400}
                  />
                </Pressable>
              }
            />
          )}
        />

        <View className="flex-row items-center justify-end">
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable hitSlop={8} accessibilityRole="button">
              <Text className="text-sm font-semibold text-teal-700">{t('login.forgotPassword')}</Text>
            </Pressable>
          </Link>
        </View>

        <AuthError message={error} />

        <Button isLoading={submitting} onPress={handleSubmit(onSubmit)} size="lg">
          {t('login.signIn')}
        </Button>
      </View>

      <View className="my-5 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-stone-200" />
        <Text className="text-xs font-medium uppercase tracking-widest text-stone-400">
          {t('login.or')}
        </Text>
        <View className="h-px flex-1 bg-stone-200" />
      </View>

      <Animated.View style={registerPress.style}>
        <Link href="/(auth)/register" asChild>
          <Pressable
            onPressIn={registerPress.onPressIn}
            onPressOut={registerPress.onPressOut}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-teal-600 bg-white py-3.5"
            accessibilityRole="button"
          >
            <Ionicons name="people-outline" size={20} color={ROLE.teal} />
            <Text className="text-sm font-semibold text-teal-800">{t('login.registerFamily')}</Text>
          </Pressable>
        </Link>
      </Animated.View>
    </AuthShell>
  );
}
