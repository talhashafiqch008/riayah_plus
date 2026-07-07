
import { useEffect, useState, useRef } from 'react';
import {
 LiveKitRoom,
 VideoConference,
 GridLayout,
 ParticipantTile,
 RoomAudioRenderer,
 ControlBar,
 useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor } from 'lucide-react';

interface VideoMeetingProps {
 roomName: string;
 userName: string;
 bookingId?: string | number;
 onLeave?: () => void;
}

export default function VideoMeeting({ roomName, userName, bookingId, onLeave }: VideoMeetingProps) {
 const [token, setToken] = useState<string>('');
 const [serverUrl, setServerUrl] = useState<string>('');
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string>('');

 // TODO: Refactor cascading setState into useReducer or batched update
 // TODO: Combine multiple setState calls
 useEffect(() => {
 // Get LiveKit token from your backend
 const getToken = async () => {
 try {
 setIsLoading(true);
 const { getLiveKitToken } = await import('@/lib/api');

 // Get token and server URL from backend
 const response = await getLiveKitToken({
 roomName,
 participantName: userName,
 bookingId,
 });

 if (response.data?.token) {
 setToken(response.data.token);
 // Use server URL from backend if available
 if (response.data.livekit_url) {
 setServerUrl(response.data.livekit_url);
 }
 } else {
 setError('Failed to get meeting token');
 }
 } catch (err: unknown) {
 console.error('Error getting LiveKit token:', err);
 setError(err instanceof Error ? err.message : 'Failed to connect to meeting');
 } finally {
 setIsLoading(false);
 }
 };

 getToken();
 }, [roomName, userName]);

 if (isLoading) {
 return (
 <div className="flex items-center justify-center h-screen bg-stone-900">
 <div className="text-center max-w-md px-4">
 <div className="size-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
 <p className="text-white text-lg mb-4">Connecting to meeting…</p>
 <p className="text-stone-400 text-sm">
 For your privacy, these sessions are end-to-end encrypted and never recorded.
 </p>
 </div>
 </div>
 );
 }

 if (error) {
 return (
 <div className="flex items-center justify-center h-screen bg-stone-900">
 <div className="text-center max-w-md">
 <div className="size-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
 <VideoOff className="size-8 text-red-500" />
 </div>
 <h2 className="text-white text-xl font-semibold mb-2">Connection Failed</h2>
 <p className="text-stone-400 mb-6">{error}</p>
 <button
 onClick={onLeave}
 className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
 >
 Go Back
 </button>
 </div>
 </div>
 );
 }

 if (!token || !serverUrl) {
 return null;
 }

 return (
 <div className="h-screen bg-stone-900">
 <LiveKitRoom
 video={true}
 audio={true}
 token={token}
 serverUrl={serverUrl}
 data-lk-theme="default"
 style={{ height: '100vh' }}
 onDisconnected={onLeave}
 >
 {/* Main Video Conference UI */}
 <VideoConference />

 {/* Audio Renderer */}
 <RoomAudioRenderer />

 {/* Custom Leave Button */}
 <div className="absolute top-4 right-4 z-50">
 <button
 onClick={onLeave}
 className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-lg"
 >
 <PhoneOff className="size-5" />
 <span>Leave Meeting</span>
 </button>
 </div>
 </LiveKitRoom>
 </div>
 );
}
