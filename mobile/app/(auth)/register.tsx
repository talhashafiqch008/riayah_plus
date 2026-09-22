import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../../components/ui';
import { AuthError, AuthShell } from '../../components/auth/AuthShell';
import { ROLE } from '../../components/shell/RoleChrome';
import { apiClient } from '../../lib/api/client';
import { apiErrorMessage } from '../../lib/format';

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  consentAccepted: boolean;
};

export default function RegisterFamilyScreen() {
  const { t } = useTranslation('auth');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const schema = useMemo(
    () =>
      z
        .object({
          firstName: z.string().min(1, { message: t('register.firstNameRequired') }),
          lastName: z.string().min(1, { message: t('register.lastNameRequired') }),
          email: z.string().email({ message: t('register.emailInvalid') }),
          phone: z.string().optional(),
          password: z.string().min(8, { message: t('register.passwordMin') }),
          confirmPassword: z.string().min(8, { message: t('register.confirmRequired') }),
          consentAccepted: z.boolean(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('register.passwordsMismatch'),
          path: ['confirmPassword'],
        })
        .refine((data) => data.consentAccepted === true, {
          message: t('register.consentRequired'),
          path: ['consentAccepted'],
        }),
    [t],
  );

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      consentAccepted: false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/api/register', {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        password: values.password,
        role: 'family',
        consentAccepted: true,
      });
      setSent(true);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, t('register.createFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      kicker={t('register.kicker')}
      title={t('register.title')}
      subtitle={t('register.subtitle')}
      showBack
      backLabel={t('register.backToLogin')}
    >
      {sent ? (
        <View className="items-center py-2">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-teal-50">
            <Ionicons name="mail-outline" size={28} color={ROLE.teal} />
          </View>
          <Text className="text-center text-base font-semibold text-stone-900">
            {t('register.sentTitle')}
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-stone-500">
            {t('register.sentBodyLead')}
            {'\n'}
            <Text className="font-medium text-stone-800">{getValues('email')}</Text>
            {'\n\n'}
            {t('register.sentBodyTail')}
          </Text>
          <View className="mt-6 w-full">
            <Link href="/(auth)/login" asChild replace>
              <Button variant="secondary">{t('register.backToLogin')}</Button>
            </Link>
          </View>
        </View>
      ) : (
        <View className="gap-4">
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('register.firstName')}
                placeholder={t('register.firstNamePlaceholder')}
                autoComplete="given-name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.firstName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('register.lastName')}
                placeholder={t('register.lastNamePlaceholder')}
                autoComplete="family-name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.lastName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('register.email')}
                placeholder={t('register.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
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
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('register.phone')}
                placeholder={t('register.phonePlaceholder')}
                keyboardType="phone-pad"
                autoComplete="tel"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.phone?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('register.password')}
                placeholder={t('register.passwordPlaceholder')}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
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
                      showPassword ? t('register.hidePassword') : t('register.showPassword')
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
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('register.confirmPassword')}
                placeholder={t('register.confirmPasswordPlaceholder')}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="consentAccepted"
            render={({ field: { onChange, value } }) => (
              <Pressable
                onPress={() => onChange(!value)}
                className="flex-row items-start gap-3"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: value }}
              >
                <View
                  className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${
                    value ? 'border-teal-600 bg-teal-600' : 'border-stone-300 bg-white'
                  }`}
                >
                  {value ? <Ionicons name="checkmark" size={14} color={ROLE.white} /> : null}
                </View>
                <Text className="flex-1 text-sm leading-5 text-stone-600">{t('register.consent')}</Text>
              </Pressable>
            )}
          />
          {errors.consentAccepted?.message ? (
            <Text className="text-sm text-red-500">{errors.consentAccepted.message}</Text>
          ) : null}

          <AuthError message={error} />

          <Button isLoading={submitting} onPress={handleSubmit(onSubmit)} size="lg">
            {t('register.submit')}
          </Button>
        </View>
      )}
    </AuthShell>
  );
}
