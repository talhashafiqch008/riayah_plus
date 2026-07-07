

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Shield, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { getLiveKitToken } from "@/lib/api/telehealth";




export default function RoomPage() {
 const params = useParams();
 const navigate = useNavigate();
 // params.id will now be the conversationId
 const conversationId = params.id as string;
 const hasJoinedRef = useRef(false);
 const [micOn, setMicOn] = useState(true);
 const [cameraOn, setCameraOn] = useState(true);
 const [consentGiven, setConsentGiven] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const localVideoRef = useRef<HTMLVideoElement>(null);
 const streamRef = useRef<MediaStream | null>(null);

 // Initial Stream Setup for Waiting Room
 // TODO: Refactor cascading setState into useReducer or batched update
 // TODO: Combine multiple setState calls
 useEffect(() => {
 let stream: MediaStream | null = null;

 const startStream = async () => {
 try {
 stream = await navigator.mediaDevices.getUserMedia({
 video: true,
 audio: true
 });
 streamRef.current = stream;
 if (localVideoRef.current) {
 localVideoRef.current.srcObject = stream;
 }
 setError(null);
 } catch (err) {
 console.error("Failed to access media devices", err);
 setError("Could not access camera or microphone. Please check permissions.");
 setCameraOn(false);
 setMicOn(false);
 }
 };

 if (!hasJoinedRef.current) {
  startStream();
  }

  return () => {
  if (stream) {
  stream.getTracks().forEach(track => track.stop());
  }
  };
  }, []);

 const toggleMic = () => {
 if (streamRef.current) {
 const audioTracks = streamRef.current.getAudioTracks();
 audioTracks.forEach(track => track.enabled = !micOn);
 setMicOn(!micOn);
 }
 };

 const toggleCamera = () => {
 if (streamRef.current) {
 const videoTracks = streamRef.current.getVideoTracks();
 videoTracks.forEach(track => track.enabled = !cameraOn);
 setCameraOn(!cameraOn);
 }
 };

 const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

 const handleJoin = () => {
 if (!consentGiven) return;
 hasJoinedRef.current = true;
 setConnectionState('connecting');

 // Initialize LiveKit connection
 getLiveKitToken({
 roomName: conversationId,
 participantName: 'User',
 }).then((data) => {
 if (data?.token) {
 setConnectionState('connected');
 } else {
 setConnectionState('error');
 setError('Failed to get LiveKit token. Please try again.');
 }
 }).catch((err) => {
 console.error('Failed to get LiveKit token', err);
 setConnectionState('error');
 setError('Failed to connect to video session. Please try again.');
 });
 };

 const handleLeave = () => {
 navigate("/provider/dashboard");
 };

 if (hasJoinedRef.current) {
  return (
  <div className="h-screen bg-stone-900 relative">
 {/* Active Call UI */}
 <div className="absolute inset-0 flex items-center justify-center text-white flex-col gap-4">
 {connectionState === 'connecting' && (
   <div className="flex flex-col items-center gap-3">
     <Loader2 className="size-10 animate-spin text-teal-400" />
     <p>Connecting to secure session…</p>
   </div>
 )}
 {connectionState === 'connected' && (
   <div className="flex flex-col items-center gap-2">
     <div className="flex items-center gap-2 text-teal-400">
       <CheckCircle className="size-5" />
       <span>Connected to secure session</span>
     </div>
     <p className="text-sm text-stone-400">Waiting for the other participant to join…</p>
   </div>
 )}
 {connectionState === 'error' && (
   <div className="flex flex-col items-center gap-2 text-red-400">
     <AlertCircle className="size-8" />
     <p>Connection failed</p>
     <p className="text-sm text-stone-400 max-w-md text-center">{error || 'Unable to connect to the video session.'}</p>
     <button onClick={() => { setConnectionState('idle'); hasJoinedRef.current = false; }} className="mt-2 px-4 py-2 bg-stone-800 rounded-lg hover:bg-stone-700 transition-colors">
       Try Again
     </button>
   </div>
 )}
 {/* Local Video Preview */}
 <div className="absolute top-4 right-4 w-48 h-36 bg-stone-950 rounded-lg border border-stone-700 overflow-hidden shadow-lg">
 <video ref={localVideoRef} autoPlay muted playsInline className="size-full object-cover transform scale-x-[-1]" />
 <div className="absolute bottom-2 left-2 text-xs text-white bg-stone-950/50 px-2 py-0.5 rounded">You</div>
 </div>
 </div>

 {/* Controls Bar */}
 <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-stone-800/90 backdrop-blur p-4 rounded-2xl shadow-2xl border border-stone-700/50">
 <button onClick={toggleMic} className={`p-4 rounded-full transition-all ${micOn ? 'bg-stone-700 hover:bg-stone-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
 {micOn ? <Mic className="size-6" /> : <MicOff className="size-6" />}
 </button>
 <button onClick={toggleCamera} className={`p-4 rounded-full transition-all ${cameraOn ? 'bg-stone-700 hover:bg-stone-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
 {cameraOn ? <Video className="size-6" /> : <VideoOff className="size-6" />}
 </button>
 <div className="w-px h-8 bg-stone-600 mx-2" />
 <button onClick={handleLeave} className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg shadow-red-900/20">
 <PhoneOff className="size-6" />
 </button>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
 <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
 {/* Preview Area */}
 <div className="relative w-full md:w-1/2 bg-stone-900 aspect-video md:aspect-auto min-h-[300px] flex items-center justify-center">
 {!error ? (
 <video
 ref={localVideoRef}
 autoPlay
 muted
 playsInline
 className={`size-full object-cover transform scale-x-[-1] opacity-90 ${!cameraOn && 'hidden'}`}
 />
 ) : (
 <div className="text-white text-center p-6">
 <AlertCircle className="size-10 text-red-400 mx-auto mb-2" />
 <p className="text-sm">{error}</p>
 </div>
 )}

 {!cameraOn && !error && (
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="size-20 rounded-full bg-stone-800 flex items-center justify-center text-stone-400">
 <VideoOff className="size-8" />
 </div>
 </div>
 )}

 <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
 <button onClick={toggleMic} className={`p-3 rounded-full border ${micOn ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-red-500 border-red-500 text-white'}`}>
 {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
 </button>
 <button onClick={toggleCamera} className={`p-3 rounded-full border ${cameraOn ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-red-500 border-red-500 text-white'}`}>
 {cameraOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
 </button>
 </div>
 </div>

 {/* Pre-flight Check */}
 <div className="w-full md:w-1/2 p-8 flex flex-col justify-between">
 <div>
 <h1 className="text-2xl font-semibold text-stone-900 mb-2">Ready to join?</h1>
 <p className="text-stone-500 mb-6">Please check your audio and video settings before entering the secure consultation room.</p>

 <div className="space-y-4">
 <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex items-center">
 <Shield className="size-5 text-teal-600 mr-3" />
 <div className="text-sm">
 <p className="font-semibold text-stone-900">Secure Environment</p>
 <p className="text-stone-500">This session is end-to-end encrypted.</p>
 </div>
 </div>

 <label className="flex items-start gap-3 cursor-pointer group">
 <div className={`mt-0.5 size-5 rounded border flex items-center justify-center transition-colors ${consentGiven ? 'bg-teal-600 border-teal-600' : 'border-stone-300 bg-white'}`}>
 {consentGiven && <CheckCircle className="size-3.5 text-white" />}
 </div>
 <input
 type="checkbox"
 checked={consentGiven}
 onChange={(e) => setConsentGiven(e.target.checked)}
 className="hidden"
 />
 <span className="text-sm text-stone-600 group-hover:text-stone-900 transition-colors">
 I confirm that I am in a private location and ready to conduct this consultation in accordance with professional standards.
 </span>
 </label>
 </div>
 </div>

 <div className="mt-8 space-y-3">
 <button
 onClick={handleJoin}
 disabled={!consentGiven}
 className={`w-full py-4 rounded-xl font-bold flex items-center justify-center transition-all ${consentGiven ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-700/20' : 'bg-stone-100 text-stone-400 cursor-not-allowed' }`}
 >
 <Video className="size-5 mr-2" />
 Join Consultation
 </button>
 <button
 onClick={handleLeave}
 className="w-full py-3 rounded-xl font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
