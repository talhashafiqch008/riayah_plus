
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/components/motion/variants';
import {
 Loader2,
 CheckCircle,
 XCircle,
 Clock,
 ArrowLeft,
 RefreshCw,
 CreditCard,
 Wallet,
 FileText,
 Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface AsyncOperation {
 id: string;
 type: 'payment' | 'refund' | 'topup' | 'payout' | 'document';
 status: 'pending' | 'processing' | 'completed' | 'failed';
 title: string;
 description: string;
 createdAt: string;
 updatedAt?: string;
 result?: {
  message: string;
  redirectUrl?: string;
 };
}

type OperationState = 'loading' | 'processing' | 'completed' | 'failed';

export default function AsyncOperationStatusPage() {
 const [searchParams] = useSearchParams();
 const operationId = searchParams.get('id');
 const operationType = searchParams.get('type') as AsyncOperation['type'] || 'payment';

 const [state, setState] = useState<OperationState>('loading');
 const [operation, setOperation] = useState<AsyncOperation | null>(null);
 const [errorMessage, setErrorMessage] = useState('');

 useEffect(() => {
  let retryCount = 0;
  const maxRetries = 10;
  const retryInterval = 3000;

  const checkStatus = async () => {
   try {
    const mockOperation: AsyncOperation = {
     id: operationId || 'mock-1',
     type: operationType,
     status: retryCount < 3 ? 'processing' : 'completed',
     title: getOperationTitle(operationType),
     description: getOperationDescription(operationType),
     createdAt: new Date().toISOString(),
     updatedAt: new Date().toISOString(),
     result: retryCount >= 3 ? {
      message: 'Operation completed successfully',
      redirectUrl: getRedirectUrl(operationType)
     } : undefined
    };

    setOperation(mockOperation);

    if (mockOperation.status === 'completed') {
     setState('completed');
    } else if (mockOperation.status === 'failed') {
     setState('failed');
     setErrorMessage('Operation failed. Please try again or contact support.');
    } else {
     setState('processing');
     if (retryCount < maxRetries) {
      retryCount++;
      setTimeout(checkStatus, retryInterval);
     } else {
      setState('failed');
      setErrorMessage('Operation is taking longer than expected. Please check back later.');
     }
    }
   } catch (error) {
    console.error('Status check failed:', error);
    if (retryCount < maxRetries) {
     retryCount++;
     setTimeout(checkStatus, retryInterval);
    } else {
     setState('failed');
     setErrorMessage('Unable to check operation status. Please try again later.');
    }
   }
  };

  if (operationId) {
   checkStatus();
  } else {
   setState('failed');
   setErrorMessage('No operation ID provided.');
  }
 }, [operationId, operationType]);

 const getOperationTitle = (type: AsyncOperation['type']): string => {
  switch (type) {
   case 'payment': return 'Payment Processing';
   case 'refund': return 'Refund Processing';
   case 'topup': return 'Wallet Top-up';
   case 'payout': return 'Payout Processing';
   case 'document': return 'Document Processing';
   default: return 'Operation Processing';
  }
 };

 const getOperationDescription = (type: AsyncOperation['type']): string => {
  switch (type) {
   case 'payment': return 'Your payment is being processed securely.';
   case 'refund': return 'Your refund is being processed.';
   case 'topup': return 'Your wallet top-up is being processed.';
   case 'payout': return 'Your payout is being processed.';
   case 'document': return 'Your document is being processed.';
   default: return 'Your operation is being processed.';
  }
 };

 const getRedirectUrl = (type: AsyncOperation['type']): string => {
  switch (type) {
   case 'payment': return '/careseeker/bookings';
   case 'refund': return '/careseeker/payment-history';
   case 'topup': return '/careseeker/wallet';
   case 'payout': return '/provider/payouts';
   case 'document': return '/careseeker/documents';
   default: return '/careseeker/dashboard';
  }
 };

 const getOperationIcon = (type: AsyncOperation['type']) => {
  switch (type) {
   case 'payment': return <CreditCard className="size-6" />;
   case 'refund': return <RefreshCw className="size-6" />;
   case 'topup': return <Wallet className="size-6" />;
   case 'payout': return <CreditCard className="size-6" />;
   case 'document': return <FileText className="size-6" />;
   default: return <Bell className="size-6" />;
  }
 };

 if (state === 'loading') {
  return (
   <motion.div
    initial="initial"
    animate="animate"
    variants={containerVariants}
    className="min-h-screen flex items-center justify-center bg-stone-50"
   >
    <motion.div variants={itemVariants} className="text-center">
     <Loader2 className="size-12 animate-spin text-teal-600 mx-auto mb-4" />
     <h2 className="text-xl font-semibold text-stone-900">Loading...</h2>
     <p className="text-stone-600 mt-2">Checking operation status</p>
    </motion.div>
   </motion.div>
  );
 }

 if (state === 'processing') {
  return (
   <motion.div
    initial="initial"
    animate="animate"
    variants={containerVariants}
    className="min-h-screen flex items-center justify-center bg-stone-50 p-4"
   >
    <motion.div variants={itemVariants} className="max-w-md w-full text-center">
     <div className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-stone-200/50">
      <div className="size-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
       <Loader2 className="size-8 animate-spin text-teal-600" />
      </div>
      <h2 className="text-xl font-semibold text-stone-900 mb-2">
       {operation?.title || 'Processing...'}
      </h2>
      <p className="text-stone-600 mb-6">
       {operation?.description || 'Please wait while we process your request.'}
      </p>
      <div className="bg-stone-50 rounded-xl p-4 mb-6">
       <div className="flex items-center gap-3 text-sm text-stone-600">
        <Clock className="size-4 text-stone-400" />
        <span>Started: {operation?.createdAt ? new Date(operation.createdAt).toLocaleString() : 'Just now'}</span>
       </div>
      </div>
      <p className="text-xs text-stone-500">
       This may take a few moments. You can close this page and check back later.
      </p>
     </div>
    </motion.div>
   </motion.div>
  );
 }

 if (state === 'completed') {
  return (
   <motion.div
    initial="initial"
    animate="animate"
    variants={containerVariants}
    className="min-h-screen flex items-center justify-center bg-stone-50 p-4"
   >
    <motion.div variants={itemVariants} className="max-w-md w-full text-center">
     <div className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-stone-200/50">
      <div className="size-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
       <CheckCircle className="size-8 text-green-600" />
      </div>
      <h2 className="text-xl font-semibold text-stone-900 mb-2">
       {operation?.title || 'Operation Complete'}
      </h2>
      <p className="text-stone-600 mb-6">
       {operation?.result?.message || 'Your operation has been completed successfully.'}
      </p>
      <div className="flex gap-3 justify-center">
       {operation?.result?.redirectUrl && (
        <Link to={operation.result.redirectUrl}>
         <Button>
          Continue
          <ArrowLeft className="size-4 ml-2 rotate-180" />
         </Button>
        </Link>
       )}
       <Link to="/careseeker/dashboard">
        <Button variant="outline">
         Go to Dashboard
        </Button>
       </Link>
      </div>
     </div>
    </motion.div>
   </motion.div>
  );
 }

 return (
  <motion.div
   initial="initial"
   animate="animate"
   variants={containerVariants}
   className="min-h-screen flex items-center justify-center bg-stone-50 p-4"
  >
   <motion.div variants={itemVariants} className="max-w-md w-full text-center">
    <div className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-stone-200/50">
     <div className="size-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
      <XCircle className="size-8 text-red-600" />
     </div>
     <h2 className="text-xl font-semibold text-stone-900 mb-2">
      Operation Failed
     </h2>
     <p className="text-stone-600 mb-6">
      {errorMessage || 'An error occurred while processing your request.'}
     </p>
     <div className="flex gap-3 justify-center">
      <Button onClick={() => window.location.reload()}>
       <RefreshCw className="size-4 mr-2" />
       Try Again
      </Button>
      <Link to="/careseeker/dashboard">
       <Button variant="outline">
        Go to Dashboard
       </Button>
      </Link>
     </div>
    </div>
   </motion.div>
  </motion.div>
 );
}