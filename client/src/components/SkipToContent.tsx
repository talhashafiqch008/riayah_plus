
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function SkipToContent() {
 const [isFocused, setIsFocused] = useState(false);

 return (
 <a
 href="#main-content"
 onFocus={() => setIsFocused(true)}
 onBlur={() => setIsFocused(false)}
 className={cn(
 "fixed top-4 left-4 z-[9999] px-4 py-3 bg-teal-600 text-white text-sm font-medium rounded-[var(--radius-lg)] shadow-lg",
 "transition-transform duration-200",
 "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2",
 isFocused ? "translate-y-0" : "-translate-y-[200%]"
 )}
 >
 Skip to main content
 </a>
 );
}
