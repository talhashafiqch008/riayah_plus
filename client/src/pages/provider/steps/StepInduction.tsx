
import { useState } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Play, FileText, Loader2, AlertTriangle, ArrowLeft, GraduationCap, Shield, Check, BookOpen, MousePointerClick } from "lucide-react";
import type { ProviderOnboardingData } from "../OnboardingPage";

// Induction quiz questions - Marketplace-safe language
const QUIZ_QUESTIONS = [
 {
 id: 'q1',
 question: 'What should you do if a client has a medical emergency?',
 options: [
 { value: 'call_emergency_services', label: 'Call emergency services (999/911) immediately' },
 { value: 'wait_for_family', label: 'Wait for family to arrive' },
 { value: 'continue_care', label: 'Continue regular care' },
 ],
 correctAnswer: 'call_emergency_services'
 },
 {
 id: 'q2',
 question: 'Is it acceptable to accept payments directly from clients outside the platform?',
 options: [
 { value: 'yes', label: 'Yes, if they prefer' },
 { value: 'no', label: 'No, all payments must go through the platform' },
 { value: 'sometimes', label: 'Sometimes, for tips' },
 ],
 correctAnswer: 'no'
 },
 {
 id: 'q3',
 question: 'How should you handle client confidential information?',
 options: [
 { value: 'share_with_family', label: 'Share with family members freely' },
 { value: 'keep_confidential', label: 'Keep strictly confidential as per privacy laws' },
 { value: 'post_online', label: 'Can share on social media' },
 ],
 correctAnswer: 'keep_confidential'
 },
 {
 id: 'q4',
 question: "What is Raiyah Plus's role in the care relationship?",
 options: [
 { value: 'employer', label: 'Raiyah Plus is your employer' },
 { value: 'platform_only', label: 'We are a technology platform connecting you with clients' },
 { value: 'guarantor', label: 'Raiyah Plus guarantees all care outcomes' },
 ],
 correctAnswer: 'platform_only'
 },
];

const fadeIn = {
 initial: { opacity: 0, y: 10 },
 animate: { opacity: 1, y: 0 },
};

interface StepInductionProps {
 data: ProviderOnboardingData;
 onUpdate: (data: Partial<ProviderOnboardingData>) => void;
 onSubmit: () => Promise<void>;
 onBack: () => void;
 isSubmitting?: boolean;
 isLoggedIn?: boolean;
}

export default function StepInduction({ data, onUpdate, onSubmit, onBack, isSubmitting, isLoggedIn }: StepInductionProps) {
 const [videoWatched, setVideoWatched] = useState(data.inductionVideoWatched || false);
 const [quizSubmitted, setQuizSubmitted] = useState(false);
 const quizAnswers = (data.quizAnswers || {}) as Record<string, string>;

 const updateAnswer = (questionId: string, answer: string) => {
 onUpdate({
 quizAnswers: {
 ...quizAnswers,
 [questionId]: answer
 }
 });
 };

 const handleWatchVideo = () => {
 // Simulate watching
 const btn = document.getElementById('play-btn');
 if (btn) btn.classList.add('scale-95', 'opacity-50');

 setTimeout(() => {
 setVideoWatched(true);
 onUpdate({ inductionVideoWatched: true });
 }, 1500);
 };

 const checkQuizAnswers = () => {
 setQuizSubmitted(true);
 };

 const allQuestionsAnswered = QUIZ_QUESTIONS.every(q => quizAnswers[q.id]);
 const quizPassed = quizSubmitted && QUIZ_QUESTIONS.every(q => quizAnswers[q.id] === q.correctAnswer);

 const isValid =
 videoWatched &&
 quizPassed &&
 data.termsAccepted &&
 data.codeOfConductAccepted &&
 data.independentProviderAcknowledged;

 const consents = [
 {
 id: 'independentProviderAcknowledged',
 title: 'Independent Provider Status',
 description: 'I acknowledge that I operate independently. Raiyah Plus provides the technology to connect with clients, but I am responsible for my service delivery.',
 required: true,
 icon: Shield,
 },
 {
 id: 'termsAccepted',
 title: 'Terms of Service',
 description: 'I have read and accept the Raiyah Plus Terms of Service and Provider Agreement.',
 required: true,
 icon: FileText,
 },
 {
 id: 'codeOfConductAccepted',
 title: 'Code of Conduct',
 description: 'I agree to uphold the Provider Code of Conduct, maintaining professionalism and care ethics at all times.',
 required: true,
 icon: BookOpen,
 },
 ];

 return (
 <div className="space-y-12">
 {/* Header */}
 <m.div {...fadeIn}>
 <div className="flex items-center gap-4 mb-2">
 <div className="size-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200/50 ring-4 ring-rose-50">
 <GraduationCap className="size-7 text-white" />
 </div>
 <div>
 <h2 className="text-3xl font-semibold text-stone-900 tracking-tight">Induction</h2>
 <p className="text-stone-500 text-lg">Complete training to join the network.</p>
 </div>
 </div>
 </m.div>

 {/* Induction Video Card */}
 <m.div {...fadeIn} transition={{ delay: 0.1 }}>

 <div className="relative rounded-[2rem] overflow-hidden bg-stone-900 text-white shadow-2xl">
 {/* Background decoration */}
 <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10"></div>
 <div className="absolute -top-24 -right-24 size-64 bg-rose-500/20 rounded-full blur-[100px]"></div>
 <div className="absolute -bottom-24 -left-24 size-64 bg-purple-500/20 rounded-full blur-[100px]"></div>

 <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12">
 <div className="flex-1 space-y-4">
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
 <span className="size-2 bg-rose-500 rounded-full animate-pulse"></span>
 <span className="text-xs font-bold uppercase tracking-wider">Required Step</span>
 </div>
 <h3 className="text-2xl md:text-3xl font-semibold leading-tight">Welcome to the Provider Network</h3>
 <p className="text-stone-300 leading-relaxed max-w-lg">
 Watch this short 2-minute video to understand how Raiyah Plus works, your responsibilities, and how to succeed.
 </p>

 {videoWatched && (
 <div className="inline-flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
 <CheckCircle2 className="size-5" />
 <span>Video Completed</span>
 </div>
 )}
 </div>

 <div className="flex-shrink-0 w-full md:w-80 aspect-video rounded-2xl bg-black/40 border border-white/10 overflow-hidden relative group">
 {!videoWatched ? (
 <button
 id="play-btn"
 onClick={handleWatchVideo}
 className="absolute inset-0 size-full flex flex-col items-center justify-center gap-4 group-hover:bg-black/20 transition-colors"
 >
 <div className="size-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
 <Play className="size-6 fill-white text-white ml-1" />
 </div>
 <span className="text-sm font-bold tracking-widest uppercase">Watch Video</span>
 </button>
 ) : (
 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
 <CheckCircle2 className="size-12 text-emerald-400 mb-2" />
 <span className="font-bold">Done!</span>
 </div>
 )}
 </div>
 </div>
 </div>
 </m.div>

 {/* Quiz Section */}
 <AnimatePresence>
 {videoWatched && (
 <m.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className="space-y-8"
 >
 <div className="flex items-center gap-3 pt-8 border-t border-stone-100">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">2</span>
 <h3 className="font-semibold text-xl text-stone-900">Knowledge Check</h3>
 </div>

 <div className="grid gap-6">
 {QUIZ_QUESTIONS.map((question, index) => {
 const answered = quizAnswers[question.id];
 const isCorrect = answered === question.correctAnswer;
 const showResult = quizSubmitted && answered;

 return (
 <m.div
 key={question.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.1 }}
 className={`p-6 rounded-3xl border-2 transition-all duration-300 ${showResult ? isCorrect ? 'border-emerald-500 bg-emerald-50/50' : 'border-red-500 bg-red-50/50' : 'border-stone-200 bg-white hover:border-stone-300' }`}
 >
 <div className="flex gap-4">
 <span className="text-sm font-bold text-stone-400">0{index + 1}</span>
 <div className="flex-1 space-y-4">
 <h4 className="font-semibold text-stone-900 text-lg">
 {question.question}
 </h4>

 <div className="space-y-2">
 {question.options.map((option) => {
 const isSelected = answered === option.value;
 return (
 <label
 key={option.value}
 className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border-2 ${isSelected ? 'bg-white border-stone-900 shadow-md ring-1 ring-stone-900/10' : 'bg-white border-stone-100 hover:border-stone-200' } ${showResult && option.value === question.correctAnswer ? '!bg-emerald-100 !border-emerald-500' : ''}`}
 >
 <div className={`size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-stone-900' : 'border-stone-300' } ${showResult && option.value === question.correctAnswer ? '!border-emerald-600' : ''}`}>
 {(isSelected || (showResult && option.value === question.correctAnswer)) && <div className={`size-2.5 rounded-full ${showResult && option.value === question.correctAnswer ? 'bg-emerald-600' : 'bg-stone-900'}`} />}
 </div>

 <input
 type="radio"
 name={question.id}
 value={option.value}
 checked={isSelected}
 onChange={() => updateAnswer(question.id, option.value)}
 disabled={quizSubmitted}
 className="hidden"
 />

 <span className={`text-base font-medium flex-1 ${isSelected ? 'text-stone-900' : 'text-stone-600'}`}>
 {option.label}
 </span>

 <AnimatePresence>
 {showResult && option.value === question.correctAnswer && (
 <m.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1 }} className="text-emerald-600">
 <CheckCircle2 className="size-5" />
 </m.div>
 )}
 {showResult && isSelected && !isCorrect && (
 <m.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1 }} className="text-red-600">
 <XCircle className="size-5" />
 </m.div>
 )}
 </AnimatePresence>
 </label>
 );
 })}
 </div>
 </div>
 </div>
 </m.div>
 );
 })}
 </div>

 {!quizSubmitted ? (
 <div className="flex justify-end pt-4">
 <button
 onClick={checkQuizAnswers}
 disabled={!allQuestionsAnswered}
 className="px-8 py-3 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-stone-200 hover:shadow-xl hover:-translate-y-1 flex items-center gap-2"
 >
 <MousePointerClick className="size-4" />
 Submit Answers
 </button>
 </div>
 ) : (
 !quizPassed && (
 <m.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-4 text-red-700"
 >
 <div className="p-2 bg-white rounded-full"><AlertTriangle className="size-5" /></div>
 <div>
 <p className="font-bold">Not quite right</p>
 <p className="text-sm">Please review the incorrectly answered questions and try again.</p>
 </div>
 <button onClick={() => setQuizSubmitted(false)} className="ml-auto underline font-bold hover:text-red-900">Retry</button>
 </m.div>
 )
 )}

 {quizPassed && (
 <m.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-4 text-emerald-800"
 >
 <div className="p-2 bg-white rounded-full shadow-sm"><CheckCircle2 className="size-6 text-emerald-500" /></div>
 <div>
 <p className="font-bold text-lg">Knowledge Check Passed!</p>
 <p className="text-sm opacity-80">You're ready for the final step.</p>
 </div>
 </m.div>
 )}

 </m.div>
 )}
 </AnimatePresence>

 {/* Final Agreements */}
 <AnimatePresence>
 {quizPassed && (
 <m.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className="space-y-6 pt-8 border-t border-stone-100"
 >
 <div className="flex items-center gap-3">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">3</span>
 <h3 className="font-semibold text-xl text-stone-900">Final Agreements</h3>
 </div>

 <div className="grid gap-4">
 {consents.map((consent, index) => {
 const Icon = consent.icon;
 return (
 <m.div
 key={consent.id}
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: index * 0.05 }}
 onClick={() => onUpdate({ [consent.id]: !data[consent.id] })}
 className={`group p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex items-start gap-5 ${data[consent.id] ? 'border-stone-900 bg-stone-50 shadow-md ring-1 ring-stone-900/5' : 'border-stone-200 bg-white hover:border-stone-300' }`}
 >
 <div className={`mt-1 size-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${data[consent.id] ? 'bg-stone-900 border-stone-900 scale-110' : 'bg-white border-stone-300 group-hover:border-stone-400' }`}>
 {!!data[consent.id] && <Check className="size-4 text-white stroke-[3px]" />}
 </div>

 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <h4 className={`font-semibold text-base ${data[consent.id] ? 'text-stone-900' : 'text-stone-700'}`}>{consent.title}</h4>
 {consent.required && (
 <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded uppercase tracking-wider">Required</span>
 )}
 </div>
 <p className="text-sm text-stone-500 leading-relaxed font-medium">{consent.description}</p>
 </div>

 <div className={`p-2 rounded-xl transition-colors ${data[consent.id] ? 'bg-white text-stone-900' : 'bg-stone-50 text-stone-400'}`}>
 <Icon className="size-5" />
 </div>
 </m.div>
 );
 })}
 </div>
 </m.div>
 )}
 </AnimatePresence>

 {/* Navigation */}
 <m.div
 {...fadeIn}
 transition={{ delay: 0.4 }}
 className="flex justify-between items-center pt-8 border-t border-stone-100 mt-8"
 >
 <button
 onClick={onBack}
 disabled={isSubmitting}
 className="flex items-center gap-2 text-stone-400 font-bold hover:text-stone-600 transition-colors disabled:opacity-50 px-6 py-3 hover:bg-stone-50 rounded-2xl"
 >
 <ArrowLeft className="size-4 stroke-[3px]" />
 Back
 </button>
 <m.button
 onClick={onSubmit}
 disabled={!isValid || isSubmitting}
 whileHover={isValid && !isSubmitting ? { scale: 1.02, x: 5 } : {}}
 whileTap={isValid && !isSubmitting ? { scale: 0.98 } : {}}
 className="px-10 py-4 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center gap-3 bg-stone-900 shadow-stone-300"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-5 animate-spin" />
 Processing…
 </>
 ) : (
 <>
 <CheckCircle2 className="size-5" />
 Complete Registration
 </>
 )}
 </m.button>
 </m.div>
 </div>
 );
}
