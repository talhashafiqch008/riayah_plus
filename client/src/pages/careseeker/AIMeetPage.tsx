
import { useState, useEffect, useRef } from 'react';
import {
 Mic,
 MicOff,
 Video,
 VideoOff,
 PhoneOff,
 MessageSquare,
 Settings,
 MoreVertical,
 Send,
 Volume2,
 Keyboard,
 AlertCircle
} from 'lucide-react';
;
import { useNavigate } from 'react-router-dom';
import { streamDoctorChat } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { AI_FEATURES } from '@/lib/feature-flags';
import { FeatureDisabled } from '@/components/FeatureDisabled';




// Webkit Speech Recognition types
interface SpeechRecognitionEvent extends Event {
 results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
 error: string;
}

interface SpeechRecognition {
 lang: string;
 continuous: boolean;
 interimResults: boolean;
 onstart: () => void;
 onresult: (event: SpeechRecognitionEvent) => void;
 onerror: (event: SpeechRecognitionErrorEvent) => void;
 onend: () => void;
 start(): void;
 stop(): void;
 abort(): void;
}

declare global {
 interface Window {
 webkitSpeechRecognition: new () => SpeechRecognition;
 webkitAudioContext: typeof AudioContext;
 }
}

// Mock interaction logic
const PROCESS_DELAY = 1000; // Time for AI to "think"

export default function MeetWithAIPage() {
 const navigate = useNavigate();
 const { user } = useAuth();

 // UI State
 const [isMuted, setIsMuted] = useState(false);
 const [isVideoOff, setIsVideoOff] = useState(false);
 const [duration, setDuration] = useState(0);
 const [connecting, setConnecting] = useState(true);
 const [showChat, setShowChat] = useState(false);
 const [textInput, setTextInput] = useState("");
 const [isAiSpeaking, setIsAiSpeaking] = useState(false);
 const [isUserSpeaking, setIsUserSpeaking] = useState(false);
 const [aiMessage, setAiMessage] = useState("Hello! I'm Dr. Raiyah. Can you hear me?");
 const [userTranscript, setUserTranscript] = useState("");
 const [micPermissionError, setMicPermissionError] = useState(false);
  const [audioData, setAudioData] = useState<number[]>(() => new Array(5).fill(10));
 const [isThinking, setIsThinking] = useState(false);
 const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'model'; content: string }>>([]);

 // Logic Refs (to avoid closure staleness in event handlers)
 const isAiSpeakingRef = useRef(false);
 const isMutedRef = useRef(false);
 const connectingRef = useRef(true);
 const recognitionRef = useRef<SpeechRecognition | null>(null);
 const audioContextRef = useRef<AudioContext | null>(null);
 const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
 const animationFrameRef = useRef<number | null>(null);
 const synthRef = useRef<SpeechSynthesis | null>(null);
 const silenceTimer = useRef<NodeJS.Timeout | null>(null);
 const isMounted = useRef(true);

 // Sync State to Refs
 useEffect(() => { isAiSpeakingRef.current = isAiSpeaking; }, [isAiSpeaking]);
 useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
 useEffect(() => { connectingRef.current = connecting; }, [connecting]);

 // TODO: Refactor cascading setState into useReducer or batched update
 // TODO: Combine multiple setState calls
 useEffect(() => {
 isMounted.current = true;
 if (typeof window !== 'undefined') {
 synthRef.current = window.speechSynthesis;
 }

 // Simulate connection delay
 const timer = setTimeout(() => {
 if (!isMounted.current) return;
 setConnecting(false);
 initializeAudio();
 // Auto-start greeting after connection
 setTimeout(() => {
 if (isMounted.current) speak(aiMessage);
 }, 500);
 }, 1500);

 return () => {
 isMounted.current = false;
 clearTimeout(timer);
 stopAudioProcessing();
 if (synthRef.current) {
 synthRef.current.cancel();
 }
 if (silenceTimer.current) clearTimeout(silenceTimer.current);
 };
 }, []);

 useEffect(() => {
 if (connecting) return;
 const interval = setInterval(() => setDuration(prev => prev + 1), 1000);
 return () => clearInterval(interval);
 }, [connecting]);

 if (!AI_FEATURES.geminiChat) {
 return <FeatureDisabled featureName="AI Video Consultation" />;
 }

 const initializeAudio = async () => {
 setMicPermissionError(false);
 try {
 if (!isMounted.current) return;

 // 1. Get Microphone Stream for Visualizer
 const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

 const AudioContext = window.AudioContext || window.webkitAudioContext;
 const audioCtx = new AudioContext();
 const analyser = audioCtx.createAnalyser();
 const source = audioCtx.createMediaStreamSource(stream);

 source.connect(analyser);
 analyser.fftSize = 32;

 audioContextRef.current = audioCtx;
 sourceRef.current = source;

 const updateVisualizer = () => {
 if (!isMounted.current) return;
 const dataArray = new Uint8Array(analyser.frequencyBinCount);
 analyser.getByteFrequencyData(dataArray);

 const average = dataArray.reduce((src, a) => src + a, 0) / dataArray.length;
 // Increased threshold to 30 to ignore background noise
 setIsUserSpeaking(average > 30);

 const bars = Array.from(dataArray.slice(0, 5)).map(val => Math.max(10, (val / 255) * 100));
 setAudioData(bars);

 animationFrameRef.current = requestAnimationFrame(updateVisualizer);
 };
 updateVisualizer();

 // 2. Setup Speech Recognition
 interface SpeechRecognitionConstructor {
 new (): SpeechRecognition;
 }
 if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
 const SpeechRecognition = (window as unknown as { webkitSpeechRecognition: SpeechRecognitionConstructor }).webkitSpeechRecognition;
 const recognition = new SpeechRecognition();
 recognition.continuous = true;
 recognition.interimResults = true;
 recognition.lang = 'en-US';

 recognition.onstart = () => {};

 recognition.onresult = (event: SpeechRecognitionEvent) => {
 if (!isMounted.current) return;
 const result = event.results[event.results.length - 1];
 const transcript = result[0].transcript;

 // Don't process if AI is speaking (safety check)
 if (isAiSpeakingRef.current) return;

 setUserTranscript(transcript);

 // Reset Silence Timer on EVERY result (interim or final)
 // This ensures we wait for 6 full seconds of silence after the LAST word
 if (silenceTimer.current) clearTimeout(silenceTimer.current);

 silenceTimer.current = setTimeout(() => {
 if (!isMounted.current) return;
 handleUserInput(transcript);
 }, 6000);
 };

 recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
 // Ignore 'no-speech' (silence) and 'aborted' (manual stop)
 if (event.error === 'no-speech' || event.error === 'aborted') return;

 console.error("Speech error", event.error);
 if (event.error === 'not-allowed') setMicPermissionError(true);
 };

 recognition.onend = () => {
 // CRITICAL: Only restart if mounted, AI is NOT speaking and user is NOT muted
 if (isMounted.current && !isAiSpeakingRef.current && !isMutedRef.current && !connectingRef.current) {
 setTimeout(() => {
 try {
 if (isMounted.current && recognitionRef.current) recognition.start();
 } catch (e) {
 }
 }, 200);
 }
 };

 recognitionRef.current = recognition;
 recognition.start();

 } else {
 }

 } catch (err) {
 console.error("Mic access denied:", err);
 setMicPermissionError(true);
 }
 };

 const stopAudioProcessing = () => {
 if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
 if (audioContextRef.current) audioContextRef.current.close();

 // Use abort for immediate cleanup
 if (recognitionRef.current) {
 recognitionRef.current.abort();
 recognitionRef.current = null;
 }

 if (sourceRef.current && sourceRef.current.mediaStream) {
 sourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
 }
 };

 const speak = (text: string) => {
 if (!synthRef.current || !isMounted.current) return;

 // 1. STOP Listening immediately to prevent echo
 if (recognitionRef.current) {
 recognitionRef.current.abort();
 }

 // 2. Set State
 setIsAiSpeaking(true);
 synthRef.current.cancel();

 const utterance = new SpeechSynthesisUtterance(text);
 utterance.rate = 1;
 utterance.pitch = 1.1;

 const voices = synthRef.current.getVoices();
 const preferredVoice = voices.find(v => v.name.includes('Google US English')) ||
 voices.find(v => v.name.includes('Female'));
 if (preferredVoice) utterance.voice = preferredVoice;

 utterance.onend = () => {
 setIsAiSpeaking(false);
 // 3. RESUME Listening after done speaking
 if (!isMutedRef.current && recognitionRef.current && isMounted.current) {
 try { recognitionRef.current.start(); } catch (e) {
 }
 }
 };

 setAiMessage(text);
 synthRef.current.speak(utterance);
 };

 const handleUserInput = async (message: string) => {
 if (!message.trim() || !isMounted.current) return;

 // 1. Add user message to history
 const newHistory = [...conversationHistory, { role: 'user' as const, content: message }];
 setConversationHistory(newHistory);

 // 2. Thinking State
 setIsThinking(true);

 // 3. Get user data from auth context
 const userData = {
 name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
 age: user?.age,
 gender: user?.gender,
 };

 // 4. Stream response from API
 let fullResponse = '';

 try {
 await streamDoctorChat({
 message,
 userData,
 conversationHistory: newHistory,
 onChunk: (text) => {
 if (!isMounted.current) return;
 fullResponse += text;
 setAiMessage(fullResponse);
 },
 onComplete: () => {
 if (!isMounted.current) return;
 setIsThinking(false);

 // Add AI response to history
 setConversationHistory(prev => [...prev, { role: 'model', content: fullResponse }]);

 // Speak the complete response
 if (fullResponse) {
 speak(fullResponse);
 }
 },
 onError: (error) => {
 console.error('AI Chat Error:', error);
 setIsThinking(false);

 // Fallback response
 const fallbackResponse = "I apologize, I'm having trouble connecting right now. Please try again.";
 setAiMessage(fallbackResponse);
 speak(fallbackResponse);
 }
 });
 } catch (error) {
 console.error('Stream error:', error);
 setIsThinking(false);
 }
 };

 const handleSendText = () => {
 if (!textInput.trim()) return;
 setUserTranscript(textInput);
 handleUserInput(textInput);
 setTextInput("");
 };

 const toggleMute = () => {
 const newMutedState = !isMuted;
 setIsMuted(newMutedState);

 if (sourceRef.current && sourceRef.current.mediaStream) {
 sourceRef.current.mediaStream.getAudioTracks().forEach(track => {
 track.enabled = !newMutedState;
 });
 }

 if (newMutedState) {
 recognitionRef.current?.stop();
 } else {
 // Only restart if AI is not speaking
 if (!isAiSpeakingRef.current) {
 try { recognitionRef.current?.start(); } catch (e) {
 }
 }
 }
 };

 const formatTime = (seconds: number) => {
 const mins = Math.floor(seconds / 60);
 const secs = seconds % 60;
 return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
 };

 return (
 <div className="h-[calc(100vh-6rem)] bg-stone-900 rounded-2xl overflow-hidden relative flex flex-col shadow-2xl border border-stone-800">
 {/* Main Video Area */}
 <div className="relative flex-1 bg-stone-800 flex items-center justify-center overflow-hidden">

 {/* AI Persona Video Feed */}
 <div className={`absolute inset-0 size-full transition-transform duration-300 ${isAiSpeaking ? 'scale-[1.05]' : 'scale-100'}`}>
 <img
 src="/images/ai-doctor.png"
 alt="AI Doctor"
 className={`absolute inset-0 size-full object-cover transition-transform duration-300 ${isAiSpeaking ? 'animate-[pulse_0.4s_ease-in-out_infinite] brightness-110' : 'brightness-100'}`}
 loading="eager"
 />

 {/* Thinking Overlay */}
 {isThinking && (
 <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
 <div className="flex gap-2 mb-4">
 <div className="size-4 rounded-full bg-teal-400 animate-[bounce_1s_infinite_0ms]"></div>
 <div className="size-4 rounded-full bg-teal-400 animate-[bounce_1s_infinite_200ms]"></div>
 <div className="size-4 rounded-full bg-teal-400 animate-[bounce_1s_infinite_400ms]"></div>
 </div>
 <span className="text-teal-400 font-mono text-lg font-bold tracking-widest uppercase">Processing</span>
 </div>
 )}

 {/* Speaking Animation Overlay */}
 {isAiSpeaking && (
 <>
 <div className="absolute inset-0 bg-teal-500/10 animate-pulse z-0 mix-blend-overlay"></div>
 {/* Facemorph / Lip Sync Simulation */}
 <div className="absolute top-[48%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 size-40 bg-teal-300/5 blur-3xl rounded-full opacity-60 animate-[ping_0.3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
 </>
 )}

 <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-stone-900 via-stone-900/90 to-transparent"></div>

 <div className="absolute bottom-6 left-6 text-white z-10 hidden md:block">
 <div className="flex items-center gap-3">
 <h3 className="text-xl font-semibold text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.04)] tracking-wide">Dr. Raiyah AI</h3>
 {isAiSpeaking ? (
 <div className="flex items-center gap-1.5 bg-teal-500/90 px-3 py-1 rounded-full shadow-lg shadow-teal-500/20 backdrop-blur-md border border-teal-400/30">
 <Volume2 className="size-3 text-white animate-pulse" />
 <span className="text-xs font-bold text-white uppercase tracking-wider ml-1">Speaking</span>
 </div>
 ) : (
 <div className="flex items-center gap-2 bg-stone-800/80 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
 <span className="relative flex size-2">
 <span className="animate-ping absolute inline-flex size-full rounded-full bg-green-400 opacity-75"></span>
 <span className="relative inline-flex rounded-full size-2 bg-green-500"></span>
 </span>
 <span className="text-xs font-medium text-stone-300">Listening…</span>
 </div>
 )}
 </div>
 <p className="text-sm text-stone-300 mt-1 font-light opacity-80">Intelligent Medical Assistant</p>
 </div>
 </div>

 {/* Subtitles / Chat Area */}
 {!connecting && (
 <div className="absolute bottom-28 md:bottom-32 left-0 right-0 flex flex-col items-center px-4 md:px-8 z-10 gap-4">
 <div className={`transition-transform duration-300 transform ${userTranscript ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} max-w-xl`}>
 <p className="text-stone-200 text-lg font-medium text-center drop-shadow-[0_4px_20px_rgba(0,0,0,0.04)] bg-black/60 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl">
 "{userTranscript}"
 </p>
 </div>

 {aiMessage && (
 <div className="bg-stone-900/95 backdrop-blur-xl px-6 md:px-10 py-4 md:py-6 rounded-[2rem] max-w-4xl text-center border border-white/10 shadow-2xl transition-transform duration-300">
 <p className="text-white text-lg md:text-2xl font-medium leading-relaxed">
 {aiMessage}
 </p>
 </div>
 )}
 </div>
 )}

 {/* Error/Permission Warning */}
 {micPermissionError && (
 <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm z-50 flex items-center gap-2">
 <AlertCircle className="size-5 text-white" />
 Microphone access denied. Please allow mic access or use text chat.
 </div>
 )}

 {/* Self View & Visualizer */}
 <div className={`absolute top-6 right-6 w-32 md:w-56 h-24 md:h-40 bg-stone-800 rounded-2xl overflow-hidden border-2 shadow-2xl transition-transform duration-300 z-20 ${isUserSpeaking ? 'border-green-500 shadow-green-500/20 ring-2 ring-green-500/20' : 'border-stone-600/50'}`}>
 <div className="size-full bg-stone-700 flex items-center justify-center relative group">

 <div className="absolute inset-0 bg-stone-900 flex items-center justify-center gap-1 md:gap-1.5 px-4">
 {!isVideoOff ? (
 <div className="flex items-end h-8 md:h-12 gap-1 w-full justify-center">
 {audioData.map((val, n) => (
 <div
 key={`audio-bar-${n}`}
 className="w-1.5 md:w-2 bg-green-500 rounded-full transition-transform duration-300 duration-75"
 style={{ height: `${val}%`, opacity: isMuted ? 0.3 : 1 }}
 ></div>
 ))}
 </div>
 ) : (
 <VideoOff className="size-8 text-stone-500" />
 )}
 </div>

 <div className="absolute top-2 left-2 bg-black/50 px-2 py-0.5 rounded text-[10px] text-white font-bold tracking-wider">
 YOU {isMuted && '(MUTED)'}
 </div>
 </div>
 </div>

 {/* Connecting Loader */}
 {connecting && (
 <div className="absolute inset-0 bg-stone-900 z-50 flex flex-col items-center justify-center">
 <div className="relative size-24 mb-8">
 <div className="absolute inset-0 rounded-full border-4 border-stone-700"></div>
 <div className="absolute inset-0 rounded-full border-4 border-t-teal-500 animate-spin"></div>
 <div className="absolute inset-4 rounded-full bg-stone-800 flex items-center justify-center shadow-inner">
 <span className="text-4xl animate-pulse">🩺</span>
 </div>
 </div>
 <h2 className="text-white text-2xl font-semibold tracking-tight mb-2">Joining Consultation…</h2>
 <p className="text-stone-400 text-sm font-medium bg-stone-800 px-4 py-1.5 rounded-full">Establishing secure encrypted connection</p>
 </div>
 )}
 </div>

 {/* Bottom Controls Bar */}
 <div className="h-24 bg-stone-900 border-t border-stone-800 px-4 md:px-8 flex items-center justify-between z-20 shrink-0 relative">

 {/* Left: Chat Input (Visible on Toggle) */}
 <div className={`absolute left-4 md:left-8 bottom-24 md:bottom-28 transition-transform duration-300 origin-bottom-left ${showChat ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
 <div className="bg-stone-800 p-2 rounded-xl shadow-xl flex items-center gap-2 border border-stone-700 w-[calc(100vw-2rem)] md:w-96">
 <input
 type="text"
 value={textInput}
 onChange={(e) => setTextInput(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
 placeholder="Type a message to Dr. Raiyah..."
 className="bg-stone-900 text-white text-sm px-4 py-3 rounded-lg flex-1 border-none focus:ring-1 focus:ring-teal-500 outline-none placeholder:text-stone-500"
 />
 <button
 onClick={handleSendText}
 className="p-3 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors"
 >
 <Send className="size-4" />
 </button>
 </div>
 </div>

 {/* Left: Time */}
 <div className="hidden md:flex flex-col">
 <div className="text-2xl font-mono text-white tracking-widest font-medium">
 {formatTime(duration)}
 </div>
 <div className="text-xs text-stone-400 flex items-center gap-1.5 mt-1">
 <span className="size-1.5 rounded-full bg-green-500 animate-pulse"></span>
 Secure & Encrypted
 </div>
 </div>

 {/* Center: Main Controls */}
 <div className="flex items-center gap-3 md:gap-6 absolute left-1/2 transform -translate-x-1/2">
 <button
 onClick={toggleMute}
 className={`p-4 md:p-5 rounded-full transition-transform duration-300 shadow-lg hover:scale-105 active:scale-95 ${isMuted ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-stone-800 hover:bg-stone-700 text-white border border-stone-700' }`}
 title={isMuted ? "Unmute" : "Mute"}
 >
 {isMuted ? <MicOff className="size-5 md:w-6 h-5 md:h-6" /> : <Mic className="size-5 md:w-6 h-5 md:h-6" />}
 </button>

 <button
 onClick={() => setIsVideoOff(!isVideoOff)}
 className={`p-4 md:p-5 rounded-full transition-transform duration-300 shadow-lg hover:scale-105 active:scale-95 ${isVideoOff ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-stone-800 hover:bg-stone-700 text-white border border-stone-700' }`}
 title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
 >
 {isVideoOff ? <VideoOff className="size-5 md:w-6 h-5 md:h-6" /> : <Video className="size-5 md:w-6 h-5 md:h-6" />}
 </button>

 <button
 onClick={() => navigate('/careseeker')}
 className="p-4 md:p-5 rounded-full bg-red-600 hover:bg-red-700 text-white min-w-[3.5rem] md:min-w-[4rem] flex items-center justify-center transition-transform duration-300 shadow-xl shadow-red-600/20 hover:scale-105 active:scale-95 ml-4"
 title="End Call"
 >
 <PhoneOff className="size-6 md:w-7 h-6 md:h-7" />
 </button>
 </div>

 {/* Right: Secondary Actions */}
 <div className="flex items-center gap-3 text-stone-400">
 <button
 onClick={() => setShowChat(!showChat)}
 className={`p-3 rounded-full transition-colors ${showChat ? 'bg-teal-500/20 text-teal-400' : 'hover:bg-stone-800 hover:text-white'}`}
 title="Text Chat"
 >
 <Keyboard className="size-5" />
 </button>
 <button className="p-3 rounded-full hover:bg-stone-800 hover:text-white transition-colors hidden sm:block">
 <Settings className="size-5" />
 </button>
 </div>
 </div>
 </div>
 );
}
