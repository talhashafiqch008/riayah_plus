
import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, TestTube2 } from 'lucide-react';
import { confirmTopup } from '@/lib/api/wallet';
import toast from 'react-hot-toast';

interface StripePaymentFormProps {
  amount: string;
  paymentIntentId: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function MockStripePaymentForm({ amount, paymentIntentId, onSuccess, onError }: StripePaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await confirmTopup(paymentIntentId);
      toast.success('Payment successful (Mock Mode)');
      onSuccess();
    } catch (err: any) {
      onError(err.message || 'Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="size-5 text-teal-600" />
          <span className="font-semibold text-stone-700">Payment Details</span>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <TestTube2 className="size-6 text-amber-600 mx-auto mb-2" />
          <p className="text-sm text-amber-700 font-medium">Mock Mode Active</p>
          <p className="text-xs text-amber-600 mt-1">
            Stripe is not configured. Click the button below to simulate a successful payment.
          </p>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-6 font-semibold"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            Complete Mock Payment
          </>
        )}
      </Button>

      <p className="text-xs text-stone-400 text-center">
        This is a test environment. No real payment will be processed.
      </p>
    </form>
  );
}

export function StripePaymentForm({ amount, paymentIntentId, onSuccess, onError }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe has not loaded yet. Please try again.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/careseeker/wallet`,
        },
      });

      if (error) {
        onError(error.message || 'Payment failed. Please try again.');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      onError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="size-5 text-teal-600" />
          <span className="font-semibold text-stone-700">Payment Details</span>
        </div>
        
        <PaymentElement
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            },
          }}
        />
      </div>

      <Button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-6 font-semibold"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            Pay {amount}
          </>
        )}
      </Button>

      <p className="text-xs text-stone-400 text-center">
        Your payment is secured by Stripe. We never store your card details.
      </p>
    </form>
  );
}
