
import { AlertCircle } from 'lucide-react';

interface FeatureDisabledProps {
 featureName: string;
}

export function FeatureDisabled({ featureName }: FeatureDisabledProps) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
 <div className="size-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
 <AlertCircle className="size-8 text-stone-400" />
 </div>
 <h2 className="text-xl font-semibold text-stone-800 mb-2">
 Feature Temporarily Unavailable
 </h2>
 <p className="text-stone-500 max-w-md">
 The {featureName} feature is currently disabled. Please try again later or contact support if you need assistance.
 </p>
 </div>
 );
}
