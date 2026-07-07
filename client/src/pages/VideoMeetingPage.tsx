/**
 * Video Meeting Page
 * Automatically joins the video room upon visiting /meeting/[roomId]
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, useRef, lazy, Suspense } from 'react';

const VideoMeeting = lazy(() => import('../components/VideoMeeting'));
export default function MeetingPage() {
 const params = useParams();
 const navigate = useNavigate();
 const { user, loading: authLoading } = useAuth();
 const roomId = params.roomId as string;
 // Backend generates room names as room_{bookingId}_{random}
 const bookingId = roomId.startsWith('room_') ? roomId.split('_')[1] : undefined;
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
 setMounted(true);
 }, []);

 const handleLeave = () => {
 // Redirect back to bookings page or home
 if (user?.role === 'provider') {
 navigate('/provider/dashboard');
 } else {
 navigate('/careseeker/bookings');
 }
 };

 if (!mounted || authLoading) {
 return (
 <div className="h-screen bg-stone-900 flex items-center justify-center">
 <Loader2 className="size-10 text-teal-500 animate-spin" />
 </div>
 );
 }

 if (!user) {
 // You might want to handle unauthenticated users differently,
 // e.g., redirect to login with a returnUrl
 navigate(`/careseeker/login`);
 return null;
 }

 return (
 <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin size-8" /></div>}>
 <VideoMeeting
 roomName={roomId}
 userName={`${user.firstName} ${user.lastName}` || 'Guest'}
 bookingId={bookingId}
 onLeave={handleLeave}
 />
 </Suspense>
 );
}
