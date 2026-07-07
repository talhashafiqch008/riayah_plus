/**
 * Telehealth Page
 * Careseeker interface for virtual consultations and video calls
 */


import { useState, useEffect , useRef } from 'react';
import {
 Video,
 Phone,
 Calendar,
 Clock,
 CheckCircle,
 AlertCircle,
 Play,
 Wifi,
 Mic,
 Camera,
 Monitor,
 Star,
 MessageCircle,
 FileText,
 Shield,
 Headphones,
 Settings,
 ChevronRight,
 Download,
 ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';




interface TelehealthSession {
 id: string;
 providerId: string;
 providerName: string;
 providerAvatar: string;
 providerSpecialty: string;
 scheduledAt: string;
 duration: number;
 type: 'video' | 'phone';
 status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
 meetingUrl?: string;
 rating?: number;
 notes?: string;
 recordingUrl?: string;
 recordingDuration?: number;
 recordingStatus?: 'none' | 'processing' | 'completed' | 'failed';
}

// Mock data - will be replaced with API data
const getMockUpcomingSessions = (): TelehealthSession[] => [
 {
 id: '1',
 providerId: 'p1',
 providerName: 'Sarah Johnson',
 providerAvatar: 'SJ',
 providerSpecialty: 'Elderly Care Specialist',
 scheduledAt: new Date(Date.now() + 3600000).toISOString(), // In 1 hour
 duration: 30,
 type: 'video',
 status: 'scheduled',
 meetingUrl: '/telehealth/join/1',
 },
 {
 id: '2',
 providerId: 'p2',
 providerName: 'Michael Chen',
 providerAvatar: 'MC',
 providerSpecialty: 'Disability Care Provider',
 scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
 duration: 45,
 type: 'video',
 status: 'scheduled',
 },
 {
 id: '3',
 providerId: 'p3',
 providerName: 'Emma Williams',
 providerAvatar: 'EW',
 providerSpecialty: 'Allied Health Provider',
 scheduledAt: new Date(Date.now() + 172800000).toISOString(), // In 2 days
 duration: 30,
 type: 'phone',
 status: 'scheduled',
 },
];

const getMockPastSessions = (): TelehealthSession[] => [
  {
  id: '4',
  providerId: 'p1',
  providerName: 'Sarah Johnson',
  providerAvatar: 'SJ',
  providerSpecialty: 'Elderly Care Specialist',
  scheduledAt: new Date(Date.now() - 86400000).toISOString(),
  duration: 30,
  type: 'video',
  status: 'completed',
  rating: 5,
  notes: 'Discussed care plan adjustments and support schedule.',
  recordingUrl: '#',
  recordingDuration: 28,
  recordingStatus: 'completed',
  },
  {
  id: '5',
  providerId: 'p2',
  providerName: 'Michael Chen',
  providerAvatar: 'MC',
  providerSpecialty: 'Disability Care Provider',
  scheduledAt: new Date(Date.now() - 259200000).toISOString(),
  duration: 45,
  type: 'video',
  status: 'completed',
  rating: 4,
  notes: 'Follow-up on support progress.',
  recordingStatus: 'processing',
  },
 {
 id: '6',
 providerId: 'p3',
 providerName: 'Emma Williams',
 providerAvatar: 'EW',
 providerSpecialty: 'Allied Health Provider',
 scheduledAt: new Date(Date.now() - 604800000).toISOString(),
 duration: 30,
 type: 'phone',
 status: 'cancelled',
 },
];

export default function TelehealthPage() {
 const { user } = useAuth();
 const [sessions, setSessions] = useState<TelehealthSession[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
 const [showDeviceTest, setShowDeviceTest] = useState(false);
 const [deviceStatus, setDeviceStatus] = useState({
 camera: false,
 microphone: false,
 speaker: false,
 });

 // Get currency based on country
 const currency = user?.country === 'EGY' ? 'EGP' : 'QAR';
 
 // Get session counts for tabs
 const upcomingCount = getMockUpcomingSessions().length;
 const pastCount = getMockPastSessions().length;

 useEffect(() => {
 setLoading(true);
 const timeoutId = setTimeout(() => {
 const upcomingSessions = getMockUpcomingSessions();
 const pastSessions = getMockPastSessions();
 setSessions(activeTab === 'upcoming' ? upcomingSessions : pastSessions);
 setLoading(false);
 }, 300);
 return () => clearTimeout(timeoutId);
 }, [activeTab]);

 const formatDate = (dateString: string) => {
 const date = new Date(dateString);
 const now = new Date();
 const isToday = date.toDateString() === now.toDateString();
 const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();

 if (isToday) return 'Today';
 if (isTomorrow) return 'Tomorrow';

 return date.toLocaleDateString('en-US', {
 weekday: 'short',
 month: 'short',
 day: 'numeric',
 });
 };

 const formatTime = (dateString: string) => {
 const date = new Date(dateString);
 return date.toLocaleTimeString('en-US', {
 hour: '2-digit',
 minute: '2-digit',
 });
 };

 const getTimeUntil = (dateString: string) => {
 // eslint-disable-next-line react-hooks/purity
 const diff = new Date(dateString).getTime() - Date.now();
 if (diff < 0) return null;

 const hours = Math.floor(diff / 3600000);
 const minutes = Math.floor((diff % 3600000) / 60000);

 if (hours > 24) return null;
 if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
 if (minutes > 0) return `Starts in ${minutes} minutes`;
 return 'Starting now';
 };

 const testDevices = () => {
 setShowDeviceTest(true);
 // Simulate device testing
 setTimeout(() => setDeviceStatus(prev => ({ ...prev, camera: true })), 500);
 setTimeout(() => setDeviceStatus(prev => ({ ...prev, microphone: true })), 1000);
 setTimeout(() => setDeviceStatus(prev => ({ ...prev, speaker: true })), 1500);
 };

 const allSessions = [...getMockUpcomingSessions(), ...getMockPastSessions()];
 const stats = {
 upcoming: allSessions.filter(s => (s.status === 'scheduled' || s.status === 'in-progress')).length,
 completed: allSessions.filter(s => s.status === 'completed').length,
 totalHours: allSessions.filter(s => s.status === 'completed').reduce((acc, s) => acc + s.duration, 0) / 60,
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600"></div>
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
 <div className="flex gap-3">
 <Button variant="outline" onClick={testDevices}>
 <Settings className="size-4 mr-2" />
 Test Devices
 </Button>
 <Link to="/careseeker/providers">
 <Button>
 <Video className="size-4 mr-2" />
 Schedule Session
 </Button>
 </Link>
 </div>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-5 text-white">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-white/20 rounded-lg">
 <Calendar className="size-5" />
 </div>
 <span className="text-teal-100 text-sm">Upcoming</span>
 </div>
 <p className="text-3xl font-bold">{stats.upcoming}</p>
 <p className="text-teal-100 text-sm mt-1">Sessions scheduled</p>
 </div>
 <div className="bg-white rounded-xl p-5 ring-1 ring-stone-200/50">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-green-100 rounded-lg">
 <CheckCircle className="size-5 text-green-600" />
 </div>
 <span className="text-stone-600 text-sm">Completed</span>
 </div>
 <p className="text-2xl font-bold text-stone-900">{stats.completed}</p>
 <p className="text-stone-500 text-sm mt-1">Sessions this month</p>
 </div>
 <div className="bg-white rounded-xl p-5 ring-1 ring-stone-200/50">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-purple-100 rounded-lg">
 <Clock className="size-5 text-purple-600" />
 </div>
 <span className="text-stone-600 text-sm">Total Time</span>
 </div>
 <p className="text-2xl font-bold text-stone-900">{stats.totalHours.toFixed(1)}h</p>
 <p className="text-stone-500 text-sm mt-1">In consultations</p>
 </div>
 </div>

 {/* Device Test Modal */}
 {showDeviceTest && (
 <div className="bg-white rounded-xl p-6 ring-1 ring-stone-200/50 shadow-lg">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-stone-900">Device Check</h3>
 <button onClick={() => setShowDeviceTest(false)} className="text-stone-400 hover:text-stone-600">✕</button>
 </div>
 <div className="grid grid-cols-3 gap-4">
 <div className={`p-4 rounded-xl text-center ${deviceStatus.camera ? 'bg-green-50 border border-green-200' : 'bg-stone-50 ring-1 ring-stone-200/50'}`}>
 <Camera className={`size-8 mx-auto mb-2 ${deviceStatus.camera ? 'text-green-600' : 'text-stone-400'}`} />
 <p className="font-medium text-stone-900">Camera</p>
 <p className={`text-sm ${deviceStatus.camera ? 'text-green-600' : 'text-stone-500'}`}>
 {deviceStatus.camera ? '✓ Working' : 'Testing...'}
 </p>
 </div>
 <div className={`p-4 rounded-xl text-center ${deviceStatus.microphone ? 'bg-green-50 border border-green-200' : 'bg-stone-50 ring-1 ring-stone-200/50'}`}>
 <Mic className={`size-8 mx-auto mb-2 ${deviceStatus.microphone ? 'text-green-600' : 'text-stone-400'}`} />
 <p className="font-medium text-stone-900">Microphone</p>
 <p className={`text-sm ${deviceStatus.microphone ? 'text-green-600' : 'text-stone-500'}`}>
 {deviceStatus.microphone ? '✓ Working' : 'Testing...'}
 </p>
 </div>
 <div className={`p-4 rounded-xl text-center ${deviceStatus.speaker ? 'bg-green-50 border border-green-200' : 'bg-stone-50 ring-1 ring-stone-200/50'}`}>
 <Headphones className={`size-8 mx-auto mb-2 ${deviceStatus.speaker ? 'text-green-600' : 'text-stone-400'}`} />
 <p className="font-medium text-stone-900">Speaker</p>
 <p className={`text-sm ${deviceStatus.speaker ? 'text-green-600' : 'text-stone-500'}`}>
 {deviceStatus.speaker ? '✓ Working' : 'Testing...'}
 </p>
 </div>
 </div>
 {deviceStatus.camera && deviceStatus.microphone && deviceStatus.speaker && (
 <div className="mt-4 p-3 bg-green-50 rounded-lg text-center">
 <p className="text-green-700 font-medium flex items-center justify-center gap-2">
 <CheckCircle className="size-5" />
 All devices working! You&apos;re ready for your session.
 </p>
 </div>
 )}
 </div>
 )}

 {/* Quick Actions */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white relative overflow-hidden">
 <div className="absolute top-0 right-0 size-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
 <div className="relative">
 <div className="flex items-center gap-4">
 <div className="size-14 bg-white/20 rounded-xl flex items-center justify-center">
 <Video className="size-7" />
 </div>
 <div>
 <h3 className="text-xl font-semibold">Video Consultation</h3>
 <p className="text-teal-100">Face-to-face virtual care</p>
 </div>
 </div>
 <div className="mt-4 flex gap-3">
 <Link to="/careseeker/providers">
 <Button className="bg-white text-teal-600 hover:bg-teal-50">
 Schedule Now
 </Button>
 </Link>
 </div>
 </div>
 </div>

 <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white relative overflow-hidden">
 <div className="absolute top-0 right-0 size-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
 <div className="relative">
 <div className="flex items-center gap-4">
 <div className="size-14 bg-white/20 rounded-xl flex items-center justify-center">
 <Phone className="size-7" />
 </div>
 <div>
 <h3 className="text-xl font-semibold">Phone Consultation</h3>
 <p className="text-teal-100">Quick audio-only session</p>
 </div>
 </div>
 <div className="mt-4 flex gap-3">
 <Link to="/careseeker/providers">
 <Button className="bg-white text-teal-600 hover:bg-teal-50">
 Schedule Now
 </Button>
 </Link>
 </div>
 </div>
 </div>
 </div>

 {/* Tabs */}
 <div className="bg-white rounded-xl ring-1 ring-stone-200/50">
 <div className="flex border-b ring-1 ring-stone-200/50">
 <button
 onClick={() => setActiveTab('upcoming')}
 className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'upcoming' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-stone-500 hover:text-stone-700' }`}
 >
 <span className="flex items-center justify-center gap-2">
 <Calendar className="size-4" />
 Upcoming Sessions
 {upcomingCount > 0 && (
 <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs">
 {upcomingCount}
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
 <div className="bg-white rounded-xl ring-1 ring-stone-200/50 p-12 text-center">
 <Video className="size-16 text-stone-300 mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-stone-900 mb-2">
 No {activeTab} sessions
 </h3>
 <p className="text-stone-600 mb-4">
 {activeTab === 'upcoming'
 ? "You don't have any upcoming telehealth sessions"
 : "You haven't had any telehealth sessions yet"}
 </p>
 {activeTab === 'upcoming' && (
 <Link to="/careseeker/providers">
 <Button>Schedule a Session</Button>
 </Link>
 )}
 </div>
 ) : (
 <div className="space-y-4">
 {sessions.map((session) => {
 const timeUntil = getTimeUntil(session.scheduledAt);
 const isStartingSoon = timeUntil && !timeUntil.includes('h');

 return (
 <div
 key={session.id}
 className={`bg-white rounded-xl border  hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow ${isStartingSoon ? 'border-teal-200 ring-2 ring-teal-100' : 'ring-1 ring-stone-200/50' }`}
 >
 <div className="p-6">
 <div className="flex items-start justify-between">
 <div className="flex items-start gap-4">
 <div className="relative">
 <div className="size-14 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
 {session.providerAvatar}
 </div>
 <div className={`absolute -bottom-1 -right-1 size-6 rounded-full flex items-center justify-center ${session.type === 'video' ? 'bg-purple-100' : 'bg-blue-100' }`}>
 {session.type === 'video' ? (
 <Video className="size-3 text-purple-600" />
 ) : (
 <Phone className="size-3 text-blue-600" />
 )}
 </div>
 </div>
 <div>
 <h3 className="text-lg font-semibold text-stone-900">
 {session.providerName}
 </h3>
 <p className="text-sm text-stone-500">
 {session.providerSpecialty}
 </p>
 <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-stone-600">
 <div className="flex items-center gap-1">
 <Calendar className="size-4 text-stone-400" />
 <span>{formatDate(session.scheduledAt)}</span>
 </div>
 <div className="flex items-center gap-1">
 <Clock className="size-4 text-stone-400" />
 <span>{formatTime(session.scheduledAt)}</span>
 </div>
 <span className="text-stone-400">•</span>
 <span>{session.duration} min</span>
 </div>

 {/* Session Notes for Past Sessions */}
 {session.notes && (
 <div className="mt-3 p-3 bg-stone-50 rounded-lg">
 <p className="text-sm text-stone-600 flex items-start gap-2">
 <FileText className="size-4 text-stone-400 mt-0.5 flex-shrink-0" />
 {session.notes}
 </p>
 </div>
 )}
 </div>
 </div>

 <div className="flex flex-col items-end gap-2">
 {/* Time Until / Status Badge */}
 {session.status === 'scheduled' && timeUntil && (
 <span className={`px-3 py-1 rounded-full text-sm font-medium ${isStartingSoon ? 'bg-teal-100 text-teal-700 animate-pulse' : 'bg-blue-100 text-blue-700' }`}>
 {timeUntil}
 </span>
 )}

 {session.status === 'completed' && (
 <div className="flex items-center gap-2">
 {session.rating && (
 <div className="flex items-center gap-1">
 {[...Array(5)].map((_, i) => (
 <Star
 key={`star-${i}`}
 className={`size-4 ${i < session.rating! ? 'text-yellow-400 fill-current' : 'text-stone-300'}`}
 />
 ))}
 </div>
 )}
 <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
 <CheckCircle className="size-3" />
 Completed
 </span>
 </div>
 )}

 {session.status === 'cancelled' && (
 <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
 Cancelled
 </span>
 )}
 </div>
 </div>

 {/* Action Buttons */}
 {session.status === 'scheduled' && (
 <div className="flex gap-3 mt-4 pt-4 border-t ring-1 ring-stone-100/50">
 {session.type === 'video' && (
 <Button className={isStartingSoon ? 'animate-pulse' : ''}>
 <Play className="size-4 mr-2" />
 Join Video Call
 </Button>
 )}
 {session.type === 'phone' && (
 <Button>
 <Phone className="size-4 mr-2" />
 Start Phone Call
 </Button>
 )}
 <Link to="/careseeker/messages">
 <Button variant="outline">
 <MessageCircle className="size-4 mr-2" />
 Message
 </Button>
 </Link>
 <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
 Cancel
 </Button>
 </div>
 )}

 {session.status === 'completed' && (
  <div className="flex gap-3 mt-4 pt-4 border-t ring-1 ring-stone-100/50">
  {session.recordingStatus === 'completed' && session.recordingUrl && (
  <Button variant="outline" size="sm" asChild>
  <a href={session.recordingUrl} target="_blank" rel="noopener noreferrer">
  <Play className="size-4 mr-2" />
  Play Recording
  </a>
  </Button>
  )}
  {session.recordingStatus === 'processing' && (
  <Button variant="outline" size="sm" disabled>
  <div className="size-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mr-2" />
  Processing Recording
  </Button>
  )}
  <Button variant="outline" size="sm">
  <Download className="size-4 mr-2" />
  Download Summary
  </Button>
  <Button variant="outline" size="sm">
  <Video className="size-4 mr-2" />
  Book Follow-up
  </Button>
  </div>
  )}
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Tips Section */}
 <div className="bg-gradient-to-br from-teal-50 to-teal-50 rounded-xl p-6 border border-teal-100">
 <div className="flex items-start gap-4">
 <div className="p-3 bg-blue-100 rounded-xl">
 <Shield className="size-6 text-blue-600" />
 </div>
 <div className="flex-1">
 <h4 className="font-semibold text-stone-900 mb-3">Tips for a Great Telehealth Session</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {[
 { icon: Wifi, text: 'Ensure stable internet connection' },
 { icon: Monitor, text: 'Find a quiet, well-lit space' },
 { icon: Camera, text: 'Test your camera & microphone' },
 { icon: FileText, text: 'Have care documents ready' },
 ].map((tip) => (
 <div key={tip.text} className="flex items-center gap-2 text-sm text-stone-700">
 <tip.icon className="size-4 text-blue-500" />
 <span>{tip.text}</span>
 </div>
 ))}
 </div>
 </div>
 <Button variant="outline" size="sm" onClick={testDevices}>
 Test My Setup
 </Button>
 </div>
 </div>

 {/* Support Section */}
 <div className="bg-white rounded-xl p-6 ring-1 ring-stone-200/50">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-teal-100 rounded-xl">
 <Headphones className="size-6 text-teal-600" />
 </div>
 <div>
 <h4 className="font-semibold text-stone-900">Need Technical Support?</h4>
 <p className="text-sm text-stone-500">Having trouble with your session? We&apos;re here to help.</p>
 </div>
 </div>
 <Button variant="outline">
 Contact Support
 <ChevronRight className="size-4 ml-1" />
 </Button>
 </div>
 </div>

 {/* Marketplace Disclaimer */}
 <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
 <p className="text-xs text-amber-800 text-center">
 <strong>Important:</strong> Raiyah Plus is a technology marketplace. All providers operate independently. 
 We do not provide medical services or employ providers. Operating in {user?.country === 'EGY' ? 'Egypt 🇪🇬' : 'Qatar 🇶🇦'} only.
 </p>
 </div>
 </div>
 );
}
