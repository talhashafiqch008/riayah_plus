import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface FormErrorSummaryProps {
 errors?: Record<string, string[]>;
 className?: string;
}

export function FormErrorSummary({ errors, className }: FormErrorSummaryProps) {
 if (!errors) return null;

 const entries = Object.entries(errors).filter(([, msgs]) => msgs.length > 0);
 if (entries.length === 0) return null;

 return (
 <div
 className={cn(
 'rounded-xl border border-red-200 bg-red-50 p-4',
 className
 )}
 >
 <div className="flex items-start gap-3">
 <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
 <div>
 <p className="text-sm font-semibold text-red-700">
 Please fix the following errors:
 </p>
 <ul className="mt-2 list-disc space-y-1 pl-4">
 {entries.map(([field, msgs]) =>
 msgs.map((msg, n) => (
 <li key={`${field}-${n}`} className="text-sm text-red-600">
 <span className="font-medium capitalize">
 {field.replace(/_/g, ' ')}:
 </span>{' '}
 {msg}
 </li>
 ))
 )}
 </ul>
 </div>
 </div>
 </div>
 );
}
