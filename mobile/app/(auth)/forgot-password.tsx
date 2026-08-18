import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../components/ui';
import { apiClient } from '../../lib/api/client';
import { apiErrorMessage } from '../../lib/format';

const logo = require('../../assets/images/logo.png') as number;

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
    <LinearGradient
      colors={['#F0FDFA', '#FFFFFF', '#EFF6FF']}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="mb-6 flex-row items-center gap-1 self-start"
          >
            <Ionicons name="chevron-back" size={20} color="#0D9488" />
            <Text className="text-sm font-medium text-teal-600">Back to sign in</Text>
          </Pressable>

          {/* Logo + branding */}
          <View className="mb-8 items-center">
            <View
              style={{
                shadowColor: '#0D9488',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Image
                source={logo}
                style={{ width: 64, height: 64, borderRadius: 18 }}
                resizeMode="contain"
              />
            </View>
            <Text className="mt-4 text-2xl font-semibold text-stone-900">Forgot password?</Text>
            <Text className="mt-1 text-center text-sm text-stone-500">
              Enter your email and we'll send a reset link if an account exists.
            </Text>
          </View>

          {/* Card */}
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.92)',
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: 'rgba(231,229,228,0.6)',
              shadowColor: '#1C1917',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.08,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            {sent ? (
              /* Success state */
              <View className="items-center py-4">
                <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-teal-50">
                  <Ionicons name="mail-outline" size={28} color="#0D9488" />
                </View>
                <Text className="text-center text-base font-semibold text-stone-900">
                  Check your email
                </Text>
                <Text className="mt-2 text-center text-sm text-stone-500">
                  We sent a reset link to{'\n'}
                  <Text className="font-medium text-stone-700">{getValues('email')}</Text>
                </Text>
                <View className="mt-6 w-full">
                  <Link href="/(auth)/login" asChild replace>
                    <Button variant="secondary">Back to sign in</Button>
                  </Link>
                </View>
              </View>
            ) : (
              /* Form state */
              <View className="gap-4">
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Email Address"
                      placeholder="name@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.email?.message}
                    />
                  )}
                />

                {error ? (
                  <View className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                    <Text className="text-center text-sm text-red-700">{error}</Text>
                  </View>
                ) : null}

                <View
                  style={{
                    shadowColor: '#0D9488',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Button isLoading={submitting} onPress={handleSubmit(onSubmit)} size="lg">
                    Send reset link
                  </Button>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
