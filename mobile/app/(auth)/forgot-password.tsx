import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../components/ui';
import { AuthError, AuthShell } from '../../components/auth/AuthShell';
import { ROLE } from '../../components/shell/RoleChrome';
import { apiClient } from '../../lib/api/client';
import { apiErrorMessage } from '../../lib/format';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setError(apiErrorMessage(e, 'Request failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      kicker="Account"
      title="Forgot password?"
      subtitle="Enter your email and we’ll send a reset link if an account exists."
      showBack
      backLabel="Back to sign in"
    >
      {sent ? (
        <View className="items-center py-2">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-teal-50">
            <Ionicons name="mail-outline" size={28} color={ROLE.teal} />
          </View>
          <Text className="text-center text-base font-semibold text-stone-900">Check your email</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-stone-500">
            We sent a reset link to{'\n'}
            <Text className="font-medium text-stone-800">{getValues('email')}</Text>
          </Text>
          <View className="mt-6 w-full">
            <Link href="/(auth)/login" asChild replace>
              <Button variant="secondary">Back to sign in</Button>
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
                label="Email"
                placeholder="name@example.com"
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
            Send reset link
          </Button>
        </View>
      )}
    </AuthShell>
  );
}
