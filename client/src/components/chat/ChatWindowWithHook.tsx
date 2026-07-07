
import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { useAuth } from '@/contexts/AuthContext';
import { Send } from 'lucide-react';
import { useChatEcho } from '@/hooks/useEcho';
import { client } from '@/lib/api/client';

interface Message {
 id: string | number;
 user_id: string | number;
 receiver_id: string | number;
 message: string;
 created_at: string;
 sender?: {
 first_name: string;
 last_name: string;
 };
}

interface ChatWindowWithHookProps {
 receiverId: string;
}

export function ChatWindowWithHook({ receiverId }: ChatWindowWithHookProps) {
 const [messages, setMessages] = useState<Message[]>([]);
 const [newMessage, setNewMessage] = useState('');
 const [loading, setLoading] = useState(true);
 const [sending, setSending] = useState(false);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 const { user } = useAuth();

 const handleNewMessage = useCallback((message: Message) => {
 setMessages((prev) => {
 const exists = prev.some(msg => msg.id === message.id);
 if (exists) return prev;
 return [...prev, message];
 });
 }, []);

 const { isConnected } = useChatEcho(user?.id || '', handleNewMessage);

 const loadMessages = async () => {
 if (!receiverId) return;

 try {
 setLoading(true);
 const response = await client.get(`/chat/${receiverId}`);
 setMessages(response.data.data?.messages || []);
 } catch (error) {
 console.error('Failed to load messages:', error);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadMessages();
 }, [receiverId]);

 useEffect(() => {
 scrollToBottom();
 }, [messages]);

 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 };

 const sendMessage = async () => {
 if (!newMessage.trim() || !receiverId || sending) return;

 try {
 setSending(true);
 await client.post(`/chat/${receiverId}`, {
 message: newMessage.trim(),
 });
 setNewMessage('');
 } catch (error) {
 console.error('Failed to send message:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'فشل إرسال الرسالة. حاول مرة أخرى.');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('فشل إرسال الرسالة. حاول مرة أخرى.');
 }
 } finally {
 setSending(false);
 }
 };

 const handleKeyPress = (e: React.KeyboardEvent) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 sendMessage();
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-full">
 <div className="animate-spin rounded-full size-8 border-b-2 border-teal-600"></div>
 </div>
 );
 }

 return (
 <div className="flex flex-col h-full bg-white rounded-xl shadow-sm">
 <div className="px-4 py-2 border-b bg-stone-50">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className={`size-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
 <span className="text-sm text-stone-600">
 {isConnected ? 'متصل' : 'غير متصل'}
 </span>
 </div>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto p-4 space-y-4">
 {messages.length === 0 ? (
 <div className="flex items-center justify-center h-full text-stone-500">
 لا توجد رسائل بعد. ابدأ المحادثة!
 </div>
 ) : (
 messages.map((message) => {
 const isOwnMessage = String(message.user_id) === String(user?.id);
 return (
 <div
 key={message.id}
 className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
 >
 <div
 className={`max-w-[70%] rounded-lg px-4 py-2 ${isOwnMessage ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-900' }`}
 >
 {!isOwnMessage && message.sender && (
 <div className="text-xs font-semibold mb-1">
 {message.sender.first_name} {message.sender.last_name}
 </div>
 )}
 <div className="text-sm whitespace-pre-wrap">{message.message}</div>
 <div className={`text-xs mt-1 ${isOwnMessage ? 'text-teal-100' : 'text-stone-500'}`}>
 {new Date(message.created_at).toLocaleTimeString('ar-EG', {
 hour: '2-digit',
 minute: '2-digit'
 })}
 </div>
 </div>
 </div>
 );
 })
 )}

 <div ref={messagesEndRef} />
 </div>

 <div className="border-t p-4">
 <div className="flex items-end gap-2">
 <textarea
 value={newMessage}
 onChange={(e) => setNewMessage(e.target.value)}
 onKeyPress={handleKeyPress}
 placeholder="اكتب رسالة..."
 className="flex-1 resize-none rounded-lg border border-stone-300 px-4 py-2 focus:border-teal-500 focus:outline-none"
 rows={1}
 disabled={sending || !isConnected}
 dir="rtl"
 />
 <button
 onClick={sendMessage}
 disabled={!newMessage.trim() || sending || !isConnected}
 className="rounded-lg bg-teal-600 p-2 text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 {sending ? (
 <div className="animate-spin rounded-full size-5 border-b-2 border-white"></div>
 ) : (
 <Send className="size-5" />
 )}
 </button>
 </div>
 </div>
 </div>
 );
}
