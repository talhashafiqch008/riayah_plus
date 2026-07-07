import * as React from "react";
import { cn } from "@/lib/utils";
import { Phone, Ambulance, Siren } from "lucide-react";

export interface EmergencyFabProps {
 variant?: "default" | "urgent";
 className?: string;
 onClick?: () => void;
}

export function EmergencyFab({ variant = "default", className, onClick }: EmergencyFabProps) {
 return (
 <button
 onClick={onClick}
 className={cn(
 "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95",
 variant === "urgent"
 ? "bg-red-600 text-white shadow-red-500/40 animate-pulse"
 : "bg-red-500 text-white shadow-red-500/30 hover:bg-red-600",
 className
 )}
 >
 <div className="relative">
 <Siren className="size-5" />
 {variant === "urgent" && (
 <span className="absolute -top-1 -right-1 size-2.5 bg-white rounded-full animate-ping" />
 )}
 </div>
 <span className="text-sm font-bold">Emergency</span>
 </button>
 );
}

export function EmergencyContactCard({ className }: { className?: string }) {
 return (
 <div className={cn(
 "p-5 bg-red-50 border border-red-100 rounded-[var(--radius-xl)]",
 className
 )}>
 <div className="flex items-start gap-4">
 <div className="p-2.5 bg-red-100 rounded-[var(--radius-lg)]">
 <Ambulance className="size-5 text-red-600" />
 </div>
 <div>
 <h4 className="text-sm font-semibold text-red-900 mb-1">Emergency Hotline</h4>
 <p className="text-xs text-red-700 mb-3">
 For life-threatening emergencies, call immediately. Available 24/7.
 </p>
 <a
 href="tel:999"
 className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-[var(--radius-md)] hover:bg-red-700 transition-colors"
 >
 <Phone className="size-4" />
 Call 999
 </a>
 </div>
 </div>
 </div>
 );
}
