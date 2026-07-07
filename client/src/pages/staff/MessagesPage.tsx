
import { useState } from "react";
import { Send, Search, User, Clock, Users } from "lucide-react";




interface Message {
 id: number;
 sender: string;
 content: string;
 timestamp: string;
 isOwn: boolean;
}

interface Conversation {
 id: number;
 name: string;
 role: string;
 lastMessage: string;
 timestamp: string;
 unread: number;
 avatar: string;
}

export default function StaffMessagesPage() {
 const [selectedConversation, setSelectedConversation] = useState<number | null>(1);
 const [messageText, setMessageText] = useState("");

 const conversations: Conversation[] = [
 {
 id: 1,
 name: "Care Team",
 role: "Group Chat",
 lastMessage: "Meeting scheduled for tomorrow at 2 PM",
 timestamp: "11:45 AM",
 unread: 3,
 avatar: "CT",
 },
 {
 id: 2,
 name: "Margaret Thompson",
 role: "Patient",
 lastMessage: "Thank you for your help today!",
 timestamp: "10:30 AM",
 unread: 0,
 avatar: "MT",
 },
 {
 id: 3,
 name: "Admin Team",
 role: "Administration",
 lastMessage: "Timesheet reminder for this week",
 timestamp: "Yesterday",
 unread: 1,
 avatar: "AT",
 },
 ];

 const messages: Message[] = [
 {
 id: 1,
 sender: "Sarah (Coordinator)",
 content: "Team meeting tomorrow at 2 PM in the main conference room",
 timestamp: "10:00 AM",
 isOwn: false,
 },
 {
 id: 2,
 sender: "You",
 content: "I'll be there. What's the agenda?",
 timestamp: "10:15 AM",
 isOwn: true,
 },
 {
 id: 3,
 sender: "Sarah (Coordinator)",
 content: "We'll discuss new patient assignments and training updates",
 timestamp: "11:45 AM",
 isOwn: false,
 },
 ];

 const handleSendMessage = () => {
 if (messageText.trim()) {
 setMessageText("");
 }
 };

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Messages</h1>
 <p className="text-sm text-stone-500">Communicate with team and patients</p>
 </div>

 <div className="grid md:grid-cols-3 gap-6 h-[600px]">
 {/* Conversations List */}
 <div className="md:col-span-1 rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col">
 <div className="p-4 border-b">
 <div className="flex items-center rounded-lg border bg-stone-50 px-3 py-2">
 <Search className="mr-2 size-4 text-stone-400" />
 <input
 type="text"
 placeholder="Search conversations..."
 className="w-full bg-transparent text-sm focus:outline-none"
 />
 </div>
 </div>

 <div className="flex-1 overflow-y-auto">
 {conversations.map((conv) => (
 <div role="button" tabIndex={0}
 key={conv.id}
 onClick={() => setSelectedConversation(conv.id)}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 className={`p-4 border-b cursor-pointer hover:bg-stone-50 ${selectedConversation === conv.id ? "bg-teal-50" : "" }`}
 >
 <div className="flex items-start gap-3">
 <div className="size-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
 {conv.role === "Group Chat" ? (
 <Users className="size-6 text-teal-700" />
 ) : (
 <span className="text-sm font-semibold text-teal-700">{conv.avatar}</span>
 )}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between mb-1">
 <h3 className="text-sm font-semibold text-stone-900 truncate">{conv.name}</h3>
 <span className="text-xs text-stone-500">{conv.timestamp}</span>
 </div>
 <p className="text-xs text-stone-500 mb-1">{conv.role}</p>
 <p className="text-sm text-stone-600 truncate">{conv.lastMessage}</p>
 </div>
 {conv.unread > 0 && (
 <div className="size-5 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
 <span className="text-xs font-semibold text-white">{conv.unread}</span>
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Chat Window */}
 <div className="md:col-span-2 rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col">
 {selectedConversation ? (
 <>
 <div className="p-4 border-b bg-stone-50">
 <div className="flex items-center gap-3">
 <div className="size-10 rounded-full bg-teal-100 flex items-center justify-center">
 {conversations.find(c => c.id === selectedConversation)?.role === "Group Chat" ? (
 <Users className="size-5 text-teal-700" />
 ) : (
 <span className="text-sm font-semibold text-teal-700">
 {conversations.find(c => c.id === selectedConversation)?.avatar}
 </span>
 )}
 </div>
 <div>
 <h3 className="font-semibold text-stone-900">
 {conversations.find(c => c.id === selectedConversation)?.name}
 </h3>
 <p className="text-xs text-stone-500">
 {conversations.find(c => c.id === selectedConversation)?.role}
 </p>
 </div>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto p-4 space-y-4">
 {messages.map((message) => (
 <div
 key={message.id}
 className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
 >
 <div className={`max-w-[70%] ${message.isOwn ? "order-2" : "order-1"}`}>
 {!message.isOwn && (
 <p className="text-xs text-stone-500 mb-1 ml-1">{message.sender}</p>
 )}
 <div
 className={`rounded-lg px-4 py-2 ${message.isOwn ? "bg-teal-600 text-white" : "bg-stone-100 text-stone-900" }`}
 >
 <p className="text-sm">{message.content}</p>
 </div>
 <div className="flex items-center mt-1 gap-1 text-xs text-stone-500">
 <Clock className="size-3" />
 <span>{message.timestamp}</span>
 </div>
 </div>
 </div>
 ))}
 </div>

 <div className="p-4 border-t">
 <div className="flex items-center gap-2">
 <input
 type="text"
 value={messageText}
 onChange={(e) => setMessageText(e.target.value)}
 onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
 placeholder="Type a message..."
 className="flex-1 rounded-lg border border-stone-300 px-4 py-2 focus:border-teal-500 focus:outline-none"
 />
 <button
 onClick={handleSendMessage}
 className="rounded-lg bg-teal-600 p-2 text-white hover:bg-teal-500"
 >
 <Send className="size-5" />
 </button>
 </div>
 </div>
 </>
 ) : (
 <div className="flex-1 flex items-center justify-center text-stone-500">
 <p>Select a conversation to start messaging</p>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
