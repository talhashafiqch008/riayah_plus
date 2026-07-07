
import React from 'react';

type DashboardTab = 'overview' | 'analytics' | 'history';

interface ModernHeaderProps {
 activeTab: string;
 onTabChange: (tab: DashboardTab) => void;
 title?: string;
 subtitle?: string;
}

export function ModernHeader({ 
 activeTab, 
 onTabChange, 
 title = 'Dashboard',
 subtitle = 'Overview of your practice performance today.'
}: ModernHeaderProps) {
 return (
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight flex items-center gap-3">
 {title}
 </h1>
 <p className="text-stone-500 mt-1 font-medium">{subtitle}</p>
 </div>
 <div className="flex items-center gap-3">
 <div className="hidden md:flex items-center bg-white border border-stone-200 rounded-full p-1 shadow-sm">
 {(['overview', 'analytics', 'history'] as const).map((tab) => (
 <button
 key={tab}
 onClick={() => onTabChange(tab)}
 className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all capitalize ${activeTab === tab ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50' }`}
 >
 {tab}
 </button>
 ))}
 </div>
 </div>
 </div>
 );
}
