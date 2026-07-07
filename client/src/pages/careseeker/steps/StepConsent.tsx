import { m } from "framer-motion";
import { Link } from 'react-router-dom';
import { CheckCircle, Shield, Loader2, ArrowLeft, Sparkles, CheckSquare, Square } from "lucide-react";

interface StepConsentProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  isSubmitting?: boolean;
  isLoggedIn?: boolean;
}

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export default function StepConsent({ data, onUpdate, onSubmit, onBack, isSubmitting, isLoggedIn }: StepConsentProps) {
  const isValid = data.independentProviderAcknowledged && data.termsAccepted;

  const consents = [
    {
      id: 'independentProviderAcknowledged',
      title: 'Independent Providers',
      description: 'I understand providers on Raiyah Plus operate independently. Raiyah Plus connects you with providers but does not employ them.',
      required: true,
      icon: '🤝',
    },
    {
      id: 'termsAccepted',
      title: 'Terms & Privacy',
      description: 'I agree to the Terms of Service and Privacy Policy.',
      required: true,
      icon: '📋',
    },
    {
      id: 'marketingConsentGranted',
      title: 'Updates & Tips',
      description: 'Send me helpful care tips and provider updates. (Optional)',
      required: false,
      icon: '💌',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <m.div {...fadeIn}>
        <div className="flex items-center gap-3 mb-2">
          <div className="size-12 bg-teal-100 rounded-2xl flex items-center justify-center rotate-3">
            <Sparkles className="size-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-stone-900 leading-none">Review & Confirm</h2>
            <p className="text-stone-500 mt-1">Please review and accept the terms to finish.</p>
          </div>
        </div>
      </m.div>

      {/* Consents */}
      <m.div {...fadeIn} transition={{ delay: 0.1 }} className="space-y-4">
        {consents.map((consent, index) => (
          <m.div
            key={consent.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            onClick={() => onUpdate({ [consent.id]: !data[consent.id] })}
            className={`group p-5 rounded-[24px] border-2 cursor-pointer transition-transform duration-300 flex items-start gap-4 ${data[consent.id] ? 'border-stone-900 bg-stone-50 shadow-[0_4px_20px_rgba(0,0,0,0.04)]' : 'ring-1 ring-stone-100/50 bg-stone-800 hover:border-stone-300 hover:shadow-lg'}`}
          >
            <div className={`mt-0.5 transition-colors ${data[consent.id] ? 'text-stone-900' : 'text-stone-300 group-hover:text-stone-400'}`}>
              {data[consent.id] ? (
                <CheckSquare className="size-6" strokeWidth={2.5} />
              ) : (
                <Square className="size-6" strokeWidth={2.5} />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{consent.icon}</span>
                <h3 className={`font-semibold text-base ${data[consent.id] ? 'text-stone-900' : 'text-stone-700'}`}>
                  {consent.title}
                </h3>
                {consent.required && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full uppercase tracking-wide">Required</span>
                )}
              </div>
              <p className="text-sm text-stone-500 leading-relaxed">{consent.description}</p>
            </div>
          </m.div>
        ))}
      </m.div>

      {/* Data Rights */}
      <m.div {...fadeIn} transition={{ delay: 0.2 }}>
        <div className="p-5 bg-stone-50 rounded-[24px] ring-1 ring-stone-200/50">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="size-5 text-teal-600" />
            <h3 className="font-semibold text-stone-900">Your Data Protection</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-stone-600 font-medium">
            {[
              { text: 'Encrypted & secure', icon: '🔐' },
              { text: 'Withdraw anytime', icon: '✓' },
              { text: 'You control access', icon: '👁️' },
              { text: 'PDPL compliant', icon: '🛡️' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 p-2 bg-stone-800 rounded-xl ring-1 ring-stone-100/50">
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </m.div>

      {/* Terms Links */}
      <div className="flex justify-center gap-6 text-xs font-medium text-stone-400">
        <Link to="/terms" target="_blank" className="hover:text-stone-900 hover:underline transition-colors flex items-center gap-1">
          Terms of Service
        </Link>
        <Link to="/privacy" target="_blank" className="hover:text-stone-900 hover:underline transition-colors flex items-center gap-1">
          Privacy Policy
        </Link>
      </div>

      {/* Navigation */}
      <m.div
        {...fadeIn}
        transition={{ delay: 0.3 }}
        className="flex justify-between items-center pt-8 border-t ring-1 ring-stone-100/50"
      >
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="group flex items-center gap-2 text-stone-500 font-bold hover:text-stone-800 transition-colors px-4 py-2 rounded-xl hover:bg-stone-100 disabled:opacity-50"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          Back
        </button>
        <m.button
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          whileHover={isValid && !isSubmitting ? { scale: 1.02 } : {}}
          whileTap={isValid && !isSubmitting ? { scale: 0.98 } : {}}
          className="px-8 py-4 bg-teal-600 text-white font-bold rounded-2xl shadow-xl shadow-stone-900/20 hover:shadow-2xl hover:bg-stone-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-transform duration-300 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <CheckCircle className="size-5" />
              Finish & Submit
            </>
          )}
        </m.button>
      </m.div>
    </div>
  );
}
