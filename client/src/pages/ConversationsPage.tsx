
import { useState, useEffect , useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createChatService } from '@/services/chatService';
import { Conversation } from '@/types/chat';
import { MessageCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';




export default function ConversationsPage() {
 const { user } = useAuth();
 const [conversations, setConversations] = useState<Conversation[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');

 useEffect(() => {
 loadConversations();
 }, [user]);

 const loadConversations = async () => {
 try {
 setLoading(true);
 const chatService = createChatService();
 const response = await chatService.getConversations();
 setConversations(response.data.conversations);
 } catch (error) {
 console.error('Failed to load conversations:', error);
 } finally {
 setLoading(false);
 }
 };

 const filteredConversations = conversations.filter((conv) => {
 if (!searchQuery) return true;
 const otherUser = conv.other_user;
 if (!otherUser) return false;

 const fullName = `${otherUser.first_name} ${otherUser.last_name}`.toLowerCase();
 return fullName.includes(searchQuery.toLowerCase());
 });

 if (!user) {
 return (
 <div className="flex items-center justify-center min-h-screen">
 <div className="text-center">
 <h2 className="text-2xl font-semibold text-stone-900 mb-2">
 يجب تسجيل الدخول
 </h2>
 <p className="text-stone-600">
 الرجاء تسجيل الدخول للوصول إلى المحادثات
 </p>
 </div>
 </div>
 );
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-screen">
 <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600"></div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-stone-50">
 <div className="container mx-auto px-4 py-8">
 <div className="max-w-4xl mx-auto">
 {/* Header */}
 <div className="mb-6">
 <h1 className="text-3xl font-semibold text-stone-900 mb-2">
 المحادثات
 </h1>
 <p className="text-stone-600">
 جميع محادثاتك في مكان واحد
 </p>
 </div>

 {/* Search Bar */}
 <div className="mb-6">
 <div className="relative">
 <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 size-5" />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="ابحث في المحادثات..."
 className="w-full pr-10 pl-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
 dir="rtl"
 />
 </div>
 </div>

 {/* Conversations List */}
 <div className="bg-white rounded-xl shadow-sm overflow-hidden">
 {filteredConversations.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-12 px-4">
 <MessageCircle className="size-16 text-stone-300 mb-4" />
 <h3 className="text-lg font-semibold text-stone-900 mb-2">
 {searchQuery ? 'لا توجد نتائج' : 'لا توجد محادثات'}
 </h3>
 <p className="text-stone-600 text-center">
 {searchQuery
 ? 'جرب البحث بكلمات مختلفة'
 : 'ابدأ محادثة جديدة للبدء'
 }
 </p>
 </div>
 ) : (
 <div className="divide-y divide-stone-200">
 {filteredConversations.map((conversation) => {
 const otherUser = conversation.other_user;
 if (!otherUser) return null;

 return (
 <Link
 key={conversation.id}
 to={`/chat/${otherUser.id}`}
 className="block hover:bg-stone-50 transition-colors"
 >
 <div className="p-4">
 <div className="flex items-start gap-4">
 {/* Avatar */}
 <div className="flex-shrink-0">
 <div className="size-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold">
 {otherUser.first_name[0]}
 {otherUser.last_name[0]}
 </div>
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between mb-1">
 <h3 className="text-base font-semibold text-stone-900 truncate">
 {otherUser.first_name} {otherUser.last_name}
 </h3>
 {conversation.last_message && (
 <span className="text-xs text-stone-500 flex-shrink-0 mr-2">
 {new Date(conversation.last_message.created_at).toLocaleDateString('ar-EG', {
 month: 'short',
 day: 'numeric'
 })}
 </span>
 )}
 </div>

 {conversation.last_message && (
 <p className="text-sm text-stone-600 truncate">
 {conversation.last_message.message}
 </p>
 )}

 {conversation.unread_count > 0 && (
 <div className="mt-2">
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
 {conversation.unread_count} رسالة جديدة
 </span>
 </div>
 )}
 </div>
 </div>
 </div>
 </Link>
 );
 })}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
