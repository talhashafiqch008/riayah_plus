
import { useParams, useNavigate } from 'react-router-dom';
import { ChatWindowWithHook } from '@/components/chat/ChatWindowWithHook';
import { ArrowRight } from 'lucide-react';




export default function ChatPage() {
 const params = useParams();
 const navigate = useNavigate();
 const receiverId = params.userId as string;

 return (
 <div className="min-h-screen bg-stone-50">
 <div className="container mx-auto px-4 py-8">
 <div className="max-w-4xl mx-auto">
 {/* Header */}
 <div className="mb-6 flex items-center gap-4">
 <button
 onClick={() => navigate(-1)}
 className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
 >
 <ArrowRight className="size-6 text-stone-600" />
 </button>
 <div>
 <h1 className="text-2xl font-semibold text-stone-900">
 المحادثة
 </h1>
 </div>
 </div>

 {/* Chat Window */}
 <div className="h-[calc(100vh-200px)] border border-stone-200 rounded-xl overflow-hidden bg-white">
 <ChatWindowWithHook receiverId={receiverId} />
 </div>
 </div>
 </div>
 </div>
 );
}
