
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Star,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getPaymentMethods, addPaymentMethod, removePaymentMethod, setDefaultPaymentMethod, createSetupIntent } from '@/lib/api/payment-methods';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';

interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  is_default: boolean;
  created_at: number;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

function MockAddCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await addPaymentMethod('pm_mock_' + Date.now());
      toast.success('Card added successfully (Mock Mode)');
      onSuccess();
    } catch (err) {
      toast.error('Failed to add card');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
        <AlertCircle className="h-6 w-6 text-amber-600 mx-auto mb-2" />
        <p className="text-sm text-amber-700 font-medium">Mock Mode Active</p>
        <p className="text-xs text-amber-600 mt-1">
          No real card will be added. Click the button to simulate.
        </p>
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1 bg-teal-600 hover:bg-teal-700">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Mock Card'}
        </Button>
      </div>
    </form>
  );
}

function AddCardForm({ clientSecret, onSuccess, onCancel }: { clientSecret: string; onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast.error(submitError.message || 'Invalid card details');
        return;
      }

      const { setupIntent, error } = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Failed to setup card');
        return;
      }

      if (setupIntent?.status === 'succeeded') {
        await addPaymentMethod(setupIntent.payment_method as string);
        toast.success('Card added successfully');
        onSuccess();
      }
    } catch (err) {
      toast.error('Failed to add card');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement 
        options={{
          layout: {
            type: 'tabs',
            defaultCollapsed: false,
          },
        }}
      />
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !stripe} className="flex-1 bg-teal-600 hover:bg-teal-700">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Card'}
        </Button>
      </div>
    </form>
  );
}

function CardBrandIcon({ brand, className }: { brand: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    visa: (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <rect width="48" height="48" rx="4" fill="#1A1F71"/>
        <path d="M18.5 32L15 16H19L21.5 32H18.5ZM29.5 32L32.5 16H29L26.5 32H29.5ZM24 32L27 16H23L20 32H24ZM35 16L32 24L35 32H31L28 24L31 16H35Z" fill="white"/>
      </svg>
    ),
    mastercard: (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <rect width="48" height="48" rx="4" fill="#F5F5F5"/>
        <circle cx="19" cy="24" r="10" fill="#EB001B"/>
        <circle cx="29" cy="24" r="10" fill="#F79E1B"/>
        <path d="M24 16.5C26.5 18.5 28 21 28 24C28 27 26.5 29.5 24 31.5C21.5 29.5 20 27 20 24C20 21 21.5 18.5 24 16.5Z" fill="#FF5F00"/>
      </svg>
    ),
    amex: (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <rect width="48" height="48" rx="4" fill="#016FD0"/>
        <path d="M8 16H16L20 20L24 16H40V32H24L20 28L16 32H8V16ZM14 18H12V22H16V24H12V26H14V28H10V18H14ZM26 18H22V28H26V24H30V28H34V24H30V22H34V18H30V22H26V18Z" fill="white"/>
      </svg>
    ),
    discover: (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <rect width="48" height="48" rx="4" fill="#FF6000"/>
        <circle cx="34" cy="24" r="8" fill="white"/>
        <text x="8" y="28" fill="white" fontSize="12" fontWeight="bold">DISCOVER</text>
      </svg>
    ),
    jcb: (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <rect width="48" height="48" rx="4" fill="#F5F5F5"/>
        <text x="8" y="28" fill="#0066B3" fontSize="14" fontWeight="bold">JCB</text>
      </svg>
    ),
    diners: (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <rect width="48" height="48" rx="4" fill="#004E94"/>
        <circle cx="24" cy="24" r="12" stroke="white" strokeWidth="2" fill="none"/>
        <path d="M24 12V36" stroke="white" strokeWidth="2"/>
      </svg>
    ),
    unionpay: (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <rect width="48" height="48" rx="4" fill="#E21836"/>
        <text x="8" y="28" fill="white" fontSize="10" fontWeight="bold">UNIONPAY</text>
      </svg>
    ),
  };

  return <>{icons[brand.toLowerCase()] || <CreditCard className={className} />}</>;
}

function PaymentMethodCard({ 
  method, 
  onRemove, 
  onSetDefault,
  isRemoving 
}: { 
  method: PaymentMethod; 
  onRemove: (id: string) => void;
  onSetDefault: (id: string) => void;
  isRemoving: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`relative p-5 rounded-2xl border-2 transition-all ${
        method.is_default 
          ? 'border-teal-500 bg-teal-50/50' 
          : 'border-stone-200 bg-white hover:border-stone-300'
      }`}
    >
      {method.is_default && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-600 text-white text-xs font-bold rounded-full">
            <Check className="h-3 w-3" />
            Default
          </span>
        </div>
      )}
      
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-xl ${method.is_default ? 'bg-teal-100' : 'bg-stone-100'}`}>
          <CardBrandIcon brand={method.card.brand} className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-stone-500">•••• {method.card.last4}</span>
          </div>
          <p className="text-sm text-stone-500">
            Expires {method.card.exp_month}/{method.card.exp_year}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {!method.is_default && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSetDefault(method.id)}
            className="text-xs"
          >
            <Star className="h-3 w-3 mr-1" />
            Set Default
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRemove(method.id)}
          disabled={isRemoving}
          className="text-xs text-red-600 hover:bg-red-50 hover:border-red-200"
        >
          {isRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
          Remove
        </Button>
      </div>
    </motion.div>
  );
}

export default function PaymentMethodsPage() {
  const navigate = useNavigate();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoadingSetup, setIsLoadingSetup] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const response = await getPaymentMethods();
      if (response.success) {
        setPaymentMethods(response.data?.payment_methods || []);
      }
    } catch (error) {
      toast.error('Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const handleShowAddForm = async () => {
    try {
      setIsLoadingSetup(true);
      const response = await createSetupIntent();
      if (response.success && response.data?.client_secret) {
        setClientSecret(response.data.client_secret);
        setShowAddForm(true);
      } else {
        toast.error('Failed to initialize card setup');
      }
    } catch (error) {
      toast.error('Failed to initialize card setup');
    } finally {
      setIsLoadingSetup(false);
    }
  };

  const handleRemove = (id: string) => {
    const method = paymentMethods.find(m => m.id === id);
    if (method) {
      setMethodToDelete(method);
      setDeleteDialogOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!methodToDelete) return;
    setDeleteDialogOpen(false);
    setRemovingId(methodToDelete.id);
    try {
      await removePaymentMethod(methodToDelete.id);
      toast.success('Payment method removed');
      setPaymentMethods(prev => prev.filter(m => m.id !== methodToDelete.id));
    } catch (error) {
      toast.error('Failed to remove payment method');
    } finally {
      setRemovingId(null);
      setMethodToDelete(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultPaymentMethod(id);
      toast.success('Default payment method updated');
      setPaymentMethods(prev => prev.map(m => ({
        ...m,
        is_default: m.id === id
      })));
    } catch (error) {
      toast.error('Failed to update default payment method');
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F0E9]">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/careseeker/wallet')}
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Payment Methods</h1>
            <p className="text-sm text-stone-500">Manage your cards and payment options</p>
          </div>
        </div>

        {!showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <Button
              onClick={handleShowAddForm}
              disabled={isLoadingSetup}
              className="w-full h-14 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg shadow-teal-600/20"
            >
              {isLoadingSetup ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5 mr-2" />}
              {isLoadingSetup ? 'Loading...' : 'Add New Card'}
            </Button>
          </motion.div>
        )}

        {showAddForm && clientSecret && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-2 border-stone-200 rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-stone-900 mb-4">Add Card</h3>
                {clientSecret.startsWith('seti_') && clientSecret.split('_')[1].length <= 16 ? (
                  <MockAddCardForm
                    onSuccess={() => {
                      setShowAddForm(false);
                      setClientSecret('');
                      loadPaymentMethods();
                    }}
                    onCancel={() => {
                      setShowAddForm(false);
                      setClientSecret('');
                    }}
                  />
                ) : (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <AddCardForm
                      clientSecret={clientSecret}
                      onSuccess={() => {
                        setShowAddForm(false);
                        setClientSecret('');
                        loadPaymentMethods();
                      }}
                      onCancel={() => {
                        setShowAddForm(false);
                        setClientSecret('');
                      }}
                    />
                  </Elements>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </>
          ) : paymentMethods.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-stone-100 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-stone-400" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">No payment methods</h3>
              <p className="text-stone-500 mb-6">
                Add a card to make top-ups and payments faster
              </p>
              <Button
                onClick={handleShowAddForm}
                disabled={isLoadingSetup}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isLoadingSetup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                {isLoadingSetup ? 'Loading...' : 'Add Card'}
              </Button>
            </motion.div>
          ) : (
            paymentMethods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                onRemove={handleRemove}
                onSetDefault={handleSetDefault}
                isRemoving={removingId === method.id}
              />
            ))
          )}
        </div>

        <div className="mt-8 flex items-center gap-2 text-sm text-stone-500">
          <AlertCircle className="h-4 w-4" />
          <span>Your card details are securely stored by Stripe</span>
        </div>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Remove Payment Method</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this card?
                {methodToDelete && (
                  <span className="block mt-2 font-medium">
                    {methodToDelete.card.brand.toUpperCase()} ending in {methodToDelete.card.last4}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={!!removingId}
              >
                {removingId ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remove
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
