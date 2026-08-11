
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, User, Home, Sparkles, AlertCircle, ArrowRight, Video, Mic, StopCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { AI_FEATURES } from '@/lib/feature-flags';
import { FeatureDisabled } from '@/components/FeatureDisabled';




function sanitizeHref(href: string | undefined): string | undefined {
 if (!href) return undefined;
 const allowedProtocols = /^https?:\/\//i;
 if (allowedProtocols.test(href)) return href;
 if (href.startsWith('/')) return href;
 if (href.startsWith('#')) return href;
 if (href.startsWith('mailto:')) return href;
 if (href.startsWith('tel:')) return href;
 return undefined;
}

interface Message {
 id: string;
 role: 'user' | 'assistant';
 content: string;
 timestamp: Date;
 searchResults?: Record<string, unknown>[];
 usage?: Record<string, unknown>;
 citations?: string[];
}

export default function PublicAiChatPage() {
 const navigate = useNavigate();
 const [inputValue, setInputValue] = useState('');
 const [messages, setMessages] = useState<Message[]>([]);
 const [isTyping, setIsTyping] = useState(false);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
 };

 useEffect(() => {
 scrollToBottom();
 }, [messages, isTyping]);

 if (!AI_FEATURES.geminiChat) {
 return <FeatureDisabled featureName="AI Chat" />;
 }

 const suggestions = [
 "Headache remedies",
 "Flu symptoms",
 "Healthy breakfast",
 "Meditation tips",
 "Lower back pain"
 ];

 const handleSendMessage = async (e?: React.FormEvent) => {
 e?.preventDefault();

 if (!inputValue.trim()) return;

 const newUserMessage: Message = {
 id: Date.now().toString(),
 role: 'user',
 content: inputValue,
 timestamp: new Date()
 };

 setMessages(prev => [...prev, newUserMessage]);
 setInputValue('');
 setIsTyping(true);

 try {
 const { streamAIChat } = await import('@/lib/api');

 const stream = await streamAIChat({
 message: newUserMessage.content,
 temperature: 0.7,
 });

 const reader = stream.getReader();
 const decoder = new TextDecoder();

 const botMessageId = (Date.now() + 1).toString();

 setMessages(prev => [...prev, {
 id: botMessageId,
 role: 'assistant',
 content: '',
 timestamp: new Date()
 }]);

 setIsTyping(false);

 let buffer = '';
 let fullText = '';
 let searchResults: Record<string, unknown>[] = [];
 let usage: Record<string, unknown> | undefined = undefined;
 let citations: string[] = [];

 while (true) {
 // TODO: Consider Promise.all for parallel async
 const { done, value } = await reader.read();
 if (done) break;

 const chunk = decoder.decode(value, { stream: true });

 buffer += chunk;
 const lines = buffer.split('\n');
 buffer = lines.pop() || '';

 for (const line of lines) {
 if (line.startsWith('data: ')) {
 const data = line.substring(6);

 if (data === '[DONE]') continue;
 if (!data.trim()) continue;

 try {
 const parsed = JSON.parse(data);
 const content = parsed.choices?.[0]?.delta?.content || '';

 if (content) {
 fullText += content;
 setMessages(prev => prev.map(msg =>
 msg.id === botMessageId
 ? { ...msg, content: fullText }
 : msg
 ));
 }

 if (parsed.search_results) searchResults = parsed.search_results;
 if (parsed.usage) usage = parsed.usage;
 if (parsed.citations) citations = parsed.citations;

 if (parsed.choices?.[0]?.finish_reason) {
 setMessages(prev => prev.map(msg =>
 msg.id === botMessageId
 ? { ...msg, searchResults, usage, citations }
 : msg
 ));
 }
} catch {
  }
}
}
}
} catch (error) {
 console.error('AI Stream error:', error);
 setIsTyping(false);

 const errorMessage: Message = {
 id: (Date.now() + 1).toString(),
 role: 'assistant',
 content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
 timestamp: new Date()
 };
 setMessages(prev => [...prev, errorMessage]);
 }
 };

 const handleKeyDown = (e: React.KeyboardEvent) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 handleSendMessage();
 }
 };

 const handleSuggestionClick = (suggestion: string) => {
 setInputValue(suggestion);
 };

 return (
 <div className="min-h-screen bg-white flex flex-col font-sans text-lime-900 selection:bg-lime-100 selection:text-lime-900">

 {/* Floating Navbar (Simplified for Chat) */}
 <m.nav
 initial={{ y: -100, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 transition={{ duration: 0.5 }}
 className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-3xl bg-white/90 backdrop-blur-xl border border-white/20 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
 >
 <div className="px-6 h-14 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <Link to="/" className="scale-75 origin-left">
 <Logo size="sm" animated={false} />
 </Link>
 <div className="h-6 w-px bg-stone-200 hidden sm:block" />
 <span className="text-sm font-semibold text-stone-500 hidden sm:block">AI Assistant</span>
 </div>

 <div className="flex items-center gap-2">
 <Link to="/" className="p-2 text-stone-400 hover:text-stone-900 bg-transparent hover:bg-stone-50 rounded-full transition-all">
 <Home size={18} />
 </Link>
 <Link to="/" className="bg-stone-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-stone-950 transition-all shadow-md">
 Sign In
 </Link>
 </div>
 </div>
 </m.nav>

 {/* Main Content */}
 <div className="flex-1 overflow-y-auto px-4 pt-28 pb-32 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
 <div className="max-w-2xl mx-auto flex flex-col min-h-full">

 <AnimatePresence mode="wait">
 {messages.length === 0 ? (
 /* Hero / Empty State */
 <m.div
 initial={{ opacity: 0, scale: 0.98 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.98 }}
 transition={{ duration: 0.3 }}
 className="flex-1 flex flex-col items-center justify-center"
 >
 <div className="mb-10">
 <div className="size-20 bg-stone-50 rounded-[2rem] flex items-center justify-center shadow-inner border border-stone-100">
 <Bot className="size-10 text-stone-900" />
 </div>
 </div>

 <h1 className="text-4xl md:text-5xl font-semibold text-stone-900 tracking-tight text-center mb-10">
 How can I help you today?
 </h1>

 <div className="flex flex-wrap justify-center gap-2 max-w-xl mb-16">
 {suggestions.map((s) => (
 <button
 key={s}
 onClick={() => handleSuggestionClick(s)}
 className="px-4 py-2 bg-stone-50 hover:bg-white border border-stone-100 hover:border-lime-300 text-stone-600 rounded-full text-sm font-medium transition-all hover:shadow-sm"
 >
 {s}
 </button>
 ))}
 </div>

 <p className="text-stone-400 text-sm max-w-xs text-center leading-relaxed">
 Raiyah AI provides general health information. Please consult a doctor for medical advice.
 </p>
 </m.div>
 ) : (
 /* Chat History */
 <div className="space-y-8">
 {messages.map((msg) => (
 <m.div
 key={msg.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3 }}
 className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
 >
 <div className={`flex max-w-[90%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

 {/* Avatar */}
 {msg.role === 'assistant' && (
 <div className="flex-shrink-0 size-8 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center mt-1">
 <Bot className="size-4 text-stone-700" />
 </div>
 )}

 {/* Message Bubble */}
 <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed ${msg.role === 'user' ? 'bg-stone-900 text-white rounded-tr-sm shadow-md' : 'bg-white text-stone-800 border border-stone-100 rounded-tl-sm shadow-sm' }`}>
 {msg.role === 'user' ? (
 msg.content
 ) : (
 <div className="prose prose-sm max-w-none prose-neutral">
 <ReactMarkdown
 remarkPlugins={[remarkGfm]}
 rehypePlugins={[rehypeSanitize]}
 components={{
 p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
 a: ({ children, href }) => {
 const safeHref = sanitizeHref(href);
 if (!safeHref) return <span className="text-teal-600 underline">{children}</span>;
 return <a href={safeHref} className="text-teal-600 hover:text-teal-700 underline" target="_blank" rel="noopener noreferrer">{children}</a>;
 },
 code: ({ children, className }) => {
 const isInline = !className;
 return isInline ? (
 <code className="bg-stone-100 text-stone-800 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
 ) : (
 <div className="bg-stone-900 text-white rounded-lg p-3 my-2 overflow-x-auto text-xs">
 <code className="font-mono">{children}</code>
 </div>
 );
 },
 ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
 ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
 }}
 >
 {msg.content}
 </ReactMarkdown>

 {/* Citations */}
 {msg.citations && msg.citations.length > 0 && (
 <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap gap-2">
 {msg.citations.map((c, i) => {
 const safeC = sanitizeHref(c);
 const citationKey = c || `invalid-${i}`;
 return safeC ? (
 <a key={citationKey} href={safeC} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-stone-50 hover:bg-lime-50 rounded-md text-xs font-medium text-lime-800 hover:text-lime-900 border border-stone-100 transition-colors">
 <span className="size-4 rounded-full bg-white border border-stone-200 flex items-center justify-center text-[9px]">{i + 1}</span>
 Source
 </a>
 ) : (
 <span key={citationKey} className="flex items-center gap-1.5 px-2 py-1 bg-stone-100 rounded-md text-xs text-stone-400 border border-stone-100">
 <span className="size-4 rounded-full bg-stone-200 flex items-center justify-center text-[9px]">{i + 1}</span>
 Invalid
 </span>
 );
 })}
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 </m.div>
 ))}

 {isTyping && (
 <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full justify-start pl-12">
 <div className="bg-stone-50 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
 <div className="size-1.5 bg-stone-400 rounded-full animate-easeInOut [animation-delay:-0.3s]"></div>
 <div className="size-1.5 bg-stone-400 rounded-full animate-easeInOut [animation-delay:-0.15s]"></div>
 <div className="size-1.5 bg-stone-400 rounded-full animate-easeInOut"></div>
 </div>
 </m.div>
 )}
 <div ref={messagesEndRef} />
 </div>
 )}
 </AnimatePresence>
 </div>
 </div>

 {/* Input Area */}
 <div className="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-white via-white/90 to-transparent">
 <div className="max-w-2xl mx-auto">
 <div className="bg-white border text-stone-900 border-stone-200 rounded-[2rem] p-1.5 pl-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus-within:border-stone-300 transition-all flex items-end gap-2">
 <textarea
 value={inputValue}
 onChange={(e) => setInputValue(e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="Type your health question..."
 className="w-full max-h-[150px] py-3.5 bg-transparent resize-none outline-none text-[15px] placeholder:text-lime-700 selection:bg-lime-200"
 style={{ height: '52px' }}
 />
 <button
 onClick={() => handleSendMessage()}
 disabled={!inputValue.trim() || isTyping}
 className={`p-3 rounded-full flex-shrink-0 mb-0.5 transition-all ${!inputValue.trim() || isTyping ? 'bg-stone-100 text-stone-300' : 'bg-stone-900 text-white hover:bg-stone-950 hover:scale-105 active:scale-95' }`}
 >
 {isTyping ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
 </button>
 </div>
 </div>
 </div>

 </div>
 );
}
