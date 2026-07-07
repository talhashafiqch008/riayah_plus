import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
 icon: LucideIcon;
 title: string;
 description: string;
 action?: {
 label: string;
 onClick: () => void;
 };
 className?: string;
}

export default function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
 return (
 <div className={`text-center py-12 ${className}`}>
 <div className="inline-flex items-center justify-center p-4 bg-stone-50 rounded-full mb-4">
 <Icon className="size-8 text-stone-400" />
 </div>
 <h3 className="text-lg font-medium text-stone-900 mb-1">{title}</h3>
 <p className="text-stone-500 max-w-sm mx-auto mb-6">{description}</p>
 {action && (
 <button
 onClick={action.onClick}
 className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
 >
 {action.label}
 </button>
 )}
 </div>
 );
}
