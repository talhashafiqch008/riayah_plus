
import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatPillProps {
 label: string;
 value: string | number;
 trend?: string;
 trendUp?: boolean;
 subtext?: string;
 icon?: LucideIcon;
 bgColor?: string;
 iconColor?: string;
}

export function StatPill({ 
 label, 
 value, 
 trend, 
 trendUp, 
 subtext,
 icon: Icon,
 bgColor,
 iconColor
}: StatPillProps) {
 if (Icon && bgColor) {
 return (
 <div className="flex items-start justify-between">
 <div>
 <span className="text-stone-400 text-xs font-bold uppercase tracking-wider">{label}</span>
 <div className="flex items-baseline gap-2 mt-1">
 <span className="text-3xl font-extrabold text-stone-900 tracking-tight">{value}</span>
 </div>
 {subtext && <p className="text-xs font-medium text-stone-500 mt-1">{subtext}</p>}
 </div>
 <div className={`p-3 rounded-2xl ${bgColor}`}>
 <Icon className={`size-6 ${iconColor}`} />
 </div>
 </div>
 );
 }

 return (
 <div className="flex flex-col gap-1">
 <div className="flex items-center justify-between mb-2">
 <span className="text-stone-500 text-xs font-bold uppercase tracking-wider">{label}</span>
 {Icon && <Icon className="size-4 text-stone-400" />}
 </div>
 <div className="flex items-end gap-3">
 <span className="text-2xl font-black text-stone-900 tracking-tight">{value}</span>
 {trend && (
 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-1 ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
 {trend}
 </span>
 )}
 </div>
 </div>
 );
}
