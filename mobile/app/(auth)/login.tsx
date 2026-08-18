import { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { apiErrorMessage } from '../../lib/format';

const logo = require('../../assets/images/logo.png') as number;

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const rememberBiometricEmail = useAuthStore((s) => s.rememberBiometricEmail);
  const getBiometricEmail = useAuthStore((s) => s.getBiometricEmail);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEmail, setBioEmail] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    void (async () => {
      const [hasHardware, enrolled, storedEmail] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        getBiometricEmail(),
      ]);
      setBioAvailable(hasHardware && enrolled);
      setBioEmail(storedEmail);
      if (storedEmail) setValue('email', storedEmail);
    })();
  }, [getBiometricEmail, setValue]);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
      await rememberBiometricEmail(values.email.trim());
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Sign in failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const onBiometric = async () => {
    if (!bioEmail) {
      setError('Sign in with email once to enable biometrics.');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to Riayah Plus',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    if (!result.success) return;
    setValue('email', bioEmail);
    setError('Enter your password to finish biometric sign-in.');
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
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 52, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + branding */}
          <View className="mb-5 items-center">
            <Image
              source={logo}
              style={{ width: SCREEN_WIDTH - 100, height: 90 }}
              resizeMode="contain"
            />
            <Text className="mt-3 text-2xl font-semibold text-stone-900">
              Welcome to Riayah Plus
            </Text>
            <Text className="mt-1 text-sm text-stone-500">
              Sign in to manage your care
            </Text>
          </View>

          {/* Form card — matches web's white card with shadow + ring */}
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

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Password"
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    rightIcon={
                      <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color="#A8A29E"
                        />
                      </Pressable>
                    }
                  />
                )}
              />

              {/* Remember me + Forgot password row */}
              <View className="flex-row items-center justify-end">
                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable hitSlop={8}>
                    <Text className="text-sm font-semibold text-teal-600">Forgot password?</Text>
                  </Pressable>
                </Link>
              </View>

              {/* Error message */}
              {error ? (
                <View className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <Text className="text-center text-sm text-red-700">{error}</Text>
                </View>
              ) : null}

              {/* Sign In button — teal with shadow matching web's shadow-lg shadow-teal-200 */}
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
                  Sign In
                </Button>
              </View>
            </View>

            {/* Divider */}
            {bioAvailable ? (
              <>
                <View className="my-5 flex-row items-center gap-3">
                  <View className="flex-1 border-t border-stone-200" />
                  <Text className="text-sm text-stone-400">or</Text>
                  <View className="flex-1 border-t border-stone-200" />
                </View>

                {/* Biometric button */}
                <Pressable
                  onPress={() => void onBiometric()}
                  className="flex-row items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 py-3.5"
                >
                  <Ionicons
                    name={Platform.OS === 'ios' ? 'scan-outline' : 'finger-print'}
                    size={20}
                    color="#0D9488"
                  />
                  <Text className="text-sm font-semibold text-stone-700">
                    {Platform.OS === 'ios' ? 'Sign in with Face ID' : 'Sign in with Biometrics'}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
