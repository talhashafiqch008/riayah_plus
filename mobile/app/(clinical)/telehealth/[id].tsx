import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui';
import { ROLE, RoleTabHero } from '../../../components/shell/RoleChrome';
import { TelehealthVideoRoom } from '../../../components/telehealth/TelehealthVideoRoom';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { getSession, type CareSession } from '../../../lib/api/scheduling';
import {
  addTelehealthSessionNote,
  admitTelehealthParticipant,
  getTelehealthContext,
  getTelehealthLobby,
  isLiveKitUrlReady,
  joinTelehealthRoom,
  sessionJoinRoomName,
  type TelehealthContext,
  type TelehealthJoin,
  type TelehealthLobby,
} from '../../../lib/api/telehealth';
import { clinicalRoleLabel } from '../../../lib/clinicalI18n';

export default function ClinicalTelehealthJoinScreen() {
  const { t, i18n } = useTranslation('clinical');
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = String(id ?? '');
  const toast = useToast();
  const [session, setSession] = useState<CareSession | null>(null);
  const [join, setJoin] = useState<TelehealthJoin | null>(null);
  const [lobby, setLobby] = useState<TelehealthLobby | null>(null);
  const [context, setContext] = useState<TelehealthContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const refreshLobby = useCallback(async () => {
    try {
      setLobby(await getTelehealthLobby(sessionId));
    } catch {
      setLobby(null);
    }
  }, [sessionId]);

  const refreshContext = useCallback(async () => {
    try {
      setContext(await getTelehealthContext(sessionId));
    } catch {
      setContext(null);
    }
  }, [sessionId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = await getSession(sessionId);
      setSession(row);
      const next = await joinTelehealthRoom(sessionJoinRoomName(row));
      setJoin(next);
      await Promise.all([refreshLobby(), refreshContext()]);
    } catch (err: unknown) {
      toast.show(apiErrorMessage(err, t('telehealthJoin.openFailed')), { type: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [refreshContext, refreshLobby, sessionId, t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshLobby();
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshLobby]);

  async function onAdmit(userId: string) {
    setBusyId(userId);
    try {
      await admitTelehealthParticipant(sessionId, userId);
      toast.show(t('telehealthJoin.admitSuccess'), { type: 'success' });
      await refreshLobby();
    } catch (err: unknown) {
      toast.show(apiErrorMessage(err, t('mobile.detail.admitFailed')), { type: 'danger' });
    } finally {
      setBusyId(null);
    }
  }

  async function onSaveNote() {
    const content = note.trim();
    if (!content) return;
    setSavingNote(true);
    try {
      await addTelehealthSessionNote(sessionId, {
        content,
        isPrivate,
        noteType: 'session_note',
      });
      setNote('');
      toast.show(t('telehealthJoin.noteSaved'), { type: 'success' });
      await refreshContext();
    } catch (err: unknown) {
      toast.show(apiErrorMessage(err, t('telehealthJoin.noteFailed')), { type: 'danger' });
    } finally {
      setSavingNote(false);
    }
  }

  const videoReady =
    showVideo &&
    join?.phase === 'in_call' &&
    isLiveKitUrlReady(join.serverUrl) &&
    Boolean(join.token);

  if (videoReady && join?.serverUrl && join.token) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1c1917' }} edges={['top']}>
        <RoleTabHero
          title={t('mobile.detail.telehealthHero')}
          subtitle={t('mobile.detail.inCall')}
          showBack
        />
        <TelehealthVideoRoom
          token={join.token}
          serverUrl={join.serverUrl}
          onDisconnected={() => setShowVideo(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ROLE.stone50 }} edges={['top']}>
      <RoleTabHero
        title={t('telehealthJoin.videoSession')}
        subtitle={t('mobile.detail.lobbySubtitle')}
        showBack
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={ROLE.teal} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {session ? (
            <Text className="mb-3 text-sm text-stone-500">
              {session.client?.name ?? t('common.patient')} · {formatDateTime(session.scheduledAt)}
            </Text>
          ) : null}

          <View className="mb-4 rounded-2xl border border-stone-200 bg-white p-4">
            <Text className="text-sm font-semibold text-stone-900">{t('telehealthJoin.waitingRoom')}</Text>
            {(lobby?.lobby ?? []).length === 0 ? (
              <Text className="mt-2 text-sm text-stone-500">{t('mobile.detail.noOneWaitingShort')}</Text>
            ) : (
              (lobby?.lobby ?? []).map((person) => (
                <View
                  key={person.id}
                  className="mt-3 flex-row items-center justify-between gap-3 border-t border-stone-100 pt-3"
                >
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-stone-800">{person.name}</Text>
                    <Text className="text-xs text-stone-400">
                      {clinicalRoleLabel(t, i18n, person.role ?? 'family')}
                    </Text>
                  </View>
                  <Button
                    size="sm"
                    isLoading={busyId === person.id}
                    onPress={() => void onAdmit(person.id)}
                  >
                    {t('telehealthJoin.admit')}
                  </Button>
                </View>
              ))
            )}
          </View>

          {isLiveKitUrlReady(join?.serverUrl) ? (
            <View className="mb-4">
              <Button onPress={() => setShowVideo(true)}>{t('mobile.detail.joinVideoCall')}</Button>
            </View>
          ) : (
            <Text className="mb-4 text-sm text-stone-500">{t('mobile.detail.livekitNotConfigured')}</Text>
          )}

          <View className="rounded-2xl border border-stone-200 bg-white p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-stone-900">{t('telehealthJoin.sessionContext')}</Text>
              <Pressable onPress={() => void refreshContext()} hitSlop={8}>
                <Ionicons name="refresh" size={18} color={ROLE.teal} />
              </Pressable>
            </View>

            {!context ? (
              <Text className="text-sm text-stone-500">{t('telehealthJoin.loadingContext')}</Text>
            ) : (
              <>
                <Text className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                  {t('telehealthJoin.episode')}
                </Text>
                <Text className="mt-1 text-sm font-medium text-stone-900">
                  {context.episode?.title ?? t('telehealthJoin.noEpisode')}
                </Text>

                <Text className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                  {t('telehealthJoin.carePlan')}
                </Text>
                {context.carePlan ? (
                  <View className="mt-1">
                    <Text className="text-sm font-medium text-stone-900">
                      {context.carePlan.title}
                      <Text className="text-xs font-normal text-stone-400">
                        {t('mobile.detail.carePlanVersionInline', {
                          version: context.carePlan.version,
                        })}
                      </Text>
                    </Text>
                    {context.carePlan.goals.slice(0, 4).map((goal) => (
                      <Text key={goal.id} className="mt-1 text-xs text-stone-500">
                        · {goal.title}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text className="mt-1 text-sm text-stone-500">{t('telehealthJoin.noCarePlan')}</Text>
                )}

                <Text className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                  {t('mobile.detail.priorNotes')}
                </Text>
                {(context.notes ?? []).slice(0, 5).map((n) => (
                  <Text key={n.id} className="mt-2 text-sm leading-5 text-stone-600">
                    {n.content}
                  </Text>
                ))}
                {(context.notes ?? []).length === 0 ? (
                  <Text className="mt-1 text-sm text-stone-500">{t('telehealthJoin.noNotes')}</Text>
                ) : null}
              </>
            )}

            <Text className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              {t('mobile.detail.addSessionNote')}
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('mobile.detail.visitNotePlaceholder')}
              placeholderTextColor={ROLE.stone400}
              multiline
              className="min-h-[88px] rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900"
            />
            <Pressable
              onPress={() => setIsPrivate((v) => !v)}
              className="mt-3 flex-row items-center gap-2"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isPrivate }}
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded-md border ${
                  isPrivate ? 'border-teal-600 bg-teal-600' : 'border-stone-300 bg-white'
                }`}
              >
                {isPrivate ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
              <Text className="text-sm text-stone-600">{t('mobile.detail.privateStaffOnly')}</Text>
            </Pressable>
            <View className="mt-3">
              <Button isLoading={savingNote} onPress={() => void onSaveNote()}>
                {t('telehealthJoin.saveNote')}
              </Button>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
