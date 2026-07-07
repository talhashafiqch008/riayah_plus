
import { useEffect } from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ErrorPageProps {
 error: Error & { digest?: string };
 reset: () => void;
 title?: string;
 description?: string;
}

export default function ErrorPage({
 error,
 reset,
 title = 'Something went wrong',
 description = 'We encountered an unexpected error. Please try again or return home.',
}: ErrorPageProps) {
 useEffect(() => {
 console.error('Route error:', error);
 }, [error]);

 return (
 <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
 <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-stone-100 p-8 text-center">
 <div className="size-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
 <AlertTriangle className="size-8 text-red-500" />
 </div>
 <h2 className="text-xl font-semibold text-stone-900 mb-2">{title}</h2>
 <p className="text-stone-500 mb-2">{description}</p>
 {error.digest && (
 <p className="text-xs text-stone-400 mb-6 font-mono">
 Error ID: {error.digest}
 </p>
 )}
 <div className="flex gap-3 justify-center">
 <button
 onClick={reset}
 className="flex items-center gap-2 px-4 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors"
 >
 <RotateCcw className="size-4" />
 Try Again
 </button>
 <Link
 to="/"
 className="flex items-center gap-2 px-4 py-3 bg-stone-100 text-stone-700 font-semibold rounded-xl hover:bg-stone-200 transition-colors"
 >
 <Home className="size-4" />
 Go Home
 </Link>
 </div>
 </div>
 </div>
 );
}
