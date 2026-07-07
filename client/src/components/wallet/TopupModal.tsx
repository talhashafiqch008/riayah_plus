
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createTopup, confirmTopup } from '@/lib/api/wallet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { formatCurrencyInput } from '@/lib/validation';
import { StripePaymentForm, MockStripePaymentForm } from './StripePaymentForm';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Loader2, 
  Zap, 
  Shield, 
  CheckCircle, 
  ArrowRight,
  Wallet,
  Sparkles,
  Coins,
  ArrowLeft
} from 'lucide-react';

interface TopupModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  currency?: string;
  currencySymbol?: string;
}

interface CreditPackage {
  amount: number;
  label: string;
  popular?: boolean;
  bonus?: string;
}

const creditPackages: CreditPackage[] = [
  { amount: 10, label: 'Starter' },
  { amount: 25, label: 'Standard', popular: true },
  { amount: 50, label: 'Plus', bonus: '+5% bonus' },
  { amount: 100, label: 'Premium', bonus: '+10% bonus' },
];

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
} as const;

const modalVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    y: 40, 
    scale: 0.95,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30
    }
  }
};

const packageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.3 + i * 0.1,
      type: 'spring' as const,
      stiffness: 100,
      damping: 15
    }
  })
};

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export default function TopupModal({ onClose, onSuccess, currency = 'USD', currencySymbol = '$' }: TopupModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [paymentStep, setPaymentStep] = useState<'amount' | 'payment'>('amount');

  const stripeOptions = useMemo(() => ({
    clientSecret: clientSecret || '',
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0d9488',
        colorBackground: '#ffffff',
        colorText: '#1c1917',
        colorDanger: '#ef4444',
        borderRadius: '12px',
      },
    },
  }), [clientSecret]);

  const handlePackageSelect = (pkg: CreditPackage) => {
    setAmount(String(pkg.amount));
    setSelectedPackage(pkg.amount);
    setError('');
  };

  const handleCustomAmount = (value: string) => {
    const formatted = formatCurrencyInput(value);
    setAmount(formatted);
    setSelectedPackage(null);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = parseFloat(amount) * 100;
    if (amountCents < 100) {
                setError('Minimum top-up is ' + currencySymbol + '1.00');
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const amountCents = parseFloat(amount) * 100;
      const result = await createTopup(amountCents);
      setShowConfirmation(false);
      
      if (result.client_secret) {
        const piId = result.payment_intent_id || '';
        setClientSecret(result.client_secret);
        setPaymentIntentId(piId);
        
        const isMockMode = piId.startsWith('pi_') && piId.length <= 19;
        if (isMockMode) {
          await confirmTopup(piId);
          setSuccess(true);
          setPaymentStep('amount');
          onSuccess?.();
        } else {
          setPaymentStep('payment');
        }
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create top-up');
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setSuccess(true);
    setPaymentStep('amount');
    onSuccess?.();
  };

  const handlePaymentError = (message: string) => {
    setError(message);
  };

  const handleBackToAmount = () => {
    setPaymentStep('amount');
    setClientSecret(null);
    setPaymentIntentId('');
    setError('');
  };

  return (
    <AnimatePresence>
      {success ? (
        <motion.div
          key="success"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={backdropVariants}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="bg-white rounded-[2rem] shadow-[0_24px_80px_rgba(0,0,0,0.12)] max-w-md w-full overflow-hidden"
          >
            <div className="bg-teal-50 p-8 text-center border-b border-teal-100">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                className="size-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="size-8 text-teal-600" aria-hidden="true" />
              </motion.div>
              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-stone-900 mb-2"
              >
                Payment Successful!
              </motion.h3>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-stone-600"
              >
                Your top-up of <span className="font-bold text-stone-900">{currencySymbol}{amount}</span> has been processed successfully.
              </motion.p>
            </div>
            <div className="p-6 text-center">
              <p className="text-stone-600 mb-6">
                Credits have been added to your wallet. You can now use them to book services.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-stone-500 mb-6">
                <Shield className="size-4" aria-hidden="true" />
                <span>Secure SSL Encrypted</span>
              </div>
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  onClick={onClose}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-full py-6 font-semibold"
                >
                  Got it
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      ) : paymentStep === 'payment' && clientSecret ? (
        <motion.div
          key="payment"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={backdropVariants}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="bg-white rounded-[2rem] shadow-[0_24px_80px_rgba(0,0,0,0.12)] max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-gradient-to-br from-teal-50/50 via-white to-emerald-50/30 p-8 border-b border-stone-100 relative overflow-hidden">
              <div className="relative z-10 flex items-center gap-4 mb-4">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="p-3 bg-teal-100 rounded-2xl"
                >
                  <Wallet className="size-6 text-teal-600" aria-hidden="true" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">Complete Payment</h2>
                  <p className="text-stone-500 text-sm">Enter your payment details to add {currencySymbol}{amount} to your wallet</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-stone-500">
                <Shield className="size-3" aria-hidden="true" />
                <span>SSL Secured</span>
                <span className="mx-1" aria-hidden="true">•</span>
                <Zap className="size-3" aria-hidden="true" />
                <span>Instant</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
                >
                  <div className="p-1 bg-red-100 rounded-full mt-0.5">
                    <Zap className="size-4 text-red-600" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </motion.div>
              )}

              {paymentIntentId.startsWith('pi_') && paymentIntentId.length <= 19 ? (
                <MockStripePaymentForm
                  amount={amount}
                  paymentIntentId={paymentIntentId}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              ) : (
                <Elements stripe={stripePromise} options={stripeOptions}>
                  <StripePaymentForm
                    amount={amount}
                    paymentIntentId={paymentIntentId}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </Elements>
              )}

              <Button 
                type="button" 
                variant="outline" 
                onClick={handleBackToAmount}
                className="w-full rounded-2xl py-5 border-2 border-stone-200 hover:bg-stone-50 text-stone-600 font-semibold flex items-center justify-center gap-2"
              >
                <ArrowLeft className="size-4" />
                Back to Amount
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={backdropVariants}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="bg-white rounded-[2rem] shadow-[0_24px_80px_rgba(0,0,0,0.12)] max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-gradient-to-br from-teal-50/50 via-white to-emerald-50/30 p-8 border-b border-stone-100 relative overflow-hidden">
              <div className="relative z-10 flex items-center gap-4 mb-4">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="p-3 bg-teal-100 rounded-2xl"
                >
                  <Wallet className="size-6 text-teal-600" aria-hidden="true" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">Top Up Credits</h2>
                  <p className="text-stone-500 text-sm">Add funds to your wallet securely</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-stone-500">
                <Shield className="size-3" aria-hidden="true" />
                <span>SSL Secured</span>
                <span className="mx-1" aria-hidden="true">•</span>
                <Zap className="size-3" aria-hidden="true" />
                <span>Instant</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <Label className="text-sm font-semibold text-stone-700 mb-3 block">
                  Select Credit Package
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {creditPackages.map((pkg, i) => (
                    <motion.button
                      key={pkg.amount}
                      custom={i}
                      initial="hidden"
                      animate="visible"
                      variants={packageVariants}
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => handlePackageSelect(pkg)}
                      className={`relative p-4 rounded-2xl border-2 transition-colors text-left focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${ 
                        selectedPackage === pkg.amount 
                          ? 'border-teal-500 bg-teal-50 shadow-[0_4px_20px_rgba(13,148,136,0.1)]' 
                          : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      {pkg.popular && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                          className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full flex items-center gap-1"
                        >
                          <Sparkles className="size-3" aria-hidden="true" />
                          Popular
                        </motion.div>
                      )}
                      {pkg.bonus && (
                        <div className="absolute -top-2 right-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                          {pkg.bonus}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <Coins className={`size-4 ${selectedPackage === pkg.amount ? 'text-teal-600' : 'text-stone-400'}`} aria-hidden="true" />
                        <span className={`text-xs font-semibold ${selectedPackage === pkg.amount ? 'text-teal-700' : 'text-stone-500'}`}>
                          {pkg.label}
                        </span>
                      </div>
                      <p className={`text-2xl font-bold ${selectedPackage === pkg.amount ? 'text-teal-900' : 'text-stone-900'}`}>
                        {currencySymbol}{pkg.amount}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {pkg.amount * 10} credits
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="amount" className="text-sm font-semibold text-stone-700 mb-3 block">
                  Or Enter Custom Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-semibold text-lg z-10 pointer-events-none">{currencySymbol}</span>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleCustomAmount(e.target.value)}
                    className="pl-16 pr-4 py-6 text-lg font-bold text-stone-900 border-2 border-stone-200 rounded-2xl focus:border-teal-500 focus:ring-teal-500/20 placeholder:text-stone-300"
                  />
                </div>
                <p className="text-xs text-stone-500 mt-2">
                  Minimum top-up: {currencySymbol}1.00 • 1 {currency} = 10 credits
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
                >
                  <div className="p-1 bg-red-100 rounded-full mt-0.5">
                    <Zap className="size-4 text-red-600" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </motion.div>
              )}

              <div className="space-y-3">
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button 
                    type="submit" 
                    disabled={loading || !amount} 
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-2xl py-6 text-lg font-semibold shadow-[0_4px_20px_rgba(13,148,136,0.3)] hover:shadow-[0_8px_30px_rgba(13,148,136,0.4)] transition-shadow duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-5 animate-spin mr-2" aria-hidden="true" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="size-5 mr-2" aria-hidden="true" />
                        Continue to Payment
                      </>
                    )}
                  </Button>
                </motion.div>

                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  className="w-full rounded-2xl py-5 border-2 border-stone-200 hover:bg-stone-50 text-stone-600 font-semibold"
                >
                  Cancel
                </Button>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs text-stone-400 pt-2">
                <div className="flex items-center gap-1">
                  <Shield className="size-3" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="size-3" />
                  <span>Instant</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="size-3" />
                  <span>Verified</span>
                </div>
              </div>
            </form>
          </motion.div>

          <ConfirmationDialog
            open={showConfirmation}
            onOpenChange={setShowConfirmation}
            title="Confirm Top-Up"
            description="You are about to add funds to your wallet. This will create a payment intent."
            amount={amount}
            currency="${currency}"
            confirmLabel="Confirm Payment"
            cancelLabel="Cancel"
            onConfirm={handleConfirm}
            onCancel={() => setShowConfirmation(false)}
            loading={loading}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
