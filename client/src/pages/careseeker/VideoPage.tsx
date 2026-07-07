
import { useState, useRef, lazy, Suspense } from 'react';
import { Video, Users, ArrowRight, Shield, Activity, Sparkles } from 'lucide-react';
import { RaiyahLogo } from '../../components/SinaLogo';

const VideoMeeting = lazy(() => import('../../components/VideoMeeting'));

export default function VideoMeetingPage() {
 const [inMeeting, setInMeeting] = useState(false);
 const [roomName, setRoomName] = useState('');
 const [userName, setUserName] = useState('');

 const handleJoinMeeting = (e: React.FormEvent) => {
 e.preventDefault();
 if (roomName.trim() && userName.trim()) {
 setInMeeting(true);
 }
 };

 const handleLeaveMeeting = () => {
 setInMeeting(false);
 };

 if (inMeeting) {
 return (
 <Suspense fallback={<div className="flex items-center justify-center h-screen text-stone-400">Loading...</div>}>
 <VideoMeeting
 roomName={roomName}
 userName={userName}
 onLeave={handleLeaveMeeting}
 />
 </Suspense>
 );
 }

 return (
 <div className="min-h-screen w-full flex bg-white overflow-hidden">
 {/* Left Panel - Branding & Visuals */}
 <div className="hidden lg:flex lg:w-1/2 relative bg-stone-900 overflow-hidden flex-col justify-between p-12 text-white">
 {/* Background Effects */}
 <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
 <div className="absolute inset-0 bg-gradient-to-br from-teal-900/90 via-stone-900/90 to-purple-900/90"></div>

 {/* Decorative Blobs */}
 <div className="absolute -top-24 -left-24 size-96 bg-teal-500/30 rounded-full blur-3xl animate-pulse"></div>
 <div className="absolute bottom-0 right-0 size-[500px] bg-purple-600/20 rounded-full blur-3xl"></div>

 {/* Content */}
 <div className="relative z-10">
 <div className="bg-white/10 backdrop-blur-md w-fit px-4 py-2 rounded-full border border-white/20 mb-8 inline-flex items-center gap-2">
 <Sparkles className="size-4 text-teal-300" />
 <span className="text-sm font-medium text-teal-50">Premium Care Access</span>
 </div>
 <h1 className="text-5xl lg:text-7xl font-semibold leading-tight mb-6">
 Virtual <br />
 <span className="text-teal-400">Consultations</span>
 </h1>
 <p className="text-xl text-stone-300 max-w-md leading-relaxed">
 Connect with top-tier healthcare providers instantly. Secure, private, and convenient video calls from the comfort of your home.
 </p>
 </div>

 {/* Features List */}
 <div className="relative z-10 grid grid-cols-2 gap-6 mt-12">
 <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
 <div className="p-2 bg-teal-500/20 rounded-lg">
 <Shield className="size-5 text-teal-300" />
 </div>
 <div>
 <h3 className="font-semibold text-white">Secure Encrypted</h3>
 <p className="text-xs text-stone-400 mt-1">End-to-end privacy for your sessions.</p>
 </div>
 </div>
 <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
 <div className="p-2 bg-purple-500/20 rounded-lg">
 <Activity className="size-5 text-purple-300" />
 </div>
 <div>
 <h3 className="font-semibold text-white">Full HD Quality</h3>
 <p className="text-xs text-stone-400 mt-1">Crystal clear video transmission.</p>
 </div>
 </div>
 </div>
 </div>

 {/* Right Panel - Form */}
 <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 lg:p-24 relative bg-stone-50/50">
 <div className="w-full max-w-md">
 <div className="mb-10 text-center lg:text-left">
 <div className="inline-flex justify-center lg:justify-start mb-6">
 <div className="scale-125 origin-left">
 <RaiyahLogo />
 </div>
 </div>
 <h2 className="text-3xl font-semibold text-stone-900 mb-2">Join a Session</h2>
 <p className="text-stone-500">Please enter your details to connect to your room.</p>
 </div>

 <form onSubmit={handleJoinMeeting} className="space-y-6">
 <div className="space-y-4">
 <div>
 <label htmlFor="userName" className="block text-sm font-medium text-stone-700 mb-1.5 ml-1">
 Display Name
 </label>
 <div className="relative group">
 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
 <Users className="size-5 text-stone-400 group-focus-within:text-teal-600 transition-colors" />
 </div>
 <input
 type="text"
 id="userName"
 value={userName}
 onChange={(e) => setUserName(e.target.value)}
 placeholder="e.g. John Doe"
 className="block w-full pl-11 pr-4 py-4 bg-white ring-1 ring-stone-200/50 rounded-2xl text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-transform duration-300 font-medium  hover:border-stone-300"
 required
 />
 </div>
 </div>

 <div>
 <label htmlFor="roomName" className="block text-sm font-medium text-stone-700 mb-1.5 ml-1">
 Room ID
 </label>
 <div className="relative group">
 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
 <Video className="size-5 text-stone-400 group-focus-within:text-purple-600 transition-colors" />
 </div>
 <input
 type="text"
 id="roomName"
 value={roomName}
 onChange={(e) => setRoomName(e.target.value)}
 placeholder="Enter Room Name"
 className="block w-full pl-11 pr-4 py-4 bg-white ring-1 ring-stone-200/50 rounded-2xl text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-transform duration-300 font-medium  hover:border-stone-300"
 required
 />
 </div>
 </div>
 </div>

 <button
 type="submit"
 className="group relative w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-lg shadow-xl shadow-stone-200 transform transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99]"
 >
 <span>Connect Now</span>
 <div className="bg-white/20 rounded-full p-1 group-hover:translate-x-1 transition-transform">
 <ArrowRight className="size-4" />
 </div>
 </button>
 </form>

 <div className="mt-10 text-center">
 <p className="text-xs text-stone-400">
 By joining, you agree to our <a href="#" className="underline hover:text-stone-600">Terms of Service</a> and <a href="#" className="underline hover:text-stone-600">Privacy Policy</a>.
 </p>
 </div>
 </div>
 </div>
 </div>
 );
}
