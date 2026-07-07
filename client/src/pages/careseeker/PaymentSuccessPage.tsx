/**
 * Payment Success Page
 * Verifies payment status server-side before showing success UI
 */


import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/components/motion/variants';

import { Suspense } from "react";
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { getPaymentStatus, getBookingDetails } from '@/lib/api';
import { Button } from '@/components/ui/button';
import PaymentSuccessActions from '@/components/payments/PaymentSuccessActions';




type VerificationState = 'loading' | 'success' | 'failed' | 'error';

export default function PaymentSuccessPage() {
 const [searchParams] = useSearchParams();
 const navigate = useNavigate();
 const [state, setState] = useState<VerificationState>('loading');
 const [errorMessage, setErrorMessage] = useState('');

 const paymentId = searchParams.get('payment_id');
 const bookingId = searchParams.get('booking_id');

 // TODO: Refactor cascading setState into useReducer or batched update
 // TODO: Combine multiple setState calls
  useEffect(() => {
  let retryCount = 0;
  const maxRetries = 5;
  const retryInterval = 3000;

  const verifyPayment = async () => {
  try {
  if (!paymentId && !bookingId) {
  setState('error');
  setErrorMessage('Missing payment or booking reference. Please check your bookings page.');
  return;
  }

  let isPaid = false;

  if (paymentId) {
  const payment = await getPaymentStatus(paymentId);
  isPaid = payment.status === 'succeeded' || payment.status === 'paid';
  } else if (bookingId) {
  // Verify via booking details
  const booking = await getBookingDetails(bookingId);
  isPaid = booking.paymentStatus === 'paid' || booking.status === 'confirmed';
  }

  if (isPaid) {
  setState('success');
  } else if (retryCount < maxRetries) {
  retryCount++;
  setTimeout(verifyPayment, retryInterval);
  } else {
  setState('failed');
  setErrorMessage('Payment has not been confirmed. If you completed payment, it may still be processing.');
  }
  } catch (error) {
  console.error('Payment verification failed:', error);
  if (retryCount < maxRetries) {
  retryCount++;
  setTimeout(verifyPayment, retryInterval);
  } else {
  setState('error');
  setErrorMessage('Unable to verify payment status. Please check your bookings page or contact support.');
  }
  }
  };

  verifyPayment();
  }, [paymentId, bookingId]);

 // Loading state
 if (state === 'loading') {
 return (
 <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
 <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
 <Loader2 className="size-12 text-teal-600 animate-spin mx-auto mb-4" />
 <h2 className="text-xl font-semibold text-stone-900 mb-2">Verifying Payment…</h2>
 <p className="text-stone-600">Please wait while we confirm your payment status.</p>
 </div>
 </motion.div>
 );
 }

 // Failed or error state
 if (state === 'failed' || state === 'error') {
 return (
 <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
 <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
 <div className="size-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
 <XCircle className="size-10" />
 </div>

 <h1 className="text-2xl font-semibold text-stone-900 mb-2">
 {state === 'failed' ? 'Payment Not Confirmed' : 'Verification Error'}
 </h1>
 <p className="text-stone-600 mb-8">{errorMessage}</p>

 <div className="space-y-3">
 <Button
 onClick={() => navigate('/careseeker/bookings')}
 className="w-full bg-teal-600 hover:bg-teal-700 text-white"
 >
 View My Bookings
 </Button>
 <Button
 variant="ghost"
 onClick={() => window.location.reload()}
 className="w-full text-stone-500 hover:text-stone-700"
 >
 Retry Verification
 </Button>
 </div>
 </div>
 </div>
 );
 }

 // Success state
 return (
 <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
 <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
 <div className="size-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6 text-teal-600 animate-in zoom-in duration-500">
 <CheckCircle className="size-10" />
 </div>

 <h1 className="text-2xl font-semibold text-stone-900 mb-2">Payment Successful!</h1>
 <p className="text-stone-600 mb-8">
 Your booking has been confirmed. You will receive a confirmation email shortly.
 </p>

 <PaymentSuccessActions />
 </div>
 </div>
 );
}
