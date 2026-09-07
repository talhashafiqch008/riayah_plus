import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';
import { router } from 'expo-router';
import { apiErrorMessage } from '../../lib/format';
import { uploadVoiceRecording } from '../../lib/api/voiceRecordings';

const TEAL = '#0D9488';
const STONE_200 = '#E7E5E4';
const STONE_500 = '#78716C';
const STONE_900 = '#1C1917';
const ROSE = '#E11D48';
const WHITE = '#FFFFFF';

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
};

export function VoiceRecordWidget({ historyHref, compact = false }: Props) {
  const toast = useToast();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      const rec = recordingRef.current;
      recordingRef.current = null;
      if (rec) {
        void rec.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, [clearTimer]);

  const startRecording = async () => {
    if (isRecording || uploading) return;
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        toast.show('Microphone permission is required to record.', { type: 'danger' });
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
      toast.show(apiErrorMessage(e, 'Could not start recording'), { type: 'danger' });
      setIsRecording(false);
    }
  };

  const stopAndSave = async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;
    clearTimer();
    setIsRecording(false);
    setUploading(true);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      if (!uri) throw new Error('No audio file was produced.');

      const status = await recording.getStatusAsync();
      const durationSeconds =
        status.isLoaded && typeof status.durationMillis === 'number'
          ? Math.round(status.durationMillis / 1000)
          : elapsedRef.current;

      const { mimeType, ext } = mimeFromUri(uri);
      await uploadVoiceRecording({
        uri,
        fileName: `voice-${Date.now()}.${ext}`,
        mimeType,
        durationSeconds,
      });
      toast.show('Voice recording saved', { type: 'success' });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, 'Failed to save recording'), { type: 'danger' });
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
      if (recording) await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {
      /* ignore */
    }
  };

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
          <Text style={{ fontSize: 15, fontWeight: '700', color: STONE_900 }}>Voice note</Text>
          <Text style={{ marginTop: 2, fontSize: 12, color: STONE_500 }}>
            {uploading
              ? 'Saving…'
              : isRecording
                ? `Recording ${formatDuration(elapsed)}`
                : 'Tap to record — title and notes are optional later'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open voice history"
          onPress={() => router.push(historyHref as never)}
          hitSlop={8}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: '#F0FDFA',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: TEAL }}>History</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {!isRecording ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start voice recording"
            disabled={uploading}
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
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <>
                <Ionicons name="mic" size={18} color={WHITE} />
                <Text style={{ color: WHITE, fontWeight: '700', fontSize: 14 }}>Record now</Text>
              </>
            )}
          </Pressable>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stop and save recording"
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
                Stop & save · {formatDuration(elapsed)}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel recording"
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
