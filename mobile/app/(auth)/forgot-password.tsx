import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
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
  email: string;
};

export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email({ message: t('forgot.emailInvalid') }),
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
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/api/forgot-password', { email: values.email.trim() });
      setSent(true);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, t('forgot.requestFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      kicker={t('kicker.account')}
      title={t('forgot.title')}
      subtitle={t('forgot.subtitle')}
      showBack
      backLabel={t('forgot.backToLogin')}
    >
      {sent ? (
        <View className="items-center py-2">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-teal-50">
            <Ionicons name="mail-outline" size={28} color={ROLE.teal} />
          </View>
          <Text className="text-center text-base font-semibold text-stone-900">
            {t('forgot.sentTitle')}
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-stone-500">
            {t('forgot.sentBody')}
            {'\n'}
            <Text className="font-medium text-stone-800">{getValues('email')}</Text>
          </Text>
          <View className="mt-6 w-full">
            <Link href="/(auth)/login" asChild replace>
              <Button variant="secondary">{t('forgot.backToLogin')}</Button>
            </Link>
          </View>
        </View>
      ) : (
        <View className="gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('forgot.email')}
                placeholder={t('forgot.emailPlaceholder')}
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

          <AuthError message={error} />

          <Button isLoading={submitting} onPress={handleSubmit(onSubmit)} size="lg">
            {t('forgot.submit')}
          </Button>
        </View>
      )}
    </AuthShell>
  );
}
