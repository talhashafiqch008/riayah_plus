
import { m, LazyMotion, domAnimation } from "framer-motion";
import { Shield, ArrowRight, LogIn, Briefcase, Users, DollarSign, Clock, Star, CheckCircle2, ChevronRight, PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../../../components/Logo";
import { Link } from "react-router-dom";

interface StepWelcomeProps {
 onNext: () => void;
}

const BENEFITS = [
 {
 icon: Users,
 label: 'Connect with families',
 description: 'Direct access to thousands of care seekers.',
 color: 'bg-blue-500'
 },
 {
 icon: DollarSign,
 label: 'Maximize Earnings',
 description: 'Set your own rates and keep 100% of tips.',
 color: 'bg-emerald-500'
 },
 {
 icon: Clock,
 label: 'Total Flexibility',
 description: 'Choose your hours and service locations.',
 color: 'bg-amber-500'
 },
 {
 icon: Star,
 label: 'Career Growth',
 description: 'Build your reputation and professional profile.',
 color: 'bg-purple-500'
 },
];

export default function StepProviderWelcome({ onNext }: StepWelcomeProps) {
 const navigate = useNavigate();

 const handleSignIn = () => {
 navigate('/provider/login');
 };

 return (
 <div className="min-h-screen bg-[#FAFAF9] selection:bg-teal-500/30 font-sans overflow-x-hidden">
 {/* Background Decorations */}
 <div className="fixed inset-0 pointer-events-none overflow-hidden">
 <div className="absolute top-[-10%] right-[-5%] size-[600px] bg-teal-500/5 rounded-full blur-[100px]" />
 <div className="absolute bottom-[-10%] left-[-5%] size-[500px] bg-blue-500/5 rounded-full blur-[100px]" />
 <div className="absolute top-[40%] left-[20%] size-[300px] bg-purple-500/5 rounded-full blur-[80px]" />
 <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.02]" />
 </div>

 {/* Header */}
 <header className="fixed top-0 w-full z-50 transition-all duration-300 bg-white/70 backdrop-blur-xl border-b border-stone-100">
 <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
 <Link to="/" className="hover:opacity-80 transition-opacity">
 <Logo size="md" />
 </Link>
 <div className="flex items-center gap-4">
 <span className="hidden md:inline-block text-sm text-stone-500 font-medium">Already a provider?</span>
 <button
 onClick={handleSignIn}
 className="px-5 py-2.5 rounded-full bg-white border border-stone-200 text-stone-700 font-bold text-sm hover:border-teal-500 hover:text-teal-600 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
 >
 <LogIn className="size-4" />
 Sign In
 </button>
 </div>
 </div>
 </header>

 <main className="relative pt-32 pb-20 px-6">
 <div className="max-w-7xl mx-auto">
 <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

 {/* Left Content */}
 <m.div
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ duration: 0.6, ease: "easeOut" }}
 className="flex-1 text-center lg:text-left"
 >
 <m.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-bold uppercase tracking-wider mb-8 mx-auto lg:mx-0"
 >
 <span className="relative flex size-2">
 <span className="animate-ping absolute inline-flex size-full rounded-full bg-teal-400 opacity-75"></span>
 <span className="relative inline-flex rounded-full size-2 bg-teal-500"></span>
 </span>
 Accepting Applications: Qatar & Egypt
 </m.div>

 <h1 className="text-5xl lg:text-7xl font-semibold tracking-tight text-stone-900 mb-6 leading-[1.1]">
 Turn your care <br />
 <span className="text-teal-600">
 into a career.
 </span>
 </h1>

 <p className="text-xl text-stone-600 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0">
 Join the Middle East's premier network of healthcare professionals.
 Flexible shifts, higher earnings, and a community that values your expertise.
 </p>

 <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-12">
 <button
 onClick={onNext}
 className="w-full sm:w-auto px-8 py-4 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all shadow-xl hover:shadow-stone-900/20 hover:-translate-y-1 flex items-center justify-center gap-3 group"
 >
 Start Application
 <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
 </button>
 <button
 className="w-full sm:w-auto px-8 py-4 bg-white text-stone-700 border border-stone-200 rounded-2xl font-bold text-lg hover:bg-stone-50 transition-all flex items-center justify-center gap-3"
 >
 <PlayCircle className="size-5 text-stone-400" />
 How it works
 </button>
 </div>

 <div className="flex items-center justify-center lg:justify-start gap-8 text-sm text-stone-500 font-medium">
 <div className="flex items-center gap-2">
 <CheckCircle2 className="size-5 text-teal-500" />
 <span>Verified Network</span>
 </div>
 <div className="flex items-center gap-2">
 <CheckCircle2 className="size-5 text-teal-500" />
 <span>Instant Payments</span>
 </div>
 <div className="flex items-center gap-2">
 <CheckCircle2 className="size-5 text-teal-500" />
 <span>Insurance Covered</span>
 </div>
 </div>
 </m.div>

 {/* Right Content / Visuals */}
 <m.div
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ duration: 0.6, delay: 0.2 }}
 className="flex-1 w-full max-w-lg lg:max-w-none"
 >
 <div className="relative">
 {/* Decor Card 1 */}
 <m.div
 animate={{ y: [0, -10, 0] }}
 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
 className="absolute -top-12 -right-8 z-20 bg-white p-4 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-stone-100 hidden sm:block"
 >
 <div className="flex items-center gap-3">
 <div className="size-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
 <DollarSign className="size-5" />
 </div>
 <div>
 <p className="text-xs text-stone-500 uppercase font-bold tracking-wider">Weekly Earnings</p>
 <p className="text-lg font-bold text-stone-900">$1,250.00</p>
 </div>
 </div>
 </m.div>

 {/* Main Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {BENEFITS.map((benefit, i) => {
 const Icon = benefit.icon;
 return (
 <m.div
 key={benefit.label}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3 + (i * 0.1) }}
 className="group p-6 bg-white rounded-[2rem] border border-stone-100 shadow-sm hover:shadow-xl hover:shadow-stone-200/50 hover:border-stone-200 transition-all duration-300"
 >
 <div className={`size-12 ${benefit.color} bg-opacity-10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
 <Icon className={`size-6 ${benefit.color.replace('bg-', 'text-')}`} />
 </div>
 <h3 className="font-semibold text-stone-900 text-lg mb-2">{benefit.label}</h3>
 <p className="text-sm text-stone-500 leading-relaxed">{benefit.description}</p>
 </m.div>
 )
 })}
 </div>

 {/* Decor Card 2 */}
 <m.div
 animate={{ y: [0, 10, 0] }}
 transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
 className="absolute -bottom-8 -left-8 z-20 bg-[#1e293b] p-5 rounded-2xl shadow-xl hidden sm:block"
 >
 <div className="flex items-center gap-4">
 <div className="flex -gap-3">
 {[1, 2, 3].map(i => (
 <div key={`avatar-${i}`} className="size-8 rounded-full border-2 border-[#1e293b] bg-stone-600" />
 ))}
 </div>
 <div className="text-white">
 <p className="text-sm font-bold">500+ New Families</p>
 <p className="text-xs text-stone-400">Joined this week</p>
 </div>
 </div>
 </m.div>
 </div>
 </m.div>
 </div>

 {/* Footer Logo Strip */}
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.8 }}
 className="mt-24 pt-10 border-t border-stone-200"
 >
 <p className="text-center text-sm font-semibold text-stone-400 uppercase tracking-widest mb-8">Trusted by leading healthcare institutions</p>
 <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
 {/* Placeholders for partner logos - using text for now but styled properly */}
 <div className="text-xl font-black text-stone-800 flex items-center gap-2"><Shield className="size-6" /> MEDCARE</div>
 <div className="text-xl font-black text-stone-800 flex items-center gap-2"><Star className="size-6" /> PRIME HEALTH</div>
 <div className="text-xl font-black text-stone-800 flex items-center gap-2"><Briefcase className="size-6" /> FUTURE CARE</div>
 <div className="text-xl font-black text-stone-800 flex items-center gap-2"><Users className="size-6" /> FAMILY FIRST</div>
 </div>
 </m.div>
 </div>
 </main>
 </div>
 );
}
