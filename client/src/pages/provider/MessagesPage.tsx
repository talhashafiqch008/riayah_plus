/**
 * Provider Messages Page - Premium Redesign
 * Features Clean Split-View, Audio/File Support, Video Meetings
 */


import { Suspense , useRef } from 'react';
;
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatEcho } from '@/hooks/useEcho';
import toast from 'react-hot-toast';
import {
 MessageCircle,
 Search,
 Send,
 Paperclip,
 MoreVertical,
 Phone,
 Video,
 Check,
 CheckCheck,
 Image as ImageIcon,
 Smile,
 ArrowLeft,
 MoreHorizontal,
 FileText,
 Mic,
 User
} from 'lucide-react';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { uploadDocument } from '@/lib/api';
import { client } from '@/lib/api/client';
import { isApiError } from '@/lib/errors';




// --- Sub-components (Same as Careseeker) ---
function AudioPlayer({ src, duration, isMe }: { src?: string | null, duration: number, isMe: boolean }) {
 const [playing, setPlaying] = useState(false);
 const [error, setError] = useState(false);
 const audioRef = useRef<HTMLAudioElement | null>(null);
 const [progress, setProgress] = useState(0);

 // TODO: Refactor cascading setState into useReducer or batched update
 useEffect(() => {
 if (!src) {
 setError(true);
 } else {
 setError(false);
 }
 setProgress(0);
 setPlaying(false);
 }, [src]);

 const togglePlay = async () => {
 if (!audioRef.current || error || !src) return;

 try {
 if (playing) {
 audioRef.current.pause();
 setPlaying(false);
 } else {
 await audioRef.current.play();
 setPlaying(true);
 }
 } catch (err) {
 console.error("Audio playback failed:", err);
 setError(true);
 setPlaying(false);
 }
 };

 const handleTimeUpdate = () => {
 if (audioRef.current) {
 const current = audioRef.current.currentTime;
 const total = audioRef.current.duration || duration || 1;
 setProgress((current / total) * 100);
 }
 };

 const handleEnded = () => {
 setPlaying(false);
 setProgress(0);
 };

 const handleError = () => {
 setError(true);
 setPlaying(false);
 };

 return (
 <div className="flex items-center gap-3 min-w-[200px]">
 <button
 onClick={togglePlay}
 disabled={error}
 className={`p-2 rounded-full ${isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-stone-100 hover:bg-stone-200'} transition-colors flex-shrink-0 ${error ? 'opacity-50 cursor-not-allowed' : ''}`}
 >
 {error ? (
 <div className="size-3 text-red-500 font-bold">!</div>
 ) : playing ? (
 <div className="size-3 bg-current rounded-sm" />
 ) : (
 <div className="size-0 border-l-[8px] border-l-current border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent ml-0.5" />
 )}
 </button>
 <div className="flex-1">
 <div className={`h-1 rounded-full ${isMe ? 'bg-white/30' : 'bg-stone-200'} overflow-hidden relative`}>
 <div
 className={`absolute left-0 top-0 h-full ${error ? 'bg-red-400' : (isMe ? 'bg-white' : 'bg-teal-600')} transition-all duration-100`}
 style={{ width: `${progress}%` }}
 />
 </div>
 </div>
 <span className="text-xs font-medium opacity-80 w-10 text-right">
 {error ? 'ERR' : formatTime(duration)}
 </span>
 <audio
 ref={audioRef}
 src={src || undefined}
 onTimeUpdate={handleTimeUpdate}
 onEnded={handleEnded}
 onError={handleError}
 className="hidden"
 />
 </div>
 );
}

const formatTime = (seconds: number) => {
 const mins = Math.floor(seconds / 60);
 const secs = seconds % 60;
 return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// --- Types ---
interface Message {
 id: string | number;
 user_id: string | number;
 receiver_id: string | number;
 message: string;
 created_at: string;
 updated_at?: string;
 right?: boolean;
 sender?: {
 id: string;
 first_name: string;
 last_name: string;
 avatar?: string;
 };
 type?: string;
 file_url?: string;
 duration?: number;
 file_name?: string;
}

interface Conversation {
 id: string;
 other_user_id: string;
 other_user: {
 id: string;
 first_name: string;
 last_name: string;
 avatar?: string;
 role?: string;
 online?: boolean;
 };
 last_message?: Message;
 unread_count: number;
 updated_at: string;
}

export default function ProviderMessagesPage() {
 const { user } = useAuth();
 const [searchParams] = useSearchParams();

 // Data State
 const [conversations, setConversations] = useState<Conversation[]>([]);
 const [selectedChat, setSelectedChat] = useState<string | null>(null);
 const [messages, setMessages] = useState<Message[]>([]);

 // UI State
 const [message, setMessage] = useState('');
 const [searchQuery, setSearchQuery] = useState('');
 const [loading, setLoading] = useState(true);
 const [sending, setSending] = useState(false);
 const loadingMessagesRef = useRef(false);
 // eslint-disable-next-line react-hooks/purity
 const visualizerHeights = useMemo(() => Array.from({ length: 20 }, () => Math.floor(Math.random() * 100)), []);

 // Recording State
 const [isRecording, setIsRecording] = useState(false);
 const [recordingTime, setRecordingTime] = useState(0);
 const mediaRecorderRef = useRef<MediaRecorder | null>(null);
 const audioChunksRef = useRef<Blob[]>([]);
 const timerRef = useRef<NodeJS.Timeout | null>(null);
 const audioStreamRef = useRef<MediaStream | null>(null);

 const messagesEndRef = useRef<HTMLDivElement>(null);
 const API_URL = import.meta.env.VITE_API_URL!;

 const isClient = () => typeof window !== 'undefined';

 // --- Real-time Handler ---
 const handleNewMessage = useCallback((newMessage: Message) => {
 const isForCurrentChat = selectedChat &&
 (String(newMessage.user_id) === String(selectedChat) ||
 String(newMessage.receiver_id) === String(selectedChat));

 if (isForCurrentChat) {
 setMessages((prev) => {
 if (prev.some(msg => String(msg.id) === String(newMessage.id))) return prev;
 return [...prev, { ...newMessage, right: String(newMessage.user_id) === String(user?.id) }];
 });
 }

 setConversations((prev) => {
 const otherUserId = String(newMessage.user_id) === String(user?.id)
 ? String(newMessage.receiver_id)
 : String(newMessage.user_id);

 const idx = prev.findIndex(c => String(c.other_user_id) === otherUserId);
 if (idx !== -1) {
 const updated = [...prev];
 updated[idx] = {
 ...updated[idx],
 last_message: newMessage,
 updated_at: newMessage.created_at,
 unread_count: String(newMessage.user_id) !== String(user?.id) && !isForCurrentChat
 ? updated[idx].unread_count + 1
 : updated[idx].unread_count,
 };
 const [moved] = updated.splice(idx, 1);
 return [moved, ...updated];
 }
 return prev;
 });
 }, [selectedChat, user?.id]);

 const { isConnected } = useChatEcho(user?.id || '', handleNewMessage);

 // --- Loading Data ---
 const loadConversations = async () => {
 try {
 setLoading(true);
 const response = await client.get('/conversations');
 setConversations(response.data.data?.conversations || []);
 } finally {
 setLoading(false);
 }
 };

 const loadMessages = async (receiverId: string) => {
 try {
 loadingMessagesRef.current = true;
 const response = await client.get(`/chat/${receiverId}`);
 setMessages(response.data.data?.messages || []);
 } finally {
 loadingMessagesRef.current = false;
 }
 };

 const handleSendMessage = async () => {
 if (!message.trim() || !selectedChat || sending) return;
 const text = message.trim();

 try {
 setSending(true);
 const response = await client.post(`/chat/${selectedChat}`, { message: text });
 const data = response.data;
 if (data.success && data.data?.message) {
 setMessages(prev => [...prev, data.data.message]);
 }
 setMessage('');
 } finally {
 setSending(false);
 }
 };

 const uploadAndSend = async (file: File, type: 'image' | 'file' | 'audio', duration?: number) => {
 try {
 setSending(true);
 const formData = new FormData();
 formData.append('file', file);
 formData.append('type', type);
 formData.append('document_type', 'general');

 let uploadedUrl = '';
 try {
 const response = await uploadDocument(formData);
 uploadedUrl = response.data?.document?.file_url || response.url || response.data?.url || response.path;
 } catch (err) {
 uploadedUrl = URL.createObjectURL(file);
 }

 if (!uploadedUrl) uploadedUrl = URL.createObjectURL(file);

 const messageContent = JSON.stringify({
 type,
 url: uploadedUrl,
 name: file.name,
 size: file.size,
 duration: duration || 0
 });

 const response = await client.post(`/chat/${selectedChat}`, { message: messageContent });
 const data = response.data;
 if (data.success && data.data?.message) {
 setMessages(prev => [...prev, data.data.message]);
 }
 } catch (error) {
 console.error(`Failed to send ${type}`, error);
 if (isApiError(error)) {
 toast.error(error.message || `Failed to send ${type}`);
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error(`Failed to send ${type}`);
 }
 } finally {
 setSending(false);
 }
 };

 const handleCreateMeeting = async () => {
 if (!selectedChat) return;

 const randomSuffix = Math.random().toString(36).substring(2, 10);
 const roomId = `room_${user?.id || 'provider'}_${randomSuffix}`;
 const meetingUrl = `${window.location.protocol}//${window.location.host}/meeting/${roomId}`;

 // Link to message text
 const messageText = `📹 Join Video Meeting: \n${meetingUrl}`;
 const meetingTitle = `Meeting with ${user?.firstName || 'Provider'}`;

 try {
 await client.post('/meetings', {
 meeting_link: meetingUrl,
 title: meetingTitle,
 platform: 'livekit'
 });

 // 2. Send Message
 const response = await client.post(`/chat/${selectedChat}`, { message: messageText });
 const data = response.data;
 if (data.success && data.data?.message) {
 setMessages(prev => [...prev, data.data.message]);
 }
 } catch (error) {
 console.error('Failed to create meeting:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to create meeting');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to create meeting');
 }
 }
 };

 // --- Recording ---
 const startRecording = async () => {
 try {
 const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
 audioStreamRef.current = stream;
 const mediaRecorder = new MediaRecorder(stream);
 mediaRecorderRef.current = mediaRecorder;
 audioChunksRef.current = [];

 mediaRecorder.ondataavailable = (event) => {
 if (event.data.size > 0) audioChunksRef.current.push(event.data);
 };

 mediaRecorder.onstop = () => {
 if (audioChunksRef.current.length > 0) {
 const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
 const audioFile = new File([audioBlob], `voice_note_${Date.now()}.wav`, { type: 'audio/wav' });
 uploadAndSend(audioFile, 'audio', recordingTime);
 }
 if (audioStreamRef.current) {
 audioStreamRef.current.getTracks().forEach(track => track.stop());
 audioStreamRef.current = null;
 }
 setIsRecording(false);
 };

 mediaRecorder.start();
 setIsRecording(true);
 setRecordingTime(0);
 if (timerRef.current) clearInterval(timerRef.current);
 timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);

 } catch (error) {
 console.error('Error accessing microphone:', error);
 toast.error('Cannot access microphone.');
 }
 };

 const stopRecording = (send: boolean) => {
 if (mediaRecorderRef.current && isRecording) {
 if (!send) audioChunksRef.current = [];
 mediaRecorderRef.current.stop();
 if (timerRef.current) {
 clearInterval(timerRef.current);
 timerRef.current = null;
 }
 }
 };

 // --- Effects ---
 useEffect(() => { loadConversations(); }, []);

 useEffect(() => {
 // Support 'client', 'user', or 'provider' param to be flexible
 const targetId = searchParams.get('client') || searchParams.get('user') || searchParams.get('provider');
 if (targetId && !loading) { // Only proceed after conversations have loaded
 setSelectedChat(targetId);

 // Check if conversation already exists
 const existingConv = conversations.find(c => c.other_user_id === targetId);

 if (!existingConv) {
 client.get(`/chat/${targetId}`)
 .then(r => {
 const d = r.data;
 if (d.data?.receiver) {
 // Double-check it wasn't added in the meantime
 setConversations(prev => {
 if (prev.some(c => c.other_user_id === targetId)) {
 return prev; // Already exists, don't add
 }
 return [{
 id: `temp-${targetId}`,
 other_user_id: targetId,
 other_user: {
 id: d.data.receiver.id,
 first_name: d.data.receiver.firstName,
 last_name: d.data.receiver.lastName,
 role: d.data.receiver.role,
 online: true
 },
 unread_count: 0,
 updated_at: new Date().toISOString()
 }, ...prev];
 });
 }
 });
 }
 }
 }, [searchParams, loading, API_URL]);

 useEffect(() => { if (selectedChat) loadMessages(selectedChat); }, [selectedChat]);
 useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

 // --- Helper to format last message preview ---
 const formatMessagePreview = (message: string | undefined) => {
 if (!message) return <span className="italic opacity-50">No messages yet</span>;

 // Check if it's a JSON message (media/file)
 if (message.trim().startsWith('{')) {
 try {
 const parsed = JSON.parse(message);
 if (parsed.type === 'image') return '📷 Image';
 if (parsed.type === 'audio') return '🎤 Voice message';
 if (parsed.type === 'file') return '📎 File';
 } catch (e) {
 // Not valid JSON, return as is
 }
 }

 // Check for video meeting links
 if (message.includes('/meeting/room_') || message.includes('Join Video Meeting')) {
 return '📹 Video meeting';
 }

 return message;
 };

 const filteredConversations = conversations.filter(c =>
 c.other_user && `${c.other_user.first_name} ${c.other_user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
 );
 const selectedConversation = conversations.find(c => c.other_user_id === selectedChat);

 if (!user) return <div className="h-screen flex items-center justify-center text-stone-500">Please login</div>;

 return (
 <div className="h-[calc(100vh-6rem)] bg-white rounded-3xl border border-stone-200 overflow-hidden flex shadow-2xl shadow-stone-200/50">
 {/* --- LEFT: Sidebar --- */}
 <div className={`w-full md:w-[400px] flex-shrink-0 border-r border-stone-100 flex flex-col bg-white ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
 <div className="p-6 pb-2">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-2xl font-semibold text-stone-900">Messages</h2>
 <div className="flex items-center gap-2">
 <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-600 text-xs font-bold border border-teal-100">
 {conversations.length}
 </span>
 </div>
 </div>
 <div className="relative mb-4">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
 <input type="text" placeholder="Search chats..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-transparent rounded-2xl text-sm font-medium focus:outline-none focus:bg-white focus:border-teal-200 focus:ring-4 focus:ring-teal-50 transition-all" />
 </div>
 </div>

 <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
 {loading ? (
 <div className="p-8 text-center text-stone-400">Loading chats…</div>
 ) : filteredConversations.length === 0 ? (
 <div className="text-center py-10 text-stone-400">No conversations found</div>
 ) : (
 filteredConversations.map(conv => (
 <button
 key={conv.id}
 onClick={() => setSelectedChat(conv.other_user_id)}
 className={`group w-full p-4 flex items-start gap-4 rounded-2xl transition-all duration-200 border border-transparent ${selectedChat === conv.other_user_id ? 'bg-teal-50 border-teal-200/60 shadow-sm' : 'hover:bg-stone-50 hover:border-stone-100'}`}
 >
 <div className="relative flex-shrink-0">
 <div className={`size-12 rounded-2xl flex items-center justify-center text-base font-bold ${selectedChat === conv.other_user_id ? 'bg-teal-600 text-white' : 'bg-gradient-to-br from-stone-100 to-stone-200 text-stone-600'}`}>
 {conv.other_user?.avatar
 ? <img width={100} height={100} src={conv.other_user?.avatar} alt={`${conv.other_user?.first_name || 'User'} avatar`} className="size-full rounded-2xl object-cover" loading="lazy" />
 : `${conv.other_user?.first_name?.[0] || ''}${conv.other_user?.last_name?.[0] || ''}`}
 </div>
 {conv.other_user?.online && <span className="absolute -top-1 -right-1 size-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />}
 </div>
 <div className="flex-1 min-w-0 text-left">
 <div className="flex justify-between items-baseline mb-1">
 <h4 className={`text-sm font-semibold truncate ${selectedChat === conv.other_user_id ? 'text-teal-900' : 'text-stone-700'}`}>
 {conv.other_user?.first_name || ''} {conv.other_user?.last_name || ''}
 </h4>
 <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
 {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 </div>
 <p className={`text-xs truncate leading-relaxed ${conv.unread_count > 0 ? 'text-teal-700 font-semibold' : 'text-stone-500'}`}>
 {formatMessagePreview(conv.last_message?.message)}
 </p>
 </div>
 {conv.unread_count > 0 && (
 <div className="flex-shrink-0 self-center">
 <span className="size-5 bg-teal-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-md shadow-teal-200">
 {conv.unread_count}
 </span>
 </div>
 )}
 </button>
 ))
 )}
 </div>
 </div>

 {/* --- RIGHT: Chat Area --- */}
 <div className={`flex-1 flex flex-col bg-stone-50/30 backdrop-blur-sm relative ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
 {selectedConversation ? (
 <>
 <header className="h-20 px-8 flex items-center justify-between bg-white border-b border-stone-100 z-10">
 <div className="flex items-center gap-4">
 <button className="md:hidden -ml-2 p-2 hover:bg-stone-50 rounded-full" onClick={() => setSelectedChat(null)}>
 <ArrowLeft className="size-5 text-stone-500" />
 </button>
 <div className="relative">
 <div className="size-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center font-bold">
 {selectedConversation.other_user.first_name[0]}
 </div>
 {selectedConversation.other_user.online && <span className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 border-2 border-white rounded-full" />}
 </div>
 <div>
 <h3 className="text-base font-semibold text-stone-900 leading-tight">
 {selectedConversation.other_user.first_name} {selectedConversation.other_user.last_name}
 </h3>
 <div className="flex items-center gap-1.5 mt-0.5">
 <div className={`size-1.5 rounded-full ${selectedConversation.other_user.online ? 'bg-emerald-500' : 'bg-stone-300'}`} />
 <span className="text-xs font-medium text-stone-500">
 {selectedConversation.other_user.online ? 'Online' : 'Offline'}
 </span>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={handleCreateMeeting}
 className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-medium transition-colors text-sm"
 title="Create Video Meeting"
 >
 <Video className="size-4" />
 <span className="hidden sm:inline">Meeting</span>
 </button>
 <Link to={`/provider/user?id=${selectedConversation.other_user_id}`}>
 <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-600 font-medium transition-colors text-sm">
 <User className="size-4" />
 <span className="hidden sm:inline">Profile</span>
 </button>
 </Link>
 </div>
 </header>

 <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-[#FAFAFA]">
 <div className="flex justify-center">
 <span className="px-3 py-1 rounded-full bg-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-wide">Today</span>
 </div>
 {messages.map((msg, i) => {
 const isMe = msg.right !== undefined ? msg.right : msg.user_id === user?.id;
 const isLast = i === messages.length - 1;
 let msgType = msg.type || 'text';
 let msgUrl = msg.file_url;
 let msgContent: string | null = msg.message;
 let msgDuration = msg.duration;
 let msgName = msg.file_name;

 // Legacy Parser
 if (msgType === 'text' && msgContent && typeof msgContent === 'string' && msgContent.trim().startsWith('{')) {
 try {
 const parsed = JSON.parse(msgContent);
 if (parsed && typeof parsed === 'object') {
 if (parsed.url && parsed.url.startsWith('blob:')) {
 msgType = parsed.type || 'audio';
 msgUrl = ''; // Invalid blob
 msgContent = null;
 } else {
 msgType = parsed.type || 'text';
 msgUrl = parsed.url;
 msgContent = parsed.message;
 }
 if (parsed.duration) msgDuration = parsed.duration;
 if (parsed.name) msgName = parsed.name;
 }
  } catch (e) {
  console.error('Failed to parse message:', e);
  msgType = 'text';
  msgContent = '[Message unavailable]';
  }
  }
 if (msgUrl && msgUrl.startsWith('/')) msgUrl = `${API_URL.replace('/api', '')}${msgUrl}`;

 return (
 <m.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
 className={`flex gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
 >
 {!isMe && (
 <div className="flex-shrink-0 self-end">
 <div className="size-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500">
 {selectedConversation.other_user.first_name[0]}
 </div>
 </div>
 )}
 <div className={`flex flex-col gap-1 max-w-[80%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
 <div className={`px-5 py-3.5 shadow-sm text-[15px] leading-relaxed break-words relative ${isMe ? 'bg-teal-600 text-white rounded-[1.5rem] rounded-tr-none' : 'bg-white text-stone-700 border border-stone-100 rounded-[1.5rem] rounded-tl-none' }`}>
 {msgType === 'audio' ? (
 <AudioPlayer src={msgUrl || ''} duration={msgDuration || 0} isMe={isMe} />
 ) : msgType === 'image' && msgUrl ? (
 <img width={100} height={100} src={msgUrl} alt={msgName || 'Image'} className="max-w-full h-auto rounded-lg" loading="lazy" />
 ) : msgType === 'file' && msgUrl ? (
 <a href={msgUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-lg ${isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-stone-100 hover:bg-stone-200'} text-sm font-medium`}>
 <FileText className="size-5" />
 <span>{msgName || 'Attached File'}</span>
 </a>
 ) : (
 msgContent?.includes('/meeting/room_') || msgContent?.includes('Join Video Meeting')
 ? (
 <div className="flex flex-col gap-3 min-w-[180px]">
 <div className="flex items-center gap-2 font-bold opacity-90"><Video className="size-4" /> Video Meeting</div>
 <a href={msgContent.match(/https?:\/\/[^\s]+/)?.[0] || '#'} target="_blank" className={`flex items-center justify-center py-2.5 rounded-lg font-bold text-xs uppercase tracking-wide shadow-lg mx-auto w-full ${isMe ? 'bg-white text-teal-600' : 'bg-teal-600 text-white'}`}>
 Join Now
 </a>
 </div>
 )
 : (msgContent || '')
 )}
 </div>
 <div className="flex items-center gap-1.5 px-1">
 <span className="text-[10px] font-medium text-stone-400">
 {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 {isMe && (isLast ? <CheckCheck className="size-3.5 text-teal-500" /> : <Check className="size-3.5 text-stone-300" />)} 
 </div>
 </div>
 </m.div>
 );
 })}
 <div ref={messagesEndRef} />
 </div>

 <div className="p-6 bg-white border-t border-stone-100">
 {!isRecording ? (
 <div className="flex items-center gap-3 max-w-4xl mx-auto">
 <div className="flex gap-1">
 <label className="p-2.5 text-teal-700 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors cursor-pointer">
 <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAndSend(e.target.files[0], 'file')} />
 <Paperclip className="size-5" />
 </label>
 <label className="p-2.5 text-teal-700 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors cursor-pointer">
 <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAndSend(e.target.files[0], 'image')} />
 <ImageIcon className="size-5" />
 </label>
 <button onClick={startRecording} className="p-2.5 text-red-700 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
 <Mic className="size-5" />
 </button>
 </div>
 <div className="flex-1 bg-stone-50 border border-stone-200 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 rounded-2xl px-2 py-1 transition-all">
 <textarea value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
 disabled={sending} placeholder="Type something..." className="w-full bg-transparent border-none focus:ring-0 text-stone-800 placeholder:text-stone-400 max-h-32 min-h-[44px] py-2.5 px-2 resize-none text-sm flex items-center" />
 </div>
 <button onClick={handleSendMessage} disabled={!message.trim() || sending} className={`p-3.5 rounded-xl flex-shrink-0 transition-all shadow-lg flex items-center justify-center ${message.trim() && !sending ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-stone-100 text-stone-300 cursor-not-allowed shadow-none'}`}>
 {sending ? <div className="size-5 border-2 border-stone-300 border-t-teal-600 rounded-full animate-spin" /> : <Send className="size-5 ml-0.5" />}
 </button>
 </div>
 ) : (
 <div className="flex items-center gap-4 max-w-4xl mx-auto animate-in fade-in duration-300">
 <div className="flex-1 bg-red-50 border border-red-100 rounded-2xl p-3 flex items-center gap-4">
 <div className="size-3 bg-red-500 rounded-full animate-pulse" />
 <span className="text-red-600 font-bold tabular-nums">{formatTime(recordingTime)}</span>
 <div className="flex-1 h-8 flex items-center gap-1 opacity-50">
 {[...Array(20)].map((_, i) => <div key={`skeleton-${i}`} className="w-1 bg-red-400 rounded-full animate-pulse" style={{ height: visualizerHeights[i] + '%', animationDelay: i * 0.05 + 's' }} />)}
 </div>
 </div>
 <button onClick={() => stopRecording(false)} className="p-3.5 rounded-xl bg-stone-100 text-stone-500 hover:bg-stone-200 font-medium">Cancel</button>
 <button onClick={() => stopRecording(true)} className="p-3.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-200"><Send className="size-5 ml-0.5" /></button>
 </div>
 )}
 </div>
 </>
 ) : (
 <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-stone-50/50">
 <div className="size-24 bg-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-stone-200/50 mb-6 relative">
 <div className="absolute inset-0 bg-gradient-to-tr from-teal-50 to-emerald-50 rounded-[2rem] opacity-50" />
 <MessageCircle className="size-10 text-stone-300 relative z-10" />
 </div>
 <h2 className="text-2xl font-semibold text-stone-900 mb-2">No Chat Selected</h2>
 <p className="text-stone-500 max-w-xs">Select a client from the sidebar to start messaging.</p>
 </div>
 )}
 </div>
 </div>
 );
}
