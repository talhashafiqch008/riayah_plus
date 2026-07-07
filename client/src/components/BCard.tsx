
import React from 'react';

interface BCardProps {
 children: React.ReactNode;
 className?: string;
 noPad?: boolean;
 title?: string;
 action?: React.ReactNode;
}

export function BCard({ children, className = '', noPad = false, title, action }: BCardProps) {
 return (
 <div className={`bg-white border border-stone-200/60 rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col ${className}`}>
 {(title || action) && (
 <div className="px-6 pt-6 pb-2 flex items-center justify-between">
 {title && <h3 className="font-semibold text-stone-900">{title}</h3>}
 {action && <div>{action}</div>}
 </div>
 )}
 <div className={`flex-1 ${!noPad ? 'p-6' : ''}`}>
 {children}
 </div>
 </div>
 );
}
