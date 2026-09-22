import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from '@/components/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { CountryProvider } from '@/contexts/CountryContext';
import { I18nProvider } from '@/components/I18nProvider';
import { MotionProvider } from '@/components/MotionProvider';
import { SentryProvider } from '@/components/SentryProvider';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { ScrollToTop } from '@/components/ScrollToTop';
import { BackToTopButton } from '@/components/landing/BackToTopButton';
import { LanguagePreferenceGate } from '@/components/LanguagePreferenceGate';
import { PreferredLanguageSync } from '@/components/PreferredLanguageSync';
import { AppRoutes } from '@/routes';
import { AuthGate } from '@/routes/AuthGate';

export default function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <I18nProvider>
          <CountryProvider>
            <AuthProvider>
              <MotionProvider>
                <SentryProvider>
                  <AuthGate>
                    <PreferredLanguageSync />
                    <LanguagePreferenceGate />
                    <ScrollToTop />
                    <AppRoutes />
                    <BackToTopButton />
                    <CookieConsentBanner />
                  </AuthGate>
                </SentryProvider>
              </MotionProvider>
            </AuthProvider>
          </CountryProvider>
        </I18nProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}
