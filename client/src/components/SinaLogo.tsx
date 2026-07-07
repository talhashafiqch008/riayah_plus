import { Flower2 } from 'lucide-react';

export function RaiyahLogo({ className = "" }: { className?: string }) {
 return (
 <div className={`flex flex-col items-center justify-center ${className}`}>
 <div className="flex items-center gap-2">
 <Flower2 className="size-8 text-purple-600" />
 <span className="text-2xl font-bold text-stone-800">Raiyah AI</span>
 </div>
 <span className="text-[10px] text-stone-400">Powered by Raiyah</span>
 </div>
 );
}
