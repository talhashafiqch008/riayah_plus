import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useToast } from 'react-native-toast-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { EmptyState, StatusBadge } from '../ui';
import { FAMILY, FamilyTabHero } from '../family/FamilyChrome';
import { ROLE, RoleTabHero } from '../shell/RoleChrome';
import { apiErrorMessage, formatDate } from '../../lib/format';
import {
  deleteVoiceRecording,
  getVoiceRecordingPlayback,
  listVoiceRecordingPatients,
  listVoiceRecordings,
  uploadVoiceRecording,
  type VoiceRecording,
  type VoiceRecordingPatient,
} from '../../lib/api/voiceRecordings';
import { deleteTempFile } from '../../lib/sessionCleanup';
import { AppSwitcherPrivacyOverlay, useScreenProtection } from '../../hooks/useScreenProtection';

function formatDuration(seconds?: number | null): string {
  const total = Math.max(0, Math.round(seconds ?? 0));
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
  subtitle?: string;
  i18nNs?: 'family' | 'clinical' | 'coordinator';
  tone?: 'family' | 'role';
};

export function VoiceRecordingsScreen({
  subtitle,
  i18nNs = 'clinical',
  tone = 'family',
}: Props) {
  useScreenProtection(true);
  const { t } = useTranslation(i18nNs);
  const toast = useToast();
  const heroSubtitle = subtitle ?? t('mobile.detail.voiceRecordHint');
  const Hero = tone === 'role' ? RoleTabHero : FamilyTabHero;
  const chrome = tone === 'role' ? ROLE : FAMILY;
  const [rows, setRows] = useState<VoiceRecording[]>([]);
  const [patients, setPatients] = useState<VoiceRecordingPatient[]>([]);
  const [selectedPatientKey, setSelectedPatientKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const selectedRef = useRef<VoiceRecordingPatient | null>(null);

  const selectedPatient = patients.find((p) => p.id === selectedPatientKey) ?? null;
  selectedRef.current = selectedPatient;

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const load = useCallback(async () => {
    try {
      const [recordingRows, patientRows] = await Promise.all([
        listVoiceRecordings(),
        listVoiceRecordingPatients(),
      ]);
      setRows(recordingRows);
      setPatients(patientRows);
      setSelectedPatientKey((prev) =>
        prev && patientRows.some((p) => p.id === prev) ? prev : patientRows[0]?.id ?? '',
      );
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, t('voice.toasts.loadFailed')), { type: 'danger' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void load();
    return () => {
      clearTimer();
      void recordingRef.current?.stopAndUnloadAsync().catch(() => undefined);
      void soundRef.current?.unloadAsync().catch(() => undefined);
    };
  }, [load]);

  const startRecording = async () => {
    if (isRecording || uploading) return;
    if (!selectedRef.current) {
      toast.show(t('voice.toasts.choosePatient'), { type: 'danger' });
      return;
    }
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        toast.show(t('mobile.detail.micPermissionRequired'), { type: 'danger' });
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
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
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, t('mobile.detail.couldNotStartRecording')), { type: 'danger' });
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
      if (!uri) throw new Error(t('mobile.detail.noAudioFile'));
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
        title: titleDraft.trim() || undefined,
        notes: notesDraft.trim() || undefined,
        durationSeconds,
        patientId: patient.patientId,
        careRecipientId: patient.careRecipientId,
        episodeId: patient.episodeId,
      });
      await deleteTempFile(uri);
      setTitleDraft('');
      setNotesDraft('');
      toast.show(t('voice.toasts.saved'), { type: 'success' });
      await load();
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

  const playRecording = async (id: string) => {
    try {
      setBusyId(id);
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { url } = await getVoiceRecordingPlayback(id);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      soundRef.current = sound;
      setPlayingId(id);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) setPlayingId(null);
      });
      await sound.playAsync();
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, t('voice.toasts.playbackFailed')), { type: 'danger' });
      setPlayingId(null);
    } finally {
      setBusyId(null);
    }
  };

  const removeRecording = async (id: string) => {
    try {
      setBusyId(id);
      if (playingId === id && soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlayingId(null);
      }
      await deleteVoiceRecording(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
      toast.show(t('voice.toasts.deleted'), { type: 'success' });
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, t('voice.toasts.deleteFailed')), { type: 'danger' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: chrome.stone50 }} edges={['top']}>
      <AppSwitcherPrivacyOverlay />
      <Hero title={t('voice.title')} subtitle={heroSubtitle} showBack />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={chrome.teal}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <View
              style={{
                backgroundColor: FAMILY.white,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: FAMILY.stone200,
                padding: 14,
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: FAMILY.stone500 }}>
                {t('mobile.detail.patientRequired')}
              </Text>
              {patients.length === 0 ? (
                <Text style={{ fontSize: 12, color: '#B45309' }}>{t('voice.patientHint')}</Text>
              ) : (
                patients.map((p) => {
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
                        borderWidth: 1,
                        borderColor: selected ? FAMILY.teal : FAMILY.stone200,
                        backgroundColor: selected ? '#F0FDFA' : FAMILY.white,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: FAMILY.stone900 }}>
                        {p.name}
                      </Text>
                      <Text style={{ marginTop: 2, fontSize: 11, color: FAMILY.stone500 }}>
                        {p.episodeTitle}
                      </Text>
                    </Pressable>
                  );
                })
              )}
              <Text style={{ fontSize: 12, fontWeight: '600', color: FAMILY.stone500 }}>
                {t('mobile.detail.optionalDetails')}
              </Text>
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                editable={!isRecording && !uploading}
                placeholder={t('voice.titleOptional')}
                placeholderTextColor={FAMILY.stone400}
                style={{
                  borderWidth: 1,
                  borderColor: FAMILY.stone200,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: FAMILY.stone900,
                }}
              />
              <TextInput
                value={notesDraft}
                onChangeText={setNotesDraft}
                editable={!isRecording && !uploading}
                placeholder={t('voice.notesOptional')}
                placeholderTextColor={FAMILY.stone400}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: FAMILY.stone200,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  minHeight: 64,
                  fontSize: 14,
                  color: FAMILY.stone900,
                  textAlignVertical: 'top',
                }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {!isRecording ? (
                  <Pressable
                    onPress={() => void startRecording()}
                    disabled={uploading || !selectedPatient}
                    style={{
                      flex: 1,
                      backgroundColor: FAMILY.teal,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: 'center',
                      opacity: uploading || !selectedPatient ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: FAMILY.white, fontWeight: '700' }}>
                      {uploading ? t('mobile.detail.savingRecording') : t('voice.start')}
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={() => void stopAndSave()}
                      style={{
                        flex: 1,
                        backgroundColor: '#E11D48',
                        borderRadius: 12,
                        paddingVertical: 12,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: FAMILY.white, fontWeight: '700' }}>
                        {t('mobile.detail.stopAndSave', { duration: formatDuration(elapsed) })}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void cancelRecording()}
                      style={{
                        paddingHorizontal: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: FAMILY.stone200,
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="close" size={18} color={FAMILY.stone500} />
                    </Pressable>
                  </>
                )}
              </View>
            </View>
            <Text
              style={{
                marginTop: 8,
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: FAMILY.stone400,
              }}
            >
              {t('voice.history')}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={chrome.teal} style={{ marginTop: 24 }} />
          ) : (
            <EmptyState
              title={t('voice.emptyHistory')}
              subtitle={t('mobile.detail.emptyRecordingHint')}
            />
          )
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: FAMILY.white,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: FAMILY.stone200,
              padding: 14,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: FAMILY.stone900 }}>
                  {item.title?.trim() || t('voice.untitled')}
                </Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: FAMILY.stone500 }}>
                  {item.patientName ? `${item.patientName} · ` : ''}
                  {formatDate(item.createdAt)} · {formatDuration(item.durationSeconds)}
                </Text>
                {item.notes ? (
                  <Text style={{ marginTop: 6, fontSize: 13, color: FAMILY.stone500 }} numberOfLines={2}>
                    {item.notes}
                  </Text>
                ) : null}
              </View>
              <StatusBadge
                status={playingId === item.id ? 'in_progress' : 'draft'}
                label={
                  playingId === item.id ? t('voice.playing') : t('plans.status.draft')
                }
              />
            </View>
            <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
              <Pressable
                disabled={busyId === item.id}
                onPress={() => void playRecording(item.id)}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: FAMILY.stone200,
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: 'center',
                  opacity: busyId === item.id ? 0.6 : 1,
                }}
              >
                <Text style={{ fontWeight: '600', color: FAMILY.stone900 }}>
                  {playingId === item.id ? t('voice.playing') : t('voice.play')}
                </Text>
              </Pressable>
              <Pressable
                disabled={busyId === item.id}
                onPress={() => void removeRecording(item.id)}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#FECDD3',
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: 'center',
                  opacity: busyId === item.id ? 0.6 : 1,
                }}
              >
                <Text style={{ fontWeight: '600', color: '#BE123C' }}>{t('voice.delete')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
