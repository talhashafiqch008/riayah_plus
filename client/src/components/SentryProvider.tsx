import { useEffect } from 'react';
import { initializeSentryIfConsented } from '@/lib/sentry';

export function SentryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeSentryIfConsented();
  }, []);

  return <>{children}</>;
}
