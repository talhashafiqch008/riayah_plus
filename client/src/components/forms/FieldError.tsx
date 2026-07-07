import { cn } from '@/lib/utils';

interface FieldErrorProps {
 error?: string | string[];
 className?: string;
}

export function FieldError({ error, className }: FieldErrorProps) {
 if (!error) return null;

 const errors = Array.isArray(error) ? error : [error];
 if (errors.length === 0) return null;

 return (
 <div className={cn('mt-1', className)}>
 {errors.map((msg, n) => (
 <p key={`item-${n}`} className="text-sm text-red-500">
 {msg}
 </p>
 ))}
 </div>
 );
}
