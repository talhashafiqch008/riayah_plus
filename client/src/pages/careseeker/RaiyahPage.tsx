
import { useState, useRef, useEffect } from 'react';
// TODO: Avoid flushSync, use useEffect or useLayoutEffect
import { flushSync } from 'react-dom';
import { Send, Paperclip, FileText, Check, Stethoscope, User, Bot, Loader2 } from 'lucide-react';
import { RaiyahLogo } from '@/components/SinaLogo';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
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

export default function SinaChatPage() {
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
 return <FeatureDisabled featureName="AI Health Assistant" />;
 }

 const suggestions = [
 "Hair Loss",
 "Urticaria",
 "HbA1c",
 "Etoricoxib Uses",
 "Drug Interactions",
 "Celiac Disease",
 "Post-Miscarriage Bleeding",
 "Left Testicle Swelling",
 "TSH Test",
 "Night Calm Side Effects",
 "Trimed Flu Uses",
 "Food Poisoning Symptoms",
 "Belly Fat Reduction"
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

  const botMessageId = (Date.now() + 1).toString();

  setMessages(prev => [...prev, {
  id: botMessageId,
  role: 'assistant',
  content: '',
  timestamp: new Date()
  }]);

  try {
  const { streamDoctorChat } = await import('@/lib/api');

  await streamDoctorChat({
  message: newUserMessage.content,
  onChunk: (text: string) => {
  setMessages(prev => prev.map(msg =>
  msg.id === botMessageId
  ? { ...msg, content: msg.content + text }
  : msg
  ));
  },
  onComplete: () => {
  setIsTyping(false);
  },
  onError: (error: Error) => {
  console.error('AI Stream error:', error);
  setIsTyping(false);
  setMessages(prev => prev.map(msg =>
  msg.id === botMessageId
  ? { ...msg, content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment." }
  : msg
  ));
  },
  });
  } catch (error) {
  console.error('AI Stream error:', error);
  setIsTyping(false);
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
 // Optional: Auto send
 // handleSendMessage(); 
 };

 return (
 <div className="h-[calc(100vh-8rem)] flex flex-col relative">

 {/* Scrollable Content Area */}
 <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
 <div className="max-w-3xl mx-auto flex flex-col min-h-full">

 {messages.length === 0 ? (
 /* Empty State */
 <div className="flex-1 flex flex-col items-center justify-center gap-12 my-auto">
 <div className="text-center transform scale-125">
 <RaiyahLogo />
 </div>

 <h1 className="text-3xl font-semibold text-stone-900 text-center px-4">
 Reliable Medical Answers, Instantly.
 </h1>

 <button className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-6 py-2.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2">
 <FileText className="size-4" />
 <span>Analyze Lab Results</span>
 </button>

 <div className="w-full px-4 overflow-hidden">
 <div className="flex flex-wrap justify-center gap-2.5 max-w-2xl mx-auto">
 {suggestions.map((suggestion) => (
 <button
 key={suggestion}
 onClick={() => handleSuggestionClick(suggestion)}
 className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm rounded-2xl transition-transform duration-300 border border-transparent hover:border-stone-300"
 >
 {suggestion}
 </button>
 ))}
 </div>
 </div>
 </div>
 ) : (
 /* Chat History */
 <div className="space-y-6 pb-4">
 {messages.map((msg) => (
 <div
 key={msg.id}
 className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
 >
 <div className={`flex max-w-[80%] md:max-w-[70%] gap-3 ${msg.role === 'user' ? 'flex-row' : 'flex-row'}`}>

 {/* Avatar */}
 <div className={`flex-shrink-0 size-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-teal-100 text-teal-700' }`}>
 {msg.role === 'user' ? <User className="size-5" /> : <Bot className="size-5" />}
 </div>

 {/* Bubble */}
 <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-bl-none text-left' : 'bg-white ring-1 ring-stone-200/50 rounded-br-none text-left  text-stone-800' }`}>
 {msg.role === 'user' ? (
 msg.content
 ) : (
 <>
 <div className="prose prose-sm max-w-none prose-slate">
 <ReactMarkdown
 remarkPlugins={[remarkGfm]}
 rehypePlugins={[rehypeSanitize]}
 components={{
 p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
 ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
 ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
 li: ({ children }) => <li className="ml-2">{children}</li>,
 strong: ({ children }) => <strong className="font-bold text-stone-900">{children}</strong>,
 em: ({ children }) => <em className="italic">{children}</em>,
 code: ({ children, className }) => {
 const isInline = !className;
 return isInline ? (
 <code className="bg-stone-100 text-purple-600 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
 ) : (
 <code className="block bg-stone-900 text-stone-100 p-3 rounded-lg text-xs font-mono overflow-x-auto my-2">{children}</code>
 );
 },
 pre: ({ children }) => <pre className="my-2">{children}</pre>,
 h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 text-stone-900">{children}</h1>,
 h2: ({ children }) => <h2 className="text-base font-semibold mb-2 text-stone-900">{children}</h2>,
 h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-stone-900">{children}</h3>,
 a: ({ children, href }) => {
 const safeHref = sanitizeHref(href);
 if (!safeHref) return <span className="text-purple-600 underline">{children}</span>;
 return <a href={safeHref} className="text-purple-600 hover:text-purple-700 underline" target="_blank" rel="noopener noreferrer">{children}</a>;
 },
 blockquote: ({ children }) => <blockquote className="border-l-4 border-stone-300 pl-4 italic my-2 text-stone-600">{children}</blockquote>,
 }}
 >
 {msg.content}
 </ReactMarkdown>
 </div>

 {/* Citations - Enhanced Design */}
 {msg.citations && msg.citations.length > 0 && (
 <div className="mt-4 pt-4 border-t ring-1 ring-stone-200/50">
 <div className="flex items-center gap-2 mb-3">
 <svg className="size-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">Sources</span>
 <span className="text-xs text-stone-400">({msg.citations.length})</span>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
 {msg.citations.map((citation, idx) => {
 const safeCitation = sanitizeHref(citation);
 const citationKey = citation || `invalid-${idx}`;
 return safeCitation ? (
 <a
 key={citationKey}
 href={safeCitation}
 target="_blank"
 rel="noopener noreferrer"
 className="group flex items-center gap-2 text-xs bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-700 px-3 py-2 rounded-lg transition-transform duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:scale-105"
 >
 <span className="flex items-center justify-center size-5 bg-purple-600 text-white rounded-full font-bold text-[10px]">
 {idx + 1}
 </span>
 <span className="flex-1 truncate group-hover:text-purple-900 font-medium">
 Source {idx + 1}
 </span>
 <svg className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
 </svg>
 </a>
 ) : (
 <span key={citationKey} className="flex items-center gap-2 text-xs text-stone-400 px-3 py-2">
 <span className="flex items-center justify-center size-5 bg-stone-300 text-white rounded-full font-bold text-[10px]">{idx + 1}</span>
 <span className="truncate">Invalid link</span>
 </span>
 );
 })}
 </div>
 </div>
 )}

 {/* Search Results - Enhanced Design */}
 {msg.searchResults && msg.searchResults.length > 0 && (
 <details className="mt-4 pt-4 border-t ring-1 ring-stone-200/50 group">
 <summary className="flex items-center gap-2 text-xs font-bold text-stone-600 cursor-pointer hover:text-purple-600 transition-colors select-none">
 <svg className="size-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 <span className="uppercase tracking-wide">Search Results</span>
 <span className="px-2 py-0.5 bg-stone-200 text-stone-700 rounded-full text-[10px] font-bold">
 {msg.searchResults.length}
 </span>
 </summary>
 <div className="mt-3 space-y-2">
 {msg.searchResults.slice(0, 5).map((result: Record<string, unknown>, idx: number) => (
 <a
 key={result.url as string}
 href={result.url as string}
 target="_blank"
 rel="noopener noreferrer"
 className="group flex items-start gap-3 p-3 bg-stone-50 hover:bg-purple-50 rounded-lg transition-transform duration-300 hover: border border-transparent hover:border-purple-200"
 >
 <div className="flex-shrink-0 size-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
 {idx + 1}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-stone-800 group-hover:text-purple-700 transition-colors line-clamp-1">
 {result.title as string || 'Untitled'}
 </p>
 <p className="text-xs text-stone-500 truncate mt-0.5">
 {result.url as string}
 </p>
 </div>
 <svg className="flex-shrink-0 size-4 text-stone-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
 </svg>
 </a>
 ))}
 </div>
 </details>
 )}
 </>
 )}
 </div>
 </div>
 </div>
 ))}

 {isTyping && (
 <div className="flex w-full justify-start">
 <div className="flex max-w-[80%] gap-3 flex-row">
 <div className="flex-shrink-0 size-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
 <Bot className="size-5" />
 </div>
 <div className="bg-white ring-1 ring-stone-200/50 p-4 rounded-2xl rounded-br-none  flex items-center gap-2">
 <div className="size-2 bg-purple-400 rounded-full animate-easeInOut [animation-delay:-0.3s]"></div>
 <div className="size-2 bg-purple-400 rounded-full animate-easeInOut [animation-delay:-0.15s]"></div>
 <div className="size-2 bg-purple-400 rounded-full animate-easeInOut"></div>
 </div>
 </div>
 </div>
 )}
 <div ref={messagesEndRef} />
 </div>
 )}
 </div>
 </div>

 {/* Input Area - Fixed at bottom */}
 <div className="w-full max-w-3xl mx-auto px-4 pb-4 bg-transparent pt-2">
 <div className="bg-white border-2 ring-1 ring-stone-100/50 rounded-[2rem] p-2  focus-within:border-purple-200 focus-within:ring-4 focus-within:ring-purple-50 transition-transform duration-300">
 <div className="relative">
 <textarea
 value={inputValue}
 onChange={(e) => setInputValue(e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="Type your message here..."
 className="w-full min-h-[50px] max-h-[150px] py-3 px-4 pr-32 pl-4 resize-none outline-none text-stone-700 placeholder:text-stone-400 bg-transparent text-left"
 style={{
 overflow: 'hidden',
 height: 'auto',
 }}
 />

 {/* Right Actions (Buttons) - Changed from Left for LTR */}
 <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-2">
 <button
 onClick={() => handleSendMessage()}
 disabled={!inputValue.trim() || isTyping}
 className={`p-2 rounded-full transition-colors transform flex items-center justify-center size-10 shadow-lg ${!inputValue.trim() || isTyping ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none' : 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105 active:scale-95 shadow-purple-200' }`}
 >
 {isTyping ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5 -ml-0.5" />}
 </button>

 {/* <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-white text-stone-600 border border-transparent hover:ring-1 ring-stone-200/50 rounded-full text-xs font-medium transition-transform duration-300">
 <Stethoscope className="size-3.5" />
 <span>Talk to Doctor</span>
 </button> */}
 {/* <button className="flex sm:hidden p-2 bg-stone-100 hover:bg-white text-stone-600 border border-transparent hover:ring-1 ring-stone-200/50 rounded-full transition-transform duration-300">
 <Stethoscope className="size-4" />
 </button> */}

 {/* <button className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-white text-stone-600 border border-transparent hover:ring-1 ring-stone-200/50 rounded-full text-xs font-medium transition-transform duration-300">
 <Paperclip className="size-3.5" />
 <span className="hidden sm:inline">Attach</span>
 </button> */}
 </div>
 </div>
 </div>
 <p className="text-center text-[10px] text-stone-400 mt-2">
 Raiyah AI may make mistakes. Please verify important medical information.
 </p>
 </div>
 </div>
 );
}
