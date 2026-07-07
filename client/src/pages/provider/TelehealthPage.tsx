
import { useState, useEffect , useRef } from 'react';
import {
 Video, Phone, Calendar, Clock, User, Mic, MicOff, VideoOff,
 Monitor, MessageCircle, FileText, Settings, PhoneOff, Users,
 Shield, AlertCircle, CheckCircle, ChevronRight, Play, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';




interface TelehealthSession {
 id: string;
 patientName: string;
 patientAvatar: string;
 scheduledAt: string;
 duration: number;
 type: 'video' | 'phone';
 status: 'scheduled' | 'in-progress' | 'completed';
 careType: string;
 notes?: string;
 recordingUrl?: string;
 recordingDuration?: number;
 recordingStatus?: 'none' | 'processing' | 'completed' | 'failed';
}

// Mock sessions
const mockUpcomingSessions: TelehealthSession[] = [
 {
 id: '1',
 patientName: 'Mohammed Al-Rashid',
 patientAvatar: 'MA',
 scheduledAt: new Date(Date.now() + 3600000).toISOString(),
 duration: 30,
 type: 'video',
 status: 'scheduled',
 careType: 'Elderly Care',
 notes: 'Follow-up on medication schedule',
 },
 {
 id: '2',
 patientName: 'Fatima Al-Hassan',
 patientAvatar: 'FA',
 scheduledAt: new Date(Date.now() + 86400000).toISOString(),
 duration: 45,
 type: 'video',
 status: 'scheduled',
 careType: 'Mental Health',
 },
];

const mockPastSessions: TelehealthSession[] = [
 {
 id: '3',
 patientName: 'Ahmed Sayeed',
 patientAvatar: 'AS',
 scheduledAt: new Date(Date.now() - 86400000).toISOString(),
 duration: 30,
 type: 'video',
 status: 'completed',
 careType: 'Nursing Care',
 notes: 'Discussed wound care progress',
 recordingUrl: '#',
 recordingDuration: 28,
 recordingStatus: 'completed',
 },
];

export default function TelehealthPage() {
 const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
 const [sessions, setSessions] = useState<TelehealthSession[]>(mockUpcomingSessions);
 const [inCall, setInCall] = useState(false);
 const [activeSession, setActiveSession] = useState<TelehealthSession | null>(null);
 const [callDuration, setCallDuration] = useState(0);
 const [isMuted, setIsMuted] = useState(false);
 const [isVideoOff, setIsVideoOff] = useState(false);
 const [showNotes, setShowNotes] = useState(false);

 useEffect(() => {
 setSessions(activeTab === 'upcoming' ? mockUpcomingSessions : mockPastSessions);
 }, [activeTab]);

 useEffect(() => {
 let interval: NodeJS.Timeout;
 if (inCall) {
 interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
 }
 return () => clearInterval(interval);
 }, [inCall]);

 const formatTime = (seconds: number) => {
 const m = Math.floor(seconds / 60);
 const s = seconds % 60;
 return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
 };

 const formatDate = (dateString: string) => {
 const date = new Date(dateString);
 const now = new Date();
 const isToday = date.toDateString() === now.toDateString();
 const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();

 if (isToday) return 'Today';
 if (isTomorrow) return 'Tomorrow';

 return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
 };

 const formatTimeOnly = (dateString: string) => {
 return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
 };

 const getTimeUntil = (dateString: string) => {
 // eslint-disable-next-line react-hooks/purity
 const diff = new Date(dateString).getTime() - Date.now();
 if (diff < 0) return null;

 const hours = Math.floor(diff / 3600000);
 const minutes = Math.floor((diff % 3600000) / 60000);

 if (hours > 24) return null;
 if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
 if (minutes > 0) return `Starts in ${minutes} min`;
 return 'Starting now';
 };

 const startCall = (session: TelehealthSession) => {
 setActiveSession(session);
 setInCall(true);
 setCallDuration(0);
 };

 const endCall = () => {
 setInCall(false);
 setActiveSession(null);
 setCallDuration(0);
 };

 const stats = {
 upcoming: mockUpcomingSessions.length,
 completed: mockPastSessions.length,
 thisWeek: mockPastSessions.length + mockUpcomingSessions.length,
 };

 // In-call view
 if (inCall && activeSession) {
 return (
 <div className="fixed inset-0 bg-stone-900 z-50 flex flex-col">
 {/* Call Header */}
 <div className="flex items-center justify-between p-4 bg-stone-800">
 <div className="flex items-center gap-3">
 <div className="size-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
 {activeSession.patientAvatar}
 </div>
 <div>
 <h3 className="font-semibold text-white">{activeSession.patientName}</h3>
 <p className="text-sm text-stone-400">{activeSession.careType}</p>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <div className="px-3 py-1 bg-red-500 rounded-full text-white text-sm font-mono">
 {formatTime(callDuration)}
 </div>
 <span className="flex items-center gap-1 text-green-400 text-sm">
 <Shield className="size-4" />
 Encrypted
 </span>
 </div>
 </div>

 {/* Video Area */}
 <div className="flex-1 relative">
 <div className="absolute inset-0 flex items-center justify-center bg-stone-800">
 {isVideoOff ? (
 <div className="text-center">
 <div className="size-32 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4">
 {activeSession.patientAvatar}
 </div>
 <p className="text-white text-lg">{activeSession.patientName}</p>
 </div>
 ) : (
 <div className="text-center text-stone-400">
 <Video className="size-16 mx-auto mb-4 opacity-50" />
 <p>Patient video feed</p>
 </div>
 )}
 </div>

 {/* Provider PIP */}
 <div className="absolute bottom-4 right-4 w-48 h-36 bg-stone-700 rounded-xl overflow-hidden border-2 border-stone-600">
 {isVideoOff ? (
 <div className="size-full flex items-center justify-center">
 <VideoOff className="size-8 text-stone-500" />
 </div>
 ) : (
 <div className="size-full flex items-center justify-center text-stone-400">
 <p className="text-sm">Your camera</p>
 </div>
 )}
 </div>

 {/* Notes Panel */}
 {showNotes && (
 <div className="absolute top-4 right-4 w-80 bg-white rounded-xl shadow-xl p-4 max-h-96 overflow-y-auto">
 <h4 className="font-semibold text-stone-900 mb-3">Session Notes</h4>
 <textarea
 placeholder="Add notes during session..."
 className="w-full h-48 p-3 border border-stone-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 <Button size="sm" className="mt-2 w-full">Save Notes</Button>
 </div>
 )}
 </div>

 {/* Call Controls */}
 <div className="p-6 bg-stone-800 flex items-center justify-center gap-4">
 <button
 onClick={() => setIsMuted(!isMuted)}
 className={`p-4 rounded-full ${isMuted ? 'bg-red-500' : 'bg-stone-700 hover:bg-stone-600'}`}
 >
 {isMuted ? <MicOff className="size-6 text-white" /> : <Mic className="size-6 text-white" />}
 </button>
 <button
 onClick={() => setIsVideoOff(!isVideoOff)}
 className={`p-4 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-stone-700 hover:bg-stone-600'}`}
 >
 {isVideoOff ? <VideoOff className="size-6 text-white" /> : <Video className="size-6 text-white" />}
 </button>
 <button className="p-4 rounded-full bg-stone-700 hover:bg-stone-600">
 <Monitor className="size-6 text-white" />
 </button>
 <button
 onClick={() => setShowNotes(!showNotes)}
 className={`p-4 rounded-full ${showNotes ? 'bg-teal-500' : 'bg-stone-700 hover:bg-stone-600'}`}
 >
 <FileText className="size-6 text-white" />
 </button>
 <button
 onClick={endCall}
 className="p-4 px-8 rounded-full bg-red-500 hover:bg-red-600"
 >
 <PhoneOff className="size-6 text-white" />
 </button>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-2xl font-semibold text-stone-900">Telehealth</h2>
 <p className="text-stone-600">Manage your virtual consultations and video calls</p>
 </div>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-3 gap-4">
 <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-white/20 rounded-lg">
 <Calendar className="size-5" />
 </div>
 <span className="text-purple-100 text-sm">Upcoming</span>
 </div>
 <p className="text-3xl font-bold">{stats.upcoming}</p>
 <p className="text-purple-100 text-sm mt-1">Sessions scheduled</p>
 </div>
 <div className="bg-white rounded-xl p-5 border border-stone-200">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-green-100 rounded-lg">
 <CheckCircle className="size-5 text-green-600" />
 </div>
 <span className="text-stone-600 text-sm">Completed</span>
 </div>
 <p className="text-2xl font-bold text-stone-900">{stats.completed}</p>
 <p className="text-stone-500 text-sm mt-1">This month</p>
 </div>
 <div className="bg-white rounded-xl p-5 border border-stone-200">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-blue-100 rounded-lg">
 <Video className="size-5 text-blue-600" />
 </div>
 <span className="text-stone-600 text-sm">This Week</span>
 </div>
 <p className="text-2xl font-bold text-stone-900">{stats.thisWeek}</p>
 <p className="text-stone-500 text-sm mt-1">Total sessions</p>
 </div>
 </div>

 {/* Tabs */}
 <div className="bg-white rounded-xl border border-stone-200">
 <div className="flex border-b border-stone-200">
 <button
 onClick={() => setActiveTab('upcoming')}
 className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'upcoming' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-stone-500 hover:text-stone-700' }`}
 >
 <span className="flex items-center justify-center gap-2">
 <Calendar className="size-4" />
 Upcoming
 {mockUpcomingSessions.length > 0 && (
 <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs">
 {mockUpcomingSessions.length}
 </span>
 )}
 </span>
 </button>
 <button
 onClick={() => setActiveTab('past')}
 className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'past' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-stone-500 hover:text-stone-700' }`}
 >
 <span className="flex items-center justify-center gap-2">
 <CheckCircle className="size-4" />
 Past Sessions
 </span>
 </button>
 </div>
 </div>

 {/* Sessions List */}
 {sessions.length === 0 ? (
 <div className="bg-white rounded-xl p-12 border border-stone-200 text-center">
 <Video className="size-16 text-stone-300 mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-stone-900 mb-2">No sessions</h3>
 <p className="text-stone-600">
 {activeTab === 'upcoming' ? "You don't have any upcoming telehealth sessions" : "No past sessions to display"}
 </p>
 </div>
 ) : (
 <div className="space-y-4">
 {sessions.map((session) => {
 const timeUntil = getTimeUntil(session.scheduledAt);
 const isStartingSoon = timeUntil && !timeUntil.includes('h');

 return (
 <div
 key={session.id}
 className={`bg-white rounded-xl p-6 border shadow-sm transition-all ${isStartingSoon ? 'border-purple-200 ring-2 ring-purple-100' : 'border-stone-200' }`}
 >
 <div className="flex items-start justify-between">
 <div className="flex items-start gap-4">
 <div className="relative">
 <div className="size-14 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
 {session.patientAvatar}
 </div>
 <div className="absolute -bottom-1 -right-1 size-6 rounded-full flex items-center justify-center bg-purple-100">
 <Video className="size-3 text-purple-600" />
 </div>
 </div>
 <div>
 <h3 className="text-lg font-semibold text-stone-900">{session.patientName}</h3>
 <p className="text-sm text-stone-500">{session.careType}</p>
 <div className="flex items-center gap-3 mt-2 text-sm text-stone-600">
 <span className="flex items-center gap-1">
 <Calendar className="size-4 text-stone-400" />
 {formatDate(session.scheduledAt)}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="size-4 text-stone-400" />
 {formatTimeOnly(session.scheduledAt)}
 </span>
 <span className="text-stone-400">•</span>
 <span>{session.duration} min</span>
 </div>
 {session.notes && (
 <p className="mt-2 p-2 bg-stone-50 rounded-lg text-sm text-stone-600">
 📝 {session.notes}
 </p>
 )}
 </div>
 </div>

 <div className="flex flex-col items-end gap-2">
 {session.status === 'scheduled' && timeUntil && (
 <span className={`px-3 py-1 rounded-full text-sm font-medium ${isStartingSoon ? 'bg-purple-100 text-purple-700 animate-pulse' : 'bg-blue-100 text-blue-700' }`}>
 {timeUntil}
 </span>
 )}

 {session.status === 'completed' && (
 <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
 <CheckCircle className="size-3" />
 Completed
 </span>
 )}
 </div>
 </div>

 {/* Actions */}
 <div className="flex gap-3 mt-4 pt-4 border-t border-stone-100">
 {session.status === 'scheduled' && (
 <>
 <Button className={isStartingSoon ? 'animate-pulse' : ''} onClick={() => startCall(session)}>
 <Video className="size-4 mr-2" />
 Start Session
 </Button>
 <Link to="/provider/messages">
 <Button variant="outline">
 <MessageCircle className="size-4 mr-2" />
 Message Patient
 </Button>
 </Link>
 </>
 )}
 {session.status === 'completed' && (
  <>
  {session.recordingStatus === 'completed' && session.recordingUrl && (
  <Button variant="outline" asChild>
  <a href={session.recordingUrl} target="_blank" rel="noopener noreferrer">
  <Play className="size-4 mr-2" />
  Play Recording
  </a>
  </Button>
  )}
  {session.recordingStatus === 'processing' && (
  <Button variant="outline" disabled>
  <div className="size-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mr-2" />
  Processing Recording
  </Button>
  )}
  <Button variant="outline">
  <FileText className="size-4 mr-2" />
  View Notes
  </Button>
  <Button variant="outline">
  <Download className="size-4 mr-2" />
  Export Summary
  </Button>
  </>
  )}
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Tips */}
 <div className="bg-gradient-to-br from-purple-50 to-teal-50 rounded-xl p-6 border border-purple-100">
 <div className="flex items-start gap-4">
 <div className="p-3 bg-purple-100 rounded-xl">
 <Shield className="size-6 text-purple-600" />
 </div>
 <div>
 <h4 className="font-semibold text-stone-900 mb-2">Telehealth Best Practices</h4>
 <ul className="text-sm text-stone-600 space-y-1">
 <li>• Ensure you&apos;re in a private, well-lit environment</li>
 <li>• Test your audio and video before each session</li>
 <li>• Have patient records ready for reference</li>
 <li>• Document notes during or immediately after the call</li>
 </ul>
 </div>
 </div>
 </div>
 </div>
 );
}
