import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useToast } from 'react-native-toast-notifications';
import { EmptyState } from '../ui';
import { ROLE, RoleTabHero } from '../shell/RoleChrome';
import { FAMILY, FamilyTabHero } from '../family/FamilyChrome';
import { useAuthStore } from '../../stores/authStore';
import { apiErrorMessage, formatDateTime } from '../../lib/format';
import { listEpisodes } from '../../lib/api/care';
import {
  attachmentDisplayName,
  conversationHasUnread,
  conversationTypeLabel,
  createConversationThread,
  listConversationMessages,
  listConversations,
  markConversationRead,
  otherParticipant,
  sendConversationMessage,
  type ChatMessage,
  type Conversation,
} from '../../lib/api/conversations';
import { connectRealtime, subscribeChatRealtime } from '../../lib/realtime';

type StartOption = {
  episodeId: string;
  episodeTitle: string;
  participantId: string;
  name: string;
};

type MessagesInboxProps = {
  basePath: string;
  tone?: 'family' | 'role';
  canStartCoordinatorThread?: boolean;
  canStartStaffThreads?: boolean;
};

function previewText(conversation: Conversation): string {
  const last = conversation.messages?.[0];
  if (!last || last.deleted) return 'No messages yet';
  if (last.fileUrl) return last.content?.trim() || 'Attachment';
  return last.content?.trim() || 'No messages yet';
}

export function MessagesInbox({
  basePath,
  tone = 'role',
  canStartCoordinatorThread = false,
  canStartStaffThreads = false,
}: MessagesInboxProps) {
  const toast = useToast();
  const token = useAuthStore((s) => s.token);
  const myId = String(useAuthStore((s) => s.user?.id ?? ''));
  const [threads, setThreads] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startOptions, setStartOptions] = useState<StartOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadThreads = useCallback(async () => {
    try {
      setThreads(await listConversations());
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, 'Failed to load messages'), { type: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!canStartCoordinatorThread && !canStartStaffThreads) return;
    void listEpisodes({ limit: 50 })
      .then((result) => {
        const rows = result.data ?? [];
        const seen = new Set<string>();
        const options: StartOption[] = [];
        const push = (option: StartOption) => {
          if (!option.participantId || option.participantId === myId) return;
          const key = `${option.episodeId}:${option.participantId}`;
          if (seen.has(key)) return;
          seen.add(key);
          options.push(option);
        };
        for (const episode of rows) {
          if (canStartCoordinatorThread && episode.coordinator?.id) {
            push({
              episodeId: episode.id,
              episodeTitle: episode.title ?? 'Care journey',
              participantId: episode.coordinator.id,
              name: episode.coordinator.name,
            });
          }
          if (canStartStaffThreads) {
            if (episode.coordinator?.id) {
              push({
                episodeId: episode.id,
                episodeTitle: episode.title ?? 'Care journey',
                participantId: episode.coordinator.id,
                name: episode.coordinator.name,
              });
            }
            const familyId = episode.patient?.id;
            if (familyId) {
              push({
                episodeId: episode.id,
                episodeTitle: episode.title ?? 'Care journey',
                participantId: familyId,
                name: episode.patient?.name ?? 'Family',
              });
            }
          }
        }
        setStartOptions(options);
      })
      .catch(() => undefined);
  }, [canStartCoordinatorThread, canStartStaffThreads, myId]);

  useEffect(() => {
    if (!token) return;
    const socket = connectRealtime(token);
    const unsub = subscribeChatRealtime(socket, {
      onMessage: () => {
        void loadThreads();
      },
    });
    return () => {
      unsub();
      socket.disconnect();
    };
  }, [token, loadThreads]);

  async function onStart(option: StartOption) {
    setStarting(true);
    try {
      const thread = await createConversationThread({
        participantId: option.participantId,
        episodeId: option.episodeId,
      });
      setPickerOpen(false);
      await loadThreads();
      router.push(`${basePath}/${thread.id}` as never);
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, 'Could not start conversation'), { type: 'danger' });
    } finally {
      setStarting(false);
    }
  }

  const Hero = tone === 'family' ? FamilyTabHero : RoleTabHero;
  const bg = tone === 'family' ? FAMILY.stone50 : ROLE.stone50;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <Hero
        title="Messages"
        subtitle="Talk with your care team"
        showBack
        right={
          startOptions.length > 0 ? (
            <Pressable
              onPress={() => setPickerOpen((v) => !v)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Start conversation"
            >
              <Ionicons name="create-outline" size={22} color={FAMILY.white} />
            </Pressable>
          ) : null
        }
      />

      {pickerOpen ? (
        <View className="border-b border-stone-200 bg-white px-4 py-3">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Start a conversation
          </Text>
          {startOptions.slice(0, 8).map((opt) => (
            <Pressable
              key={`${opt.episodeId}:${opt.participantId}`}
              disabled={starting}
              onPress={() => void onStart(opt)}
              className="mb-2 rounded-xl border border-stone-200 px-3 py-2.5"
            >
              <Text className="text-sm font-semibold text-stone-900">{opt.name}</Text>
              <Text className="text-xs text-stone-500" numberOfLines={1}>
                {opt.episodeTitle}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={ROLE.teal} />
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="No conversations yet"
              subtitle={
                startOptions.length
                  ? 'Start a thread with your care team from the compose button.'
                  : 'When your care team messages you, threads will appear here.'
              }
            />
          }
          renderItem={({ item }) => {
            const other = otherParticipant(item, myId);
            const unread = conversationHasUnread(item, myId);
            return (
              <Pressable
                onPress={() => router.push(`${basePath}/${item.id}` as never)}
                className="mb-3 rounded-2xl border border-stone-200 bg-white px-4 py-3.5"
                style={{ borderColor: unread ? ROLE.teal : ROLE.stone200 }}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-stone-900">
                      {other?.name ?? item.title ?? 'Conversation'}
                    </Text>
                    <Text className="mt-0.5 text-xs text-stone-400">
                      {conversationTypeLabel(item.type)}
                    </Text>
                    <Text className="mt-2 text-sm text-stone-600" numberOfLines={2}>
                      {previewText(item)}
                    </Text>
                  </View>
                  {unread ? (
                    <View className="mt-1 h-2.5 w-2.5 rounded-full bg-teal-600" />
                  ) : null}
                </View>
                {item.lastMessageAt ? (
                  <Text className="mt-2 text-xs text-stone-400">{formatDateTime(item.lastMessageAt)}</Text>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

type MessageThreadProps = {
  conversationId: string;
  basePath: string;
  tone?: 'family' | 'role';
};

export function MessageThread({ conversationId, basePath, tone = 'role' }: MessageThreadProps) {
  const toast = useToast();
  const token = useAuthStore((s) => s.token);
  const myId = String(useAuthStore((s) => s.user?.id ?? ''));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [title, setTitle] = useState('Conversation');
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const load = useCallback(async () => {
    try {
      const [rows, threads] = await Promise.all([
        listConversationMessages(conversationId),
        listConversations(),
      ]);
      setMessages([...rows].reverse());
      const thread = threads.find((t) => t.id === conversationId);
      const other = thread ? otherParticipant(thread, myId) : undefined;
      setTitle(other?.name ?? thread?.title ?? 'Conversation');
      await markConversationRead(conversationId);
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, 'Failed to load thread'), { type: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [conversationId, myId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!token) return;
    const socket = connectRealtime(token);
    socket.emit('join_conversation', conversationId);
    const unsub = subscribeChatRealtime(socket, {
      onMessage: (raw) => {
        const msg = raw as ChatMessage;
        if (msg.conversationId !== conversationId) return;
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        void markConversationRead(conversationId);
      },
    });
    return () => {
      socket.emit('leave_conversation', conversationId);
      unsub();
      socket.disconnect();
    };
  }, [token, conversationId]);

  async function onPickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
  }

  async function onSend() {
    const content = draft.trim();
    if (!content && !file) return;
    setSending(true);
    try {
      const sent = await sendConversationMessage(conversationId, {
        content: content || undefined,
        fileUri: file?.uri,
        fileName: file?.name,
        mimeType: file?.mimeType,
      });
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setDraft('');
      setFile(null);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, 'Could not send message'), { type: 'danger' });
    } finally {
      setSending(false);
    }
  }

  const Hero = tone === 'family' ? FamilyTabHero : RoleTabHero;
  const bg = tone === 'family' ? FAMILY.stone50 : ROLE.stone50;

  const sorted = useMemo(() => messages, [messages]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <Hero title={title} subtitle="Secure messaging" showBack />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={ROLE.teal} />
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={sorted}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <EmptyState icon="chatbubble-outline" title="No messages yet" subtitle="Say hello to start the conversation." />
            }
            renderItem={({ item }) => {
              const mine = item.senderId === myId;
              return (
                <View className={`mb-2 max-w-[85%] ${mine ? 'self-end' : 'self-start'}`}>
                  <View
                    className={`rounded-2xl px-3.5 py-2.5 ${
                      mine ? 'bg-teal-600' : 'border border-stone-200 bg-white'
                    }`}
                  >
                    {item.content?.trim() ? (
                      <Text className={`text-sm leading-5 ${mine ? 'text-white' : 'text-stone-800'}`}>
                        {item.content}
                      </Text>
                    ) : null}
                    {item.fileUrl ? (
                      <Text className={`mt-1 text-xs ${mine ? 'text-teal-50' : 'text-teal-700'}`}>
                        {attachmentDisplayName(item.fileUrl)}
                      </Text>
                    ) : null}
                  </View>
                  <Text className={`mt-1 text-[10px] text-stone-400 ${mine ? 'text-right' : ''}`}>
                    {formatDateTime(item.createdAt)}
                  </Text>
                </View>
              );
            }}
          />

          <View className="border-t border-stone-200 bg-white px-3 pb-3 pt-2">
            {file ? (
              <View className="mb-2 flex-row items-center justify-between rounded-lg bg-stone-100 px-3 py-2">
                <Text className="flex-1 text-xs text-stone-600" numberOfLines={1}>
                  {file.name}
                </Text>
                <Pressable onPress={() => setFile(null)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={ROLE.stone500} />
                </Pressable>
              </View>
            ) : null}
            <View className="flex-row items-end gap-2">
              <Pressable
                onPress={() => void onPickFile()}
                className="mb-1 h-10 w-10 items-center justify-center rounded-full bg-stone-100"
                accessibilityRole="button"
                accessibilityLabel="Attach file"
              >
                <Ionicons name="attach" size={20} color={ROLE.teal} />
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Write a message"
                placeholderTextColor={ROLE.stone400}
                multiline
                className="max-h-28 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900"
              />
              <Pressable
                onPress={() => void onSend()}
                disabled={sending || (!draft.trim() && !file)}
                className={`mb-1 h-10 w-10 items-center justify-center rounded-full ${
                  sending || (!draft.trim() && !file) ? 'bg-stone-200' : 'bg-teal-600'
                }`}
                accessibilityRole="button"
                accessibilityLabel="Send"
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </Pressable>
            </View>
            <Pressable onPress={() => router.replace(basePath as never)} className="mt-2 items-center py-1">
              <Text className="text-xs font-medium text-stone-400">Back to inbox</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
