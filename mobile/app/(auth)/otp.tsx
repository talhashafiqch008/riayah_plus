import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui';
import { AuthError, AuthShell } from '../../components/auth/AuthShell';
import { ROLE } from '../../components/shell/RoleChrome';
import { apiClient, setApiAuthToken } from '../../lib/api/client';
import { useAuthStore, routeByRole, type AuthUser } from '../../stores/authStore';
import { apiErrorMessage } from '../../lib/format';

const CELL_COUNT = 6;

export default function OtpScreen() {
  const { t } = useTranslation('auth');
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
      setError(t('otp.enter6Digit'));
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
          organizationName: data.user.organization?.name ?? null,
          careUnitId: data.user.careUnitId ?? null,
          avatarUrl: data.user.avatar ?? null,
        };
        setUser(user);
        routeByRole(user);
        return;
      }
      router.replace('/(auth)/login');
    } catch (e: unknown) {
      setError(apiErrorMessage(e, t('otp.verifyFailed')));
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
      setError(apiErrorMessage(e, t('otp.resendFailed')));
    }
  };

  return (
    <AuthShell
      kicker={t('otp.kicker')}
      title={t('otp.title')}
      subtitle={t('otp.subtitle', { email: email || t('otp.subtitleFallback') })}
      showBack
      backLabel={t('otp.back')}
    >
      <View className="flex-row justify-between gap-2">
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={d}
            onChangeText={(v) => onChangeDigit(i, v)}
            onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            accessibilityLabel={t('otp.digitLabel', { n: i + 1 })}
            style={{
              flex: 1,
              height: 54,
              borderRadius: 14,
              borderWidth: d ? 2 : 1,
              borderColor: d ? ROLE.teal : ROLE.stone200,
              backgroundColor: d ? ROLE.teal50 : ROLE.white,
              textAlign: 'center',
              fontSize: 22,
              fontWeight: '700',
              color: ROLE.stone900,
            }}
          />
        ))}
      </View>

      <View className="mt-5">
        <AuthError message={error} />
      </View>

      <View className="mt-5">
        <Button isLoading={submitting} onPress={() => void verify()} size="lg">
          {t('otp.verify')}
        </Button>
      </View>

      <Pressable
        className="mt-4 items-center py-2"
        disabled={seconds > 0}
        onPress={() => void resend()}
        accessibilityRole="button"
      >
        {seconds > 0 ? (
          <Text className="text-sm text-stone-400">
            {t('otp.resendIn', { seconds })}
          </Text>
        ) : (
          <Text className="text-sm font-semibold text-teal-700">{t('otp.resend')}</Text>
        )}
      </Pressable>
    </AuthShell>
  );
}
