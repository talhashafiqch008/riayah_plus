
import { useEffect } from 'react';
import { initializeSentry } from '@/lib/sentry';

export function SentryProvider({ children }: { children: React.ReactNode }) {
 useEffect(() => {
 if (process.env.NODE_ENV === 'production') {
 initializeSentry();
 }
 }, []);

 return <>{children}</>;
}
