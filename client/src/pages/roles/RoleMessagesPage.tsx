import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MessageCircle, Paperclip, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isApiError } from '@/lib/errors';
import { listEpisodes } from '@/lib/api/episodes';
import {
  conversationAttachmentHref,
  conversationHasUnread,
  conversationTypeLabel,
  createConversationThread,
  listConversationMessages,
  listConversations,
  markConversationRead,
  otherParticipant,
  sendConversationMessage,
  attachmentDisplayName,
  type ChatMessage,
  type Conversation,
  type MessagesReadPayload,
} from '@/lib/api/conversations';
import { connectRealtime, subscribeChatRealtime } from '@/lib/realtime';
import { familyConversationTypeLabel, familyDateLocale } from '@/lib/familyLanguage';
import { localizeGeneratedLabel } from '@/lib/localizeStoredEnglish';

const FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx';
const FILE_MAX_BYTES = 10 * 1024 * 1024;

type StartOption = { episodeId: string; episodeTitle: string; participantId: string; name: string };

interface RoleMessagesPageProps {
  basePath: string;
  /** Family: start a thread with the episode coordinator. */
  canStartCoordinatorThread?: boolean;
  /** Clinical/coordinator: start a thread with the other episode party. */
  canStartStaffThreads?: boolean;
}

function previewText(
  conversation: Conversation,
  localized: boolean,
  t: (key: string) => string,
): string {
  const last = conversation.messages?.[0];
  if (!last || last.deleted) return localized ? t('messages.noMessagesYet') : 'No messages yet';
  if (last.fileUrl) return last.content?.trim() || (localized ? t('messages.attachment') : 'Attachment');
  return last.content?.trim() || (localized ? t('messages.noMessagesYet') : 'No messages yet');
}

function formatTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function RoleMessagesPage({
  basePath,
  canStartCoordinatorThread = false,
  canStartStaffThreads = false,
}: RoleMessagesPageProps) {
  const isFamily = basePath.startsWith('/family');
  const isCoordinator = basePath.startsWith('/coordinator');
  const isClinical = basePath.startsWith('/clinical');
  const localized = isFamily || isCoordinator || isClinical;
  const { t } = useTranslation(
    isFamily ? 'family' : isCoordinator ? 'coordinator' : isClinical ? 'clinical' : 'family',
  );
  const dateLocale = localized ? familyDateLocale() : 'en-QA';
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const myId = String(user?.id ?? '');

  const [threads, setThreads] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startOptions, setStartOptions] = useState<StartOption[]>([]);

  const socketRef = useRef<ReturnType<typeof connectRealtime> | null>(null);
  const selectedIdRef = useRef(conversationId);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  selectedIdRef.current = conversationId;

  const selected = useMemo(
    () => threads.find((t) => t.id === conversationId) ?? null,
    [threads, conversationId],
  );

  const loadThreads = useCallback(async () => {
    try {
      setThreads(await listConversations());
    } catch (error: unknown) {
      toast.error(
        isApiError(error) ? error.message : localized ? t('messages.loadError') : 'Failed to load messages',
      );
    } finally {
      setLoadingList(false);
    }
  }, [localized, t]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!canStartCoordinatorThread && !canStartStaffThreads) return;
    void listEpisodes({ limit: 50 })
      .then((result) => {
        const seen = new Set<string>();
        const options: StartOption[] = [];
        const push = (option: StartOption) => {
          if (!option.participantId || option.participantId === myId) return;
          const key = `${option.episodeId}:${option.participantId}`;
          if (seen.has(key)) return;
          seen.add(key);
          options.push(option);
        };

        for (const episode of result.data) {
          if (canStartCoordinatorThread && episode.coordinator?.id) {
            push({
              episodeId: episode.id,
              episodeTitle: episode.title,
              participantId: episode.coordinator.id,
              name: episode.coordinator.name,
            });
          }
          if (canStartStaffThreads) {
            const familyId = episode.careUnit?.familyUserId || episode.patient?.id;
            const familyName = episode.patient?.name || episode.careRecipient?.name || 'Family';
            if (familyId) {
              push({
                episodeId: episode.id,
                episodeTitle: episode.title,
                participantId: familyId,
                name: familyName,
              });
            }
            if (episode.coordinator?.id) {
              push({
                episodeId: episode.id,
                episodeTitle: episode.title,
                participantId: episode.coordinator.id,
                name: episode.coordinator.name,
              });
            }
          }
        }
        setStartOptions(options);
      })
      .catch(() => undefined);
  }, [canStartCoordinatorThread, canStartStaffThreads, myId]);

  useEffect(() => {
    const socket = connectRealtime();
    socketRef.current = socket;
    const joinSelected = () => {
      if (selectedIdRef.current) socket.emit('join_conversation', selectedIdRef.current);
    };
    socket.on('connect', joinSelected);
    const unsub = subscribeChatRealtime(socket, {
      onMessage: (raw) => {
        const msg = raw as ChatMessage;
        if (!msg?.id) return;
        if (msg.conversationId === selectedIdRef.current) {
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          if (msg.senderId && msg.senderId !== myId && msg.conversationId) {
            void markConversationRead(msg.conversationId);
          }
        }
        void loadThreads();
      },
      onRead: (raw) => {
        const payload = raw as MessagesReadPayload;
        if (payload.conversationId !== selectedIdRef.current) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === myId && m.status !== 'read'
              ? { ...m, status: 'read', readAt: payload.readAt }
              : m,
          ),
        );
      },
    });
    return () => {
      socket.off('connect', joinSelected);
      unsub();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [loadThreads, myId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !conversationId) return;
    if (socket.connected) socket.emit('join_conversation', conversationId);
    return () => {
      socket.emit('leave_conversation', conversationId);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingThread(true);
    void (async () => {
      try {
        const rows = await listConversationMessages(conversationId);
        if (cancelled) return;
        setMessages(rows);
        await markConversationRead(conversationId);
        void loadThreads();
      } catch (error: unknown) {
        if (!cancelled) {
          toast.error(
            isApiError(error) ? error.message : localized ? t('messages.loadError') : 'Failed to open conversation',
          );
        }
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, loadThreads, localized, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, conversationId]);

  async function onStartThread(option: StartOption) {
    setStarting(true);
    try {
      const thread = await createConversationThread({
        participantId: option.participantId,
        episodeId: option.episodeId,
      });
      await loadThreads();
      navigate(`${basePath}/${thread.id}`);
    } catch (error: unknown) {
      toast.error(
        isApiError(error) ? error.message : localized ? t('messages.loadError') : 'Could not start a conversation',
      );
    } finally {
      setStarting(false);
    }
  }

  async function onSend(event: FormEvent) {
    event.preventDefault();
    if (!conversationId || sending) return;
    const content = draft.trim();
    if (!content && !file) return;
    if (file && file.size > FILE_MAX_BYTES) {
      toast.error(isFamily ? t('messages.fileTooLarge') : 'File must be 10 MB or smaller');
      return;
    }
    setSending(true);
    try {
      const sent = await sendConversationMessage(conversationId, { content, file: file ?? undefined });
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setDraft('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      void loadThreads();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : localized ? t('messages.loadError') : 'Message failed to send');
    } finally {
      setSending(false);
    }
  }

  const other = selected && myId ? otherParticipant(selected, myId) : undefined;
  const showList = !conversationId;

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[28rem] overflow-hidden rounded-xl border border-stone-100 bg-white shadow-sm">
      <aside
        className={`${
          conversationId ? 'hidden md:flex' : 'flex'
        } w-full md:w-72 lg:w-80 shrink-0 flex-col border-r border-stone-100`}
      >
        <div className="border-b border-stone-100 px-4 py-3">
          <h2 className="font-semibold text-stone-900">
            {localized ? t('messages.title') : 'Messages'}
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            {localized ? t('messages.description') : 'Secure threads with your care team'}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex justify-center py-16">
              <div className="size-8 animate-spin rounded-full border-b-2 border-teal-600" />
            </div>
          ) : threads.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-stone-500">
              {localized ? t('messages.empty') : 'No conversations yet.'}
            </div>
          ) : (
            threads.map((thread) => {
              const peer = myId ? otherParticipant(thread, myId) : undefined;
              const unread = myId ? conversationHasUnread(thread, myId) : false;
              const active = thread.id === conversationId;
              return (
                <Link
                  key={thread.id}
                  to={`${basePath}/${thread.id}`}
                  className={`block border-b border-stone-50 px-4 py-3 hover:bg-teal-50/40 ${
                    active ? 'bg-teal-50/70' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${unread ? 'font-semibold text-stone-900' : 'font-medium text-stone-800'}`}>
                      {peer?.name ?? (isFamily ? t('common.careTeam') : 'Care team')}
                    </p>
                    {unread && <span className="mt-1 size-2 shrink-0 rounded-full bg-teal-600" />}
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-teal-700">
                    {isFamily ? familyConversationTypeLabel(thread.type) : conversationTypeLabel(thread.type)}
                  </p>
                  <p className="mt-1 truncate text-xs text-stone-500">
                    {previewText(thread, localized, t)}
                  </p>
                </Link>
              );
            })
          )}
        </div>
        {(canStartCoordinatorThread || canStartStaffThreads) && startOptions.length > 0 && (
          <div className="space-y-2 border-t border-stone-100 p-3">
            {startOptions.map((option) => (
              <button
                key={`${option.episodeId}:${option.participantId}`}
                type="button"
                disabled={starting}
                onClick={() => void onStartThread(option)}
                className="w-full rounded-xl bg-teal-600 px-3 py-2 text-start text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {localized
                  ? t('messages.startThread', { name: option.name })
                  : `Message ${option.name}`}
                <span className="mt-0.5 block text-[11px] font-normal text-teal-100">
                  {localizeGeneratedLabel(option.episodeTitle)}
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className={`${showList ? 'hidden md:flex' : 'flex'} min-w-0 flex-1 flex-col`}>
        {!conversationId ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <MessageCircle className="size-10 text-stone-300" />
            <p className="mt-3 max-w-sm text-sm text-stone-600">
              {localized
                ? t('messages.selectPrompt')
                : canStartCoordinatorThread || canStartStaffThreads
                  ? 'Select a conversation or start a new thread about an episode.'
                  : 'Select a conversation to read and reply.'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
              <Link
                to={basePath}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 md:hidden"
                aria-label={localized ? t('messages.backToList') : 'Back to conversations'}
              >
                <ArrowLeft className="size-4 rtl-flip" />
              </Link>
              <div className="min-w-0">
                <p className="truncate font-semibold text-stone-900">
                  {other?.name ?? (isFamily ? t('common.careTeam') : 'Care team')}
                </p>
                {selected && (
                  <p className="text-xs text-stone-500">
                    {isFamily
                      ? familyConversationTypeLabel(selected.type)
                      : conversationTypeLabel(selected.type)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-stone-50/60 px-4 py-4">
              {loadingThread ? (
                <div className="flex justify-center py-16">
                  <div className="size-8 animate-spin rounded-full border-b-2 border-teal-600" />
                </div>
              ) : messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-stone-500">
                  {localized ? t('messages.noMessagesYet') : 'No messages yet. Say hello.'}
                </p>
              ) : (
                messages.map((message) => {
                  const mine = message.senderId === myId;
                  const href =
                    message.fileUrl && conversationId
                      ? conversationAttachmentHref(conversationId, message.fileUrl)
                      : null;
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          mine ? 'bg-teal-600 text-white' : 'bg-white text-stone-800 border border-stone-100'
                        }`}
                      >
                        {message.deleted ? (
                          <p className={mine ? 'italic text-teal-100' : 'italic text-stone-400'}>
                            This message was removed
                          </p>
                        ) : (
                          <>
                            {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                            {href && message.fileUrl && (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className={`mt-1 inline-flex items-center gap-1 text-xs underline ${
                                  mine ? 'text-teal-50' : 'text-teal-700'
                                }`}
                              >
                                <Paperclip className="size-3" />
                                {attachmentDisplayName(message.fileUrl)}
                              </a>
                            )}
                          </>
                        )}
                        <p className={`mt-1 text-[10px] ${mine ? 'text-teal-100' : 'text-stone-400'}`}>
                          {formatTime(message.createdAt, dateLocale)}
                          {mine && message.status === 'read' ? ' · Read' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={onSend} className="border-t border-stone-100 p-3">
              {file && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-stone-50 px-3 py-1.5 text-xs text-stone-600">
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    className="ms-2 font-medium text-stone-500"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={FILE_ACCEPT}
                  className="hidden"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-stone-200 p-2.5 text-stone-600 hover:bg-stone-50"
                  aria-label={localized ? t('messages.attachHint') : 'Attach a file'}
                >
                  <Paperclip className="size-4" />
                </button>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  placeholder={localized ? t('messages.typeMessage') : 'Write a message'}
                  className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-teal-400"
                />
                <button
                  type="submit"
                  disabled={sending || (!draft.trim() && !file)}
                  className="rounded-xl bg-teal-600 p-2.5 text-white hover:bg-teal-700 disabled:opacity-50"
                  aria-label={localized ? t('messages.send') : 'Send'}
                >
                  <Send className="size-4" />
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-stone-400">
                {localized
                  ? t('messages.attachFormats', {
                      defaultValue: 'PDF, Word, JPEG, PNG, or WebP · 10 MB max',
                    })
                  : 'PDF, Word, JPEG, PNG, or WebP · 10 MB max'}
              </p>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
