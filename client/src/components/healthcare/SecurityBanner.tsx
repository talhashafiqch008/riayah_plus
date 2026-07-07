import * as React from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck, Shield, Lock, FileCheck } from "lucide-react";

export interface SecurityBannerProps {
 variant?: "full" | "compact";
 className?: string;
}

export function SecurityBanner({ variant = "compact", className }: SecurityBannerProps) {
 if (variant === "compact") {
 return (
 <div className={cn(
 "flex items-center gap-3 px-4 py-2.5 bg-teal-50 border border-teal-100 rounded-[var(--radius-lg)]",
 className
 )}>
 <ShieldCheck className="size-4 text-teal-600 flex-shrink-0" />
 <div className="flex items-center gap-2 text-xs text-teal-700">
 <span className="font-semibold">256-bit Encrypted</span>
 <span className="text-teal-400">|</span>
 <span>HIPAA Compliant</span>
 <span className="text-teal-400">|</span>
 <span>PDPL Verified</span>
 </div>
 </div>
 );
 }

 return (
 <div className={cn(
 "p-5 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-100 rounded-[var(--radius-xl)]",
 className
 )}>
 <div className="flex items-start gap-4">
 <div className="p-2.5 bg-teal-100 rounded-[var(--radius-lg)]">
 <Shield className="size-5 text-teal-600" />
 </div>
 <div>
 <h4 className="text-sm font-semibold text-teal-900 mb-1">Your data is protected</h4>
 <div className="grid grid-cols-2 gap-2 text-xs text-stone-600">
 <span className="flex items-center gap-1.5">
 <Lock className="size-3 text-teal-500" /> AES-256 Encryption
 </span>
 <span className="flex items-center gap-1.5">
 <FileCheck className="size-3 text-teal-500" /> HIPAA Compliant
 </span>
 <span className="flex items-center gap-1.5">
 <ShieldCheck className="size-3 text-teal-500" /> SOC 2 Certified
 </span>
 <span className="flex items-center gap-1.5">
 <Lock className="size-3 text-teal-500" /> Qatar PDPL
 </span>
 </div>
 </div>
 </div>
 </div>
 );
}
