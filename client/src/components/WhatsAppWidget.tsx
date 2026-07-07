
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from 'react';
import { Send, X, MoreHorizontal, Smile, Paperclip, ChevronDown, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Logo from './Logo';
import { client } from '@/lib/api/client';

// ... (rest of imports are fine as they were)

interface WhatsAppWidgetProps {
 selectedCategory?: string;
}

export const WhatsAppWidget = ({ selectedCategory = "General Inquiry" }: WhatsAppWidgetProps) => {
 const [isOpen, setIsOpen] = useState(false);
 const [message, setMessage] = useState('');
 // TODO: Add isPending loading state
 const [isLoading, setIsLoading] = useState(false);
 // Initial State with standard welcome message
 const [messages, setMessages] = useState<{ id: number, text: string, isUser: boolean, time: string }[]>([
 { id: 1, text: "Hello — Raiyah chatbot here. How can I help you today?", isUser: false, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
 ]);

 const inputRef = useRef<HTMLInputElement>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 // Auto scroll to bottom
 useEffect(() => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [messages, isOpen, isLoading]);

 // Auto focus
 // TODO: Move event handler out of effect
 useEffect(() => {
 if (isOpen) {
 const timeoutId = setTimeout(() => inputRef.current?.focus(), 100);
 return () => clearTimeout(timeoutId);
 }
 }, [isOpen]);

 const handleSend = async (e?: React.FormEvent) => {
 if (e) e.preventDefault();
 if (!message.trim() || isLoading) return;

 // Add User Message
 const userMsg = {
 id: Date.now(),
 text: message,
 isUser: true,
 time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
 };

 setMessages(prev => [...prev, userMsg]);
 const currentMessage = message;
 setMessage('');
 setIsLoading(true);

 try {
 // Using the real API endpoint
 const response = await client.post('/ai/website-chat', { message: currentMessage });

 const data = response.data;

 // Handle expected response format
 // Assuming the backend returns { reply: "..." } or { data: "..." } or { message: "..." }
 const botResponse = data.reply || data.message || data.response || (typeof data === 'string' ? data : "Received.");

 const botMsg = {
 id: Date.now() + 1,
 text: botResponse,
 isUser: false,
 time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
 };
 setMessages(prev => [...prev, botMsg]);

 } catch (error) {
 console.error('Chat error:', error);
 const botMsg = {
 id: Date.now() + 1,
 text: "Sorry, I'm having trouble connecting to the server. Please check your connection and try again.",
 isUser: false,
 time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
 };
 setMessages(prev => [...prev, botMsg]);
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <div>
 <AnimatePresence>
 {isOpen && (
 <m.div
 initial={{ opacity: 0, y: 20, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 20, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 className="fixed bottom-24 right-6 z-50 w-[380px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-stone-100 flex flex-col font-sans"
 style={{ height: '600px', maxHeight: 'calc(100vh - 120px)' }}
 >
 {/* Header - Clean White Style */}
 <div className="bg-white p-4 flex items-center justify-between border-b border-stone-100 relative z-10">
 <div className="flex items-center gap-3">
 <div className="size-10 bg-stone-50 rounded-full flex items-center justify-center overflow-hidden border border-stone-100">
 <Logo size="sm" showText={false} animated={false} />
 </div>
 <div>
 <h3 className="font-semibold text-sm text-stone-900 leading-tight">Raiyah Support</h3>
 <div className="flex items-center gap-1.5 mt-0.5">
 <span className="size-2 rounded-full bg-[#84cc16]"></span>
 <p className="text-xs text-stone-500 font-medium">Online</p>
 </div>
 </div>
 </div>
 <button className="text-stone-400 hover:text-stone-600 transition-colors">
 <MoreHorizontal size={20} />
 </button>
 </div>

 {/* Chat Area - Clean White BG */}
 <div className="flex-1 p-5 overflow-y-auto bg-white">
 {messages.map((msg) => (
 <m.div
 key={msg.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className={`flex w-full mb-4 ${msg.isUser ? 'justify-end' : 'justify-start'}`}
 >
 <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${msg.isUser ? 'bg-[#84cc16] text-white rounded-br-none' : 'bg-stone-100 text-stone-800 rounded-bl-none' }`}>
 <ReactMarkdown
 remarkPlugins={[remarkGfm]}
 components={{
 ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
 ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
 li: ({ node, ...props }) => <li className="" {...props} />,
 p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
 strong: ({ node, ...props }) => <span className="font-bold" {...props} />,
 }}
 >
 {msg.text}
 </ReactMarkdown>
 </div>
 </m.div>
 ))}

 {/* Typing Indicator */}
 {isLoading && (
 <m.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex w-full mb-4 justify-start"
 >
 <div className="bg-stone-100 text-stone-800 rounded-2xl rounded-bl-none p-3.5 flex items-center gap-1">
 <div className="size-1.5 bg-stone-400 rounded-full animate-easeInOut"></div>
 <div className="size-1.5 bg-stone-400 rounded-full animate-easeInOut delay-100"></div>
 <div className="size-1.5 bg-stone-400 rounded-full animate-easeInOut delay-200"></div>
 </div>
 </m.div>
 )}

 <div ref={messagesEndRef} />
 </div>

 {/* Footer / Input Area */}
 <div className="p-4 bg-white border-t border-stone-100">
 <form
 onSubmit={handleSend}
 className="flex items-center gap-2 border border-stone-200 rounded-full p-2 pr-2 shadow-sm focus-within:ring-2 focus-within:ring-lime-100 focus-within:border-lime-200 transition-all"
 >
 <input
 ref={inputRef}
 type="text"
 value={message}
 onChange={(e) => setMessage(e.target.value)}
 disabled={isLoading}
 placeholder={isLoading ? "Thinking..." : "Message..."}
 className="flex-1 bg-transparent border-none outline-none text-sm text-stone-900 placeholder:text-stone-400 px-3 disabled:opacity-50"
 />
 <div className="flex items-center gap-1 pr-1">

 <button
 type="submit"
 disabled={!message.trim() || isLoading}
 className={`p-2 rounded-full transition-all ${message.trim() && !isLoading ? 'bg-[#84cc16] text-white shadow-md transform hover:scale-105' : 'bg-stone-100 text-stone-400' }`}
 >
 <Send size={18} className={message.trim() ? 'ml-0.5' : ''} />
 </button>
 </div>
 </form>
 <div className="text-center mt-2">
 <p className="text-[10px] text-stone-300 font-medium">Powered by Raiyah AI</p>
 </div>
 </div>
 </m.div>
 )}
 </AnimatePresence>

 {/* WhatsApp Floating Button (Above Chatbot) */}
 <div className="fixed bottom-24 right-6 z-40 flex items-center justify-end gap-3 pointer-events-none">
 <m.div
 initial={{ opacity: 0, x: 10 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 1 }}
 className="bg-white/90 backdrop-blur-sm text-stone-800 text-[11px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg shadow-sm border border-stone-100 pointer-events-auto shadow-stone-200/50"
 >
 Booking
 </m.div>

 <m.a
 href={`https://wa.me/?text=${encodeURIComponent(`Hi, I am interested in ${selectedCategory}`)}`}
 target="_blank"
 rel="noopener noreferrer"
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 whileHover={{ scale: 1.1 }}
 whileTap={{ scale: 0.95 }}
 className="size-12 bg-[#25D366] rounded-full shadow-md flex items-center justify-center text-white hover:bg-[#20bd5a] transition-colors pointer-events-auto"
 title="Book via WhatsApp"
 >
 <svg viewBox="0 0 24 24" width="24" height="24" className="fill-current">
 <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
 </svg>
 </m.a>
 </div>

 {/* Launcher Button */}
 <m.button
 layout
 onClick={() => setIsOpen(!isOpen)}
 className={`fixed bottom-6 right-6 z-50 flex items-center justify-center size-14 rounded-full shadow-[0_8px_30px_rgba(132,204,22,0.4)] transition-all duration-300 ${isOpen ? 'bg-white text-stone-800 hover:bg-stone-50' : 'bg-[#84cc16] text-white hover:bg-[#74b813]' }`}
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 >
 <m.div
 animate={{ rotate: isOpen ? 180 : 0 }}
 transition={{ duration: 0.3 }}
 >
 {isOpen ? <ChevronDown size={28} /> : <MessageCircle size={28} />}
 </m.div>

 {/* Notification Badge if closed */}
 {!isOpen && (
 <span className="absolute top-0 right-0 size-3.5 bg-red-500 border-2 border-white rounded-full"></span>
 )}
 </m.button>
 </div>
 );
};
