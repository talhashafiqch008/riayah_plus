import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../lib/api/client';
import { applyUiLanguage } from '../lib/uiLanguage';

type UiLang = 'en' | 'ar';

/**
 * Forced permanent language chooser when `user.uiLanguage` is unset.
 */
export function LanguagePreferenceGate() {
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);
  const [saving, setSaving] = useState<UiLang | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needsChoice =
    !!token && !!user && user.uiLanguage !== 'en' && user.uiLanguage !== 'ar' && !isLoading;

  if (!needsChoice) return null;

  const choose = async (language: UiLang) => {
    if (saving) return;
    setSaving(language);
    setError(null);
    try {
      await apiClient.put('/api/me/language', { language });
      // Persist + changeLanguage BEFORE any RTL reload so Arabic survives restart.
      setUser({ ...user, uiLanguage: language });
      await applyUiLanguage(language, { reloadIfRtlChanges: true });
    } catch {
      setError(t('languageGate.error'));
      setSaving(null);
    }
  };

  return (
    <Modal visible animationType="fade" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(28,25,23,0.6)',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 24,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0D9488', letterSpacing: 1 }}>
            {t('languageGate.eyebrow')}
          </Text>
          <Text style={{ marginTop: 8, fontSize: 22, fontWeight: '700', color: '#1C1917' }}>
            {t('languageGate.title')}
          </Text>
          <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: '#57534E' }}>
            {t('languageGate.body')}
          </Text>
          <Text
            style={{
              marginTop: 12,
              backgroundColor: '#FFFBEB',
              color: '#92400E',
              fontSize: 12,
              fontWeight: '600',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {t('languageGate.permanent')}
          </Text>

          <Pressable
            disabled={!!saving}
            onPress={() => void choose('en')}
            style={{
              marginTop: 20,
              borderWidth: 2,
              borderColor: '#E7E5E4',
              borderRadius: 14,
              padding: 16,
              opacity: saving && saving !== 'en' ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1C1917' }}>
              {t('language.en')}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: '#78716C' }}>
              {t('languageGate.enHint')}
            </Text>
          </Pressable>

          <Pressable
            disabled={!!saving}
            onPress={() => void choose('ar')}
            style={{
              marginTop: 12,
              borderWidth: 2,
              borderColor: '#E7E5E4',
              borderRadius: 14,
              padding: 16,
              opacity: saving && saving !== 'ar' ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1C1917', textAlign: 'right' }}>
              {t('language.ar')}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: '#78716C', textAlign: 'right' }}>
              {t('languageGate.arHint')}
            </Text>
          </Pressable>

          {error ? (
            <Text style={{ marginTop: 14, color: '#DC2626', fontSize: 13 }}>{error}</Text>
          ) : null}
          {saving ? (
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <ActivityIndicator color="#0D9488" />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
