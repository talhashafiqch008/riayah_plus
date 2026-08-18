import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import { apiClient, setApiAuthToken } from '../../lib/api/client';
import { useAuthStore, routeByRole, type AuthUser } from '../../stores/authStore';
import { apiErrorMessage } from '../../lib/format';

const logo = require('../../assets/images/logo.png') as number;

const CELL_COUNT = 6;

export default function OtpScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const setUser = useAuthStore((s) => s.setUser);
  const [digits, setDigits] = useState<string[]>(Array(CELL_COUNT).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const inputs = useRef<(TextInput | null)[]>([]);

  const code = useMemo(() => digits.join(''), [digits]);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  const onChangeDigit = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < CELL_COUNT - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const onKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verify = async () => {
    if (code.length !== CELL_COUNT) {
      setError('Enter the 6-digit code.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/api/auth/otp-verify', { email, otp: code });
      const jwt: string | undefined = data.token ?? data.accessToken;
      if (jwt && data.user) {
        await SecureStore.setItemAsync('auth_token', jwt);
        setApiAuthToken(jwt);
        const user: AuthUser = {
          id: String(data.user.id),
          name: data.user.name ?? data.user.email,
          email: data.user.email,
          role: data.user.role,
          organizationId: data.user.organizationId ?? null,
          careUnitId: data.user.careUnitId ?? null,
          avatarUrl: data.user.avatar ?? null,
        };
        setUser(user);
        routeByRole(user);
        return;
      }
      router.replace('/(auth)/login');
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Verification failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (seconds > 0) return;
    try {
      await apiClient.post('/api/otp/send', { email, type: 'email' });
      setSeconds(60);
      setDigits(Array(CELL_COUNT).fill(''));
      setError(null);
      inputs.current[0]?.focus();
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not resend code.'));
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
          {/* Back */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="mb-6 flex-row items-center gap-1 self-start"
          >
            <Ionicons name="chevron-back" size={20} color="#0D9488" />
            <Text className="text-sm font-medium text-teal-600">Back</Text>
          </Pressable>

          {/* Logo + heading */}
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
            <Text className="mt-4 text-2xl font-semibold text-stone-900">Check your email</Text>
            <Text className="mt-1 text-center text-sm text-stone-500">
              We sent a 6-digit code to{'\n'}
              <Text className="font-medium text-stone-700">{email || 'your email'}</Text>
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
            {/* OTP cells */}
            <View className="flex-row justify-between gap-2">
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  value={d}
                  onChangeText={(v) => onChangeDigit(i, v)}
                  onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 12,
                    borderWidth: d ? 2 : 1,
                    borderColor: d ? '#0D9488' : '#D6D3D1',
                    backgroundColor: d ? '#F0FDFA' : '#FFFFFF',
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: '700',
                    color: '#1C1917',
                  }}
                />
              ))}
            </View>

            {error ? (
              <View className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                <Text className="text-center text-sm text-red-700">{error}</Text>
              </View>
            ) : null}

            <View
              className="mt-5"
              style={{
                shadowColor: '#0D9488',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Button isLoading={submitting} onPress={() => void verify()} size="lg">
                Verify code
              </Button>
            </View>

            {/* Resend */}
            <Pressable
              className="mt-4 items-center py-2"
              disabled={seconds > 0}
              onPress={() => void resend()}
            >
              {seconds > 0 ? (
                <Text className="text-sm text-stone-400">
                  Resend code in{' '}
                  <Text className="font-semibold text-stone-600">{seconds}s</Text>
                </Text>
              ) : (
                <Text className="text-sm font-semibold text-teal-600">Resend code</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
