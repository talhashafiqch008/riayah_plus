import { useEffect, useState } from 'react';

const STORAGE_KEY = 'riayah_cookie_consent_v1';

type ConsentChoice = 'accepted' | 'essential' | null;

/**
 * GDPR / ePrivacy cookie banner (G5).
 * Essential cookies (auth session) always allowed; analytics/marketing blocked until consent.
 */
export function CookieConsentBanner() {
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ConsentChoice | null;
      if (stored === 'accepted' || stored === 'essential') {
        setChoice(stored);
        setVisible(false);
        if (stored !== 'accepted') {
          // Block non-essential trackers when only essential consented
          (window as unknown as { __RAIYAH_ANALYTICS__?: boolean }).__RAIYAH_ANALYTICS__ = false;
        } else {
          (window as unknown as { __RAIYAH_ANALYTICS__?: boolean }).__RAIYAH_ANALYTICS__ = true;
        }
      } else {
        setVisible(true);
        (window as unknown as { __RAIYAH_ANALYTICS__?: boolean }).__RAIYAH_ANALYTICS__ = false;
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const save = (value: Exclude<ConsentChoice, null>) => {
    localStorage.setItem(STORAGE_KEY, value);
    setChoice(value);
    setVisible(false);
    (window as unknown as { __RAIYAH_ANALYTICS__?: boolean }).__RAIYAH_ANALYTICS__ =
      value === 'accepted';
  };

  if (!visible || choice) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl">
        <h2 className="text-base font-semibold text-stone-900">We value your privacy</h2>
        <p className="mt-2 text-sm text-stone-600">
          We use essential cookies to keep you signed in securely. Analytics and marketing cookies
          are optional and only used if you accept. See our{' '}
          <a href="/privacy" className="text-teal-600 underline">
            Privacy Policy
          </a>
          .
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => save('essential')}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => save('accepted')}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
