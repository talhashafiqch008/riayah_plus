import * as React from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck, Clock, AlertTriangle, CheckCircle } from "lucide-react";

export interface VerificationBadgeProps {
 status: "verified" | "pending" | "incomplete" | "rejected";
 size?: "sm" | "md" | "lg";
 showLabel?: boolean;
}

const config = {
 verified: {
 icon: ShieldCheck,
 label: "Verified",
 bg: "bg-emerald-50",
 border: "border-emerald-200",
 text: "text-emerald-700",
 iconColor: "text-emerald-500",
 },
 pending: {
 icon: Clock,
 label: "Pending",
 bg: "bg-amber-50",
 border: "border-amber-200",
 text: "text-amber-700",
 iconColor: "text-amber-500",
 },
 incomplete: {
 icon: AlertTriangle,
 label: "Incomplete",
 bg: "bg-red-50",
 border: "border-red-200",
 text: "text-red-700",
 iconColor: "text-red-500",
 },
 rejected: {
 icon: AlertTriangle,
 label: "Rejected",
 bg: "bg-red-50",
 border: "border-red-200",
 text: "text-red-700",
 iconColor: "text-red-500",
 },
};

export function VerificationBadge({ status, size = "md", showLabel = true }: VerificationBadgeProps) {
 const c = config[status];
 const Icon = c.icon;

 const sizes = {
 sm: "px-2 py-0.5 text-xs gap-1",
 md: "px-3 py-1 text-sm gap-1.5",
 lg: "px-4 py-1.5 text-base gap-2",
 };

 const iconSizes = {
 sm: "size-3",
 md: "size-4",
 lg: "size-5",
 };

 return (
 <span className={cn(
 "inline-flex items-center font-semibold rounded-full border",
 c.bg,
 c.border,
 c.text,
 sizes[size]
 )}>
 <Icon className={cn(iconSizes[size], c.iconColor)} />
 {showLabel && c.label}
 </span>
 );
}
