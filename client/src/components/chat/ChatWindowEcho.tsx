
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { useAuth } from '@/contexts/AuthContext';
import { Send } from 'lucide-react';
import { acquireSharedEcho, releaseSharedEcho } from '@/lib/echo';
import { client } from '@/lib/api/client';

interface Message {
 id: string;
 sender_id: string;
 receiver_id: string;
 message: string;
 created_at: string;
 sender?: {
 first_name: string;
 last_name: string;
 };
}

interface ChatWindowEchoProps {
 receiverId: string;
}

interface ChatEventPayload {
 message: Message;
}

export function ChatWindowEcho({ receiverId }: ChatWindowEchoProps) {
 const [messages, setMessages] = useState<Message[]>([]);
 const [newMessage, setNewMessage] = useState('');
 const [loading, setLoading] = useState(true);
 const [sending, setSending] = useState(false);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 const { user } = useAuth();

 // Load messages from API
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
 useEffect(() => { /* oxlint-disable-line effect-needs-cleanup */
 if (!user?.id) return;
 const echo = acquireSharedEcho();
 if (!echo) return;

 const channelName = `chat.${user.id}`;
 const channel = echo.private(channelName);

 const handleChat = (event: ChatEventPayload) => {
 if (event.message) {
 setMessages((prev) => {
 const exists = prev.some(msg => msg.id === event.message.id);
 if (exists) return prev;
 return [...prev, event.message];
 });
 }
 };

 channel.on('.chat', handleChat);

 return () => {
 channel.stopListening('.chat');
 echo.leave(channelName);
 releaseSharedEcho();
 };
 }, [user?.id]);

 // Auto-scroll to bottom when messages change
 useEffect(() => {
 scrollToBottom();
 }, [messages]);

 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 };

 // Send message via API
 const sendMessage = async () => {
 if (!newMessage.trim() || !receiverId || sending) return;

 try {
 setSending(true);
 await client.post(`/chat/${receiverId}`, {
 message: newMessage.trim(),
 });

 // Clear input - the message will be added via Echo event
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
 {/* Messages List */}
 <div className="flex-1 overflow-y-auto p-4 gap-y-4">
 {messages.length === 0 ? (
 <div className="flex items-center justify-center h-full text-stone-500">
 لا توجد رسائل بعد. ابدأ المحادثة!
 </div>
 ) : (
 messages.map((message) => {
 const isOwnMessage = message.sender_id === user?.id;
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

 {/* Message Input */}
 <div className="border-t p-4">
 <div className="flex items-end gap-x-2 gap-2">
 <textarea
 value={newMessage}
 onChange={(e) => setNewMessage(e.target.value)}
 onKeyPress={handleKeyPress}
 placeholder="اكتب رسالة..."
 className="flex-1 resize-none rounded-lg border border-stone-300 px-4 py-2 focus:border-teal-500 focus:outline-none"
 rows={1}
 disabled={sending}
 dir="rtl"
 />
 <button
 onClick={sendMessage}
 disabled={!newMessage.trim() || sending}
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
