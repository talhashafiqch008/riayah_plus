import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { apiErrorMessage } from '../../lib/format';
import {
  listVoiceRecordingPatients,
  uploadVoiceRecording,
  type VoiceRecordingPatient,
} from '../../lib/api/voiceRecordings';
import { deleteTempFile } from '../../lib/sessionCleanup';

const TEAL = '#0D9488';
const STONE_200 = '#E7E5E4';
const STONE_500 = '#78716C';
const STONE_900 = '#1C1917';
const ROSE = '#E11D48';
const WHITE = '#FFFFFF';
const AMBER = '#B45309';

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function mimeFromUri(uri: string): { mimeType: string; ext: string } {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.webm')) return { mimeType: 'audio/webm', ext: 'webm' };
  if (lower.endsWith('.wav')) return { mimeType: 'audio/wav', ext: 'wav' };
  if (lower.endsWith('.3gp') || lower.endsWith('.3gpp')) return { mimeType: 'audio/3gpp', ext: '3gp' };
  if (lower.endsWith('.mp3')) return { mimeType: 'audio/mpeg', ext: 'mp3' };
  return { mimeType: 'audio/mp4', ext: 'm4a' };
}

type Props = {
  historyHref: string;
  compact?: boolean;
  i18nNs?: 'clinical' | 'family' | 'coordinator';
};

export function VoiceRecordWidget({
  historyHref,
  compact = false,
  i18nNs = 'clinical',
}: Props) {
  const { t } = useTranslation(i18nNs);
  const toast = useToast();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const selectedRef = useRef<VoiceRecordingPatient | null>(null);

  const [patients, setPatients] = useState<VoiceRecordingPatient[]>([]);
  const [selectedPatientKey, setSelectedPatientKey] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const selectedPatient = patients.find((p) => p.id === selectedPatientKey) ?? null;
  selectedRef.current = selectedPatient;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listVoiceRecordingPatients();
        if (cancelled) return;
        setPatients(rows);
        setSelectedPatientKey(rows[0]?.id ?? '');
      } catch (e: unknown) {
        if (!cancelled) {
          toast.show(apiErrorMessage(e, t('voice.toasts.loadPatientsFailed')), { type: 'danger' });
        }
      } finally {
        if (!cancelled) setLoadingPatients(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimer();
      const rec = recordingRef.current;
      recordingRef.current = null;
      if (rec) {
        void rec.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, [clearTimer, t, toast]);

  const startRecording = async () => {
    if (isRecording || uploading) return;
    if (!selectedRef.current) {
      toast.show(t('voice.toasts.choosePatient'), { type: 'danger' });
      return;
    }
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        toast.show(t('voice.toasts.micRequired'), { type: 'danger' });
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setElapsed(0);
      elapsedRef.current = 0;
      clearTimer();
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, t('voice.toasts.startFailed')), { type: 'danger' });
      setIsRecording(false);
    }
  };

  const stopAndSave = async () => {
    const recording = recordingRef.current;
    const patient = selectedRef.current;
    if (!recording) return;
    recordingRef.current = null;
    clearTimer();
    setIsRecording(false);
    setUploading(true);

    try {
      if (!patient) throw new Error(t('voice.toasts.choosePatient'));
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      if (!uri) throw new Error(t('voice.toasts.noAudio'));

      const status = await recording.getStatusAsync();
      const durationMs =
        'durationMillis' in status && typeof status.durationMillis === 'number'
          ? status.durationMillis
          : null;
      const durationSeconds =
        durationMs != null ? Math.round(durationMs / 1000) : elapsedRef.current;

      const { mimeType, ext } = mimeFromUri(uri);
      await uploadVoiceRecording({
        uri,
        fileName: `voice-${Date.now()}.${ext}`,
        mimeType,
        durationSeconds,
        patientId: patient.patientId,
        careRecipientId: patient.careRecipientId,
        episodeId: patient.episodeId,
      });
      await deleteTempFile(uri);
      toast.show(t('voice.toasts.saved'), { type: 'success' });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, t('voice.toasts.saveFailed')), { type: 'danger' });
    } finally {
      setUploading(false);
      setElapsed(0);
      elapsedRef.current = 0;
    }
  };

  const cancelRecording = async () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    clearTimer();
    setIsRecording(false);
    setElapsed(0);
    elapsedRef.current = 0;
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        await deleteTempFile(recording.getURI());
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {
      /* ignore */
    }
  };

  const canRecord = Boolean(selectedPatient) && !loadingPatients;
  const elapsedLabel = formatDuration(elapsed);

  return (
    <View
      style={{
        backgroundColor: WHITE,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: STONE_200,
        padding: compact ? 14 : 16,
        shadowColor: STONE_900,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: STONE_900 }}>
            {t('voice.widgetTitle')}
          </Text>
          <Text style={{ marginTop: 2, fontSize: 12, color: STONE_500 }}>
            {uploading
              ? t('voice.saving')
              : isRecording
                ? t('voice.recordingElapsed', { time: elapsedLabel })
                : t('voice.chooseThenRecord')}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('voice.openHistory')}
          onPress={() => router.push(historyHref as never)}
          hitSlop={8}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: '#F0FDFA',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: TEAL }}>{t('voice.history')}</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 12, maxHeight: 140, opacity: isRecording || uploading ? 0.6 : 1 }}>
        {loadingPatients ? (
          <ActivityIndicator color={TEAL} style={{ paddingVertical: 12 }} />
        ) : patients.length === 0 ? (
          <Text style={{ fontSize: 12, color: AMBER }}>{t('voice.patientHint')}</Text>
        ) : (
          <ScrollView nestedScrollEnabled>
            {patients.map((p) => {
              const selected = p.id === selectedPatientKey;
              return (
                <Pressable
                  key={p.id}
                  disabled={isRecording || uploading}
                  onPress={() => setSelectedPatientKey(p.id)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    marginBottom: 6,
                    borderWidth: 1,
                    borderColor: selected ? TEAL : STONE_200,
                    backgroundColor: selected ? '#F0FDFA' : WHITE,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: STONE_900 }}>{p.name}</Text>
                  <Text style={{ marginTop: 2, fontSize: 11, color: STONE_500 }} numberOfLines={1}>
                    {p.episodeTitle}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {!isRecording ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('voice.startAria')}
            disabled={uploading || !canRecord}
            onPress={() => void startRecording()}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: TEAL,
              borderRadius: 12,
              paddingVertical: 12,
              opacity: uploading || !canRecord ? 0.6 : 1,
            }}
          >
            {uploading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <>
                <Ionicons name="mic" size={18} color={WHITE} />
                <Text style={{ color: WHITE, fontWeight: '700', fontSize: 14 }}>
                  {t('voice.recordNow')}
                </Text>
              </>
            )}
          </Pressable>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('voice.stopAria')}
              onPress={() => void stopAndSave()}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: ROSE,
                borderRadius: 12,
                paddingVertical: 12,
              }}
            >
              <Ionicons name="stop" size={18} color={WHITE} />
              <Text style={{ color: WHITE, fontWeight: '700', fontSize: 14 }}>
                {t('voice.stopSaveElapsed', { time: elapsedLabel })}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('voice.cancelAria')}
              onPress={() => void cancelRecording()}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: STONE_200,
              }}
            >
              <Ionicons name="close" size={18} color={STONE_500} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
