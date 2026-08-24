import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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

const schema = z
  .object({
    firstName: z.string().min(1, 'Enter your first name'),
    lastName: z.string().min(1, 'Enter your last name'),
    email: z.string().email('Enter a valid email'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
    consentAccepted: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.consentAccepted === true, {
    message: 'You must accept the terms to register',
    path: ['consentAccepted'],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterFamilyScreen() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      setError(apiErrorMessage(e, 'Could not create the account.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      kicker="Family"
      title="Create a family account"
      subtitle="Register to request care. An organization will be assigned before you can sign in."
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
            We created an account for{'\n'}
            <Text className="font-medium text-stone-800">{getValues('email')}</Text>
            {'\n\n'}Verify your email, then wait for an organization to assign you before signing in.
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
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="First name"
                placeholder="Sara"
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
                label="Last name"
                placeholder="Hamad"
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
                label="Email"
                placeholder="name@example.com"
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
                label="Phone (optional)"
                placeholder="+974 …"
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
                label="Password"
                placeholder="At least 8 characters"
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
                label="Confirm password"
                placeholder="Repeat password"
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
                <Text className="flex-1 text-sm leading-5 text-stone-600">
                  I accept the terms of service and privacy notice for this family account.
                </Text>
              </Pressable>
            )}
          />
          {errors.consentAccepted?.message ? (
            <Text className="text-sm text-red-500">{errors.consentAccepted.message}</Text>
          ) : null}

          <AuthError message={error} />

          <Button isLoading={submitting} onPress={handleSubmit(onSubmit)} size="lg">
            Create family account
          </Button>
        </View>
      )}
    </AuthShell>
  );
}
