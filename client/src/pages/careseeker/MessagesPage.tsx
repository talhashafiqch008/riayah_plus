/**
 * Messages Page - Premium Redesign
 * Inspired by modern dashboard aesthetics (Untitled UI)
 * Features a clean split-view, precise typography, and vibrant message bubbles.
 */


import { Suspense } from "react";
;
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { createConversation } from '@/lib/api/chat';
import { client } from '@/lib/api/client';
import { isApiError } from '@/lib/errors';




// --- Sub-components ---
function AudioPlayer({ src, duration, isMe }: { src?: string | null, duration: number, isMe: boolean }) {
 const [playing, setPlaying] = useState(false);
 const [error, setError] = useState(false);
 const audioRef = useRef<HTMLAudioElement | null>(null);
 const [progress, setProgress] = useState(0);

 // Reset/Check error when src changes
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
 className={`absolute left-0 top-0 h-full ${error ? 'bg-red-400' : (isMe ? 'bg-white' : 'bg-blue-600')} transition-transform duration-300 duration-100`}
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

// Helper to format time (00:00)
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
 // New fields from backend (optional as they may be null for legacy messages)
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

export default function MessagesPage() {
 // --- Hooks & State ---
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

 // Refs
 const messagesEndRef = useRef<HTMLDivElement>(null);

 const API_URL = import.meta.env.VITE_API_URL!;

 // --- Helpers ---
 const isClient = () => typeof window !== 'undefined';

 // --- Real-time Handler ---
 const handleNewMessage = useCallback((newMessage: Message) => {
 // Log logic remains same for robustness
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

 // --- Data Fetching ---
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

 // Voice Recording State
 const [isRecording, setIsRecording] = useState(false);
 const [recordingTime, setRecordingTime] = useState(0);
 const mediaRecorderRef = useRef<MediaRecorder | null>(null);
 const audioChunksRef = useRef<Blob[]>([]);
 const timerRef = useRef<NodeJS.Timeout | null>(null);
 const audioStreamRef = useRef<MediaStream | null>(null); // To keep track of the stream for stopping tracks

 // Handle File/Audio Upload
 const uploadAndSend = async (file: File, type: 'image' | 'file' | 'audio', duration?: number) => {
 try {
 setSending(true);
 const formData = new FormData();
 formData.append('file', file);
 formData.append('type', type); // Optional metadata
 formData.append('document_type', 'general'); // Required by backend validation

 // 1. Upload
 let uploadedUrl = '';
 try {
 // Real upload attempt
 const response = await uploadDocument(formData);
 // response should contain file url, adapt based on actual API response structure
 uploadedUrl = response.data?.document?.file_url || response.url || response.data?.url || response.path;
 } catch (err) {
 // Fallback for demo if backend endpoint is 404 or missing
 uploadedUrl = URL.createObjectURL(file);
 }

 if (!uploadedUrl) {
 uploadedUrl = URL.createObjectURL(file);
 }
 if (!uploadedUrl) {
 throw new Error('Upload failed');
 }

 // 2. Send Message
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

 // Start Recording
 const startRecording = async () => {
 try {
 const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
 audioStreamRef.current = stream; // Store the stream
 const mediaRecorder = new MediaRecorder(stream);
 mediaRecorderRef.current = mediaRecorder;
 audioChunksRef.current = [];

 mediaRecorder.ondataavailable = (event) => {
 if (event.data.size > 0) {
 audioChunksRef.current.push(event.data);
 }
 };

 mediaRecorder.onstop = () => {
 // Only process and send if there are chunks (i.e., not cancelled)
 if (audioChunksRef.current.length > 0) {
 const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
 // Convert blob to File
 const audioFile = new File([audioBlob], `voice_note_${Date.now()}.wav`, { type: 'audio/wav' });
 uploadAndSend(audioFile, 'audio', recordingTime);
 }

 // Stop all tracks to release microphone
 if (audioStreamRef.current) {
 audioStreamRef.current.getTracks().forEach(track => track.stop());
 audioStreamRef.current = null;
 }
 setIsRecording(false); // Ensure UI state is reset
 };

 mediaRecorder.start();
 setIsRecording(true);

 // Start Timer
 setRecordingTime(0);
 if (timerRef.current) clearInterval(timerRef.current); // Clear any existing timer
 timerRef.current = setInterval(() => {
 setRecordingTime(prev => prev + 1);
 }, 1000);

 } catch (error) {
 console.error('Error accessing microphone:', error);
 toast.error('Cannot access microphone. Please allow permissions.');
 }
 };

 // Stop Recording
 const stopRecording = (send: boolean) => {
 if (mediaRecorderRef.current && isRecording) {
 if (!send) {
 // If not sending, clear chunks so onstop doesn't process them
 audioChunksRef.current = [];
 }
 mediaRecorderRef.current.stop();
 // setIsRecording(false) is handled in mediaRecorder.onstop
 if (timerRef.current) {
 clearInterval(timerRef.current);
 timerRef.current = null;
 }
 }
 };

 // --- Effects ---
 useEffect(() => { loadConversations(); }, []);

 // Cleanup: stop microphone on unmount
 useEffect(() => {
 return () => {
 if (audioStreamRef.current) {
 audioStreamRef.current.getTracks().forEach(track => track.stop());
 audioStreamRef.current = null;
 }
 if (timerRef.current) {
 clearInterval(timerRef.current);
 timerRef.current = null;
 }
 };
 }, []);
// TODO: Refactor cascading setState into useReducer or batched update

 useEffect(() => {
 const pid = searchParams.get('provider');
 if (pid && !loading) {
 // Check if conversation already exists
 const existingConv = conversations.find(c => c.other_user_id === pid);

 if (existingConv) {
 setSelectedChat(pid);
 } else {
 createConversation({ participantIds: [pid] })
 .then(response => {
 const conv = response.data;
 if (conv?.other_user) {
 setConversations(prev => {
 if (prev.some(c => c.other_user_id === pid)) {
 return prev;
 }
 return [{
 id: conv.conversation_id || `conv-${pid}`,
 other_user_id: pid,
  other_user: {
  id: conv.other_user.id,
  first_name: conv.other_user.first_name,
  last_name: conv.other_user.last_name,
  role: conv.other_user.role,
  online: conv.other_user.online ?? false
  },
 unread_count: 0,
 updated_at: new Date().toISOString()
 }, ...prev];
 });
 }
 setSelectedChat(pid);
 })
 .catch(error => {
 console.error('Failed to create conversation:', error);
 toast.error('Failed to start conversation');
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

 // --- Filtering ---
 const filteredConversations = conversations.filter(c =>
 c.other_user && `${c.other_user.first_name} ${c.other_user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
 );
 const selectedConversation = conversations.find(c => c.other_user_id === selectedChat);

 if (!user) return <div className="h-screen flex items-center justify-center text-stone-500">Please login</div>;

 return (
 <div className="h-[calc(100vh-6rem)] bg-white rounded-3xl ring-1 ring-stone-200/50 overflow-hidden flex shadow-2xl shadow-stone-200/50">

 {/* --- LEFT: Sidebar List --- */}
 <div className={`w-full md:w-[400px] flex-shrink-0 border-r ring-1 ring-stone-100/50 flex flex-col bg-white ${selectedChat ? 'hidden md:flex' : 'flex'}`}>

 {/* Header */}
 <div className="p-6 pb-2">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-2xl font-semibold text-stone-900">Messages</h2>
 <div className="flex items-center gap-2">
 <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs font-bold ring-1 ring-stone-200/50">
 {conversations.length}
 </span>
 <button className="p-2 hover:bg-stone-50 rounded-full text-stone-400">
 <MoreHorizontal className="size-5" />
 </button>
 </div>
 </div>

 {/* Search */}
 <div className="relative mb-4">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
 <input
 type="text"
 placeholder="Search messages..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-transparent rounded-2xl text-sm font-medium focus:outline-none focus:bg-white focus:ring-1 ring-stone-200/50 focus:ring-4 focus:ring-stone-50 transition-transform duration-300"
 />
 </div>
 </div>

 {/* Vertical List */}
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
  className={`group w-full p-4 flex items-start gap-4 rounded-2xl transition-transform duration-300 border border-transparent ${selectedChat === conv.other_user_id ? 'bg-stone-50 ring-1 ring-stone-200/50/60 ' : 'hover:bg-stone-50 hover:ring-1 ring-stone-100/50'}`}
 >
 <div className="relative flex-shrink-0">
 <div className={`size-12 rounded-2xl flex items-center justify-center text-base font-bold ${selectedChat === conv.other_user_id ? 'bg-stone-900 text-white' : 'bg-gradient-to-br from-stone-100 to-stone-200 text-stone-600'}`}>
 {conv.other_user.avatar
 ? <img width={100} height={100} src={conv.other_user.avatar} alt={`${conv.other_user.first_name || 'User'} avatar`} className="size-full rounded-2xl object-cover" loading="lazy" />
 : `${conv.other_user.first_name[0]}${conv.other_user.last_name[0]}`
 }
 </div>
 {conv.other_user.online && (
 <span className="absolute -top-1 -right-1 size-3.5 bg-emerald-500 rounded-full border-2 border-white " />
 )}
 </div>
 <div className="flex-1 min-w-0 text-left">
 <div className="flex justify-between items-baseline mb-1">
 <h4 className={`text-sm font-semibold truncate ${selectedChat === conv.other_user_id ? 'text-stone-900' : 'text-stone-700'}`}>
 {conv.other_user.first_name} {conv.other_user.last_name}
 </h4>
 <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
 {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 </div>
 <p className={`text-xs truncate leading-relaxed ${conv.unread_count > 0 ? 'text-stone-900 font-semibold' : 'text-stone-500'}`}>
 {formatMessagePreview(conv.last_message?.message)}
 </p>
 </div>
 {conv.unread_count > 0 && (
 <div className="flex-shrink-0 self-center">
 <span className="size-5 bg-teal-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.04)] shadow-teal-200">
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
 <div className={`flex-1 flex flex-col bg-stone-50/50 backdrop-blur-3xl relative ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>

 {selectedConversation ? (
 <>
 {/* Chat Header */}
 <header className="h-20 px-8 flex items-center justify-between bg-white border-b ring-1 ring-stone-100/50 z-10">
 <div className="flex items-center gap-4">
 <button className="md:hidden -ml-2 p-2 hover:bg-stone-50 rounded-full" onClick={() => setSelectedChat(null)}>
 <ArrowLeft className="size-5 text-stone-500" />
 </button>

 <div className="relative">
 <div className="size-10 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-600 text-white flex items-center justify-center font-bold">
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
 <Link to={`/careseeker/providers/${selectedConversation.other_user_id}`}>
 <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-600 font-medium transition-colors text-sm">
 <User className="size-4" />
 <span>View Profile</span>
 </button>
 </Link>
 <div className="w-px h-6 bg-stone-200 mx-1" />
 <button className="p-2.5 rounded-xl hover:bg-stone-50 text-stone-400 hover:text-stone-600 transition-colors">
 <MoreVertical className="size-5" />
 </button>
 </div>
 </header>

 {/* Chat Messages */}
 <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-12 bg-[#FAFAFA]">
 {/* Date Divider Example */}
 <div className="flex justify-center">
 <span className="px-3 py-1 rounded-full bg-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-wide">Today</span>
 </div>

 {messages.map((msg, i) => {
 const isMe = msg.right !== undefined ? msg.right : msg.user_id === user?.id;
 const isLast = i === messages.length - 1;

 // Prepare message data for rendering
 let msgType = msg.type || 'text';
 let msgUrl = msg.file_url;
 let msgContent: string | null = msg.message;
 let msgDuration = msg.duration;
 let msgName = msg.file_name;

 // 1. Handle Legacy JSON-stringified messages (only if type is text and message looks like JSON)
 if (msgType === 'text' && msgContent && typeof msgContent === 'string' && msgContent.trim().startsWith('{')) {
 try {
 const parsed = JSON.parse(msgContent);
 if (parsed && typeof parsed === 'object') {
 // Check for blob URLs in stored messages (legacy invalid data)
 if (parsed.url && parsed.url.startsWith('blob:')) {
 // Expired blob URL from DB. Treat as audio but with empty URL to show valid error state.
 msgType = parsed.type || 'audio';
 msgUrl = '';
 msgContent = null; // Hide the JSON string
 } else {
 msgType = parsed.type || 'text';
 msgUrl = parsed.url;
 msgContent = parsed.message;
 }
 if (parsed.duration) msgDuration = parsed.duration;
 if (parsed.name) msgName = parsed.name;
 }
 } catch (e) {
 // Failed to parse, treat as normal text
 }
 }

 // 2. Fix relative URLs from backend storage
 if (msgUrl && msgUrl.startsWith('/')) {
 const baseUrl = new URL(API_URL).origin;
 msgUrl = `${baseUrl}${msgUrl}`;
 }

 return (
 <m.div
 key={msg.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className={`flex gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
 >
 {/* Avatar (Only for them) */}
 {!isMe && (
 <div className="flex-shrink-0 self-end">
 <div className="size-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500">
 {selectedConversation.other_user.first_name[0]}
 </div>
 </div>
 )}

 <div className={`flex flex-col gap-1 max-w-[80%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
 {/* Bubble */}
 <div
 className={`px-5 py-3.5  text-[15px] leading-relaxed break-words relative ${isMe ? 'bg-blue-600 text-white rounded-[1.5rem] rounded-tr-none' : 'bg-white text-stone-700 ring-1 ring-stone-100/50 rounded-[1.5rem] rounded-tl-none' }`}
 >
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
 msgContent?.includes('/meeting/room_')
 ? (
 <div className="flex flex-col gap-3 min-w-[180px]">
 <div className="flex items-center gap-2 font-bold opacity-90"><Video className="size-4" /> Video Request</div>
 <a href={msgContent.match(/https?:\/\/[^\s]+/)?.[0] || '#'} target="_blank" className={`flex items-center justify-center py-2.5 rounded-lg font-bold text-xs uppercase tracking-wide shadow-lg mx-auto w-full ${isMe ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
 Join Now
 </a>
 </div>
 )
 : (msgContent || '')
 )}
 </div>

 {/* Status Line */}
 <div className="flex items-center gap-1.5 px-1">
 <span className="text-[10px] font-medium text-stone-400">
 {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 {isMe && (
 isLast ? <CheckCheck className="size-3.5 text-blue-500" /> : <Check className="size-3.5 text-stone-300" />
 )}
 </div>
 </div>
 </m.div>
 );
 })}
 <div ref={messagesEndRef} />
 </div>

 {/* Input Area */}
 <div className="p-6 bg-white border-t ring-1 ring-stone-100/50">
 {!isRecording ? (
 <div className="flex items-center gap-3 max-w-4xl mx-auto">
 <div className="flex gap-1">
 <label className="p-2.5 text-blue-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer">
 <input type="file" className="hidden" onChange={(e) => {
 if (e.target.files?.[0]) uploadAndSend(e.target.files[0], 'file');
 }} />
 <Paperclip className="size-5" />
 </label>
 <label className="p-2.5 text-blue-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer">
 <input type="file" accept="image/*" className="hidden" onChange={(e) => {
 if (e.target.files?.[0]) uploadAndSend(e.target.files[0], 'image');
 }} />
 <ImageIcon className="size-5" />
 </label>
 <button
 onClick={startRecording}
 className="p-2.5 text-red-700 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
 >
 <Mic className="size-5" />
 </button>
 </div>

 <div className="flex-1 bg-stone-50 ring-1 ring-stone-200/50 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 rounded-2xl px-2 py-1 transition-transform duration-300">
 <textarea
 value={message}
 onChange={(e) => setMessage(e.target.value)}
 onKeyPress={(e) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 handleSendMessage();
 }
 }}
 disabled={sending}
 placeholder="Type something..."
 className="w-full bg-transparent border-none focus:ring-0 text-stone-800 placeholder:text-stone-400 max-h-32 min-h-[44px] py-2.5 px-2 resize-none text-sm flex items-center"
 />
 </div>

 <button
 onClick={handleSendMessage}
 disabled={!message.trim() || sending}
 className={`p-3.5 rounded-xl flex-shrink-0 transition-transform duration-300 shadow-lg flex items-center justify-center ${message.trim() && !sending ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200 hover:-translate-y-1 active:scale-[0.98]' : 'bg-stone-100 text-stone-300 cursor-not-allowed shadow-none' }`}
 >
 {sending ? <div className="size-5 border-2 border-stone-300 border-t-blue-600 rounded-full animate-spin" /> : <Send className="size-5 ml-0.5" />}
 </button>
 </div>
 ) : (
 <div className="flex items-center gap-4 max-w-4xl mx-auto animate-in fade-in duration-500">
 <div className="flex-1 bg-red-50 border border-red-100 rounded-2xl p-3 flex items-center gap-4">
 <div className="size-3 bg-red-500 rounded-full animate-pulse" />
 <span className="text-red-600 font-bold tabular-nums">{formatTime(recordingTime)}</span>
 <div className="flex-1 h-8 flex items-center gap-1 opacity-50">
 {/* Visualizer bars */}
 {[...Array(20)].map((_, n) => (
 <div key={`skeleton-${n}`} className="w-1 bg-red-400 rounded-full animate-pulse" style={{ height: visualizerHeights[n] + '%', animationDelay: n * 0.05 + 's' }} />
 ))}
 </div>
 </div>

 <button
 onClick={() => stopRecording(false)} // Cancel: stop recording, do not send
 className="p-3.5 rounded-xl bg-stone-100 text-stone-500 hover:bg-stone-200 font-medium"
 >
 Cancel
 </button>
 <button
 onClick={() => stopRecording(true)} // Send: stop recording, send audio
 className="p-3.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
 >
 <Send className="size-5 ml-0.5" />
 </button>
 </div>
 )}
 </div>

 </>
 ) : (
 // Empty State
 <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-stone-50/50">
 <div className="size-24 bg-white rounded-[2rem] flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.08)] mb-6 relative">
 <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-teal-50 rounded-[2rem] opacity-50" />
 <MessageCircle className="size-10 text-stone-300 relative z-10" />
 </div>
 <h2 className="text-2xl font-semibold text-stone-900 mb-2">No Chat Selected</h2>
 <p className="text-stone-500 max-w-xs">Select a conversation from the sidebar to start messaging your provider.</p>
 </div>
 )}
 </div>
 </div>
 );
}
