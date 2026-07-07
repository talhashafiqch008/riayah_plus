
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWalletBalance, getWalletTransactions } from '@/lib/api/wallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
 Wallet, 
 ArrowUpRight, 
 ArrowDownRight, 
 Clock, 
 DollarSign, 
 CreditCard,
 TrendingUp,
 Receipt,
 Zap,
 History,
 Plus
} from 'lucide-react';
import TopupModal from '@/components/wallet/TopupModal';
import { SecurityBanner } from '@/components/healthcare/SecurityBanner';
import { CurrencyDisplay, CreditsDisplay } from '@/components/CurrencyDisplay';
import { useGeolocationCurrency, getCurrencySymbol } from '@/hooks/useGeolocationCurrency';

const containerVariants = {
 hidden: { opacity: 0 },
 visible: {
  opacity: 1,
  transition: {
   staggerChildren: 0.1,
   delayChildren: 0.1
  }
 }
} as const;

const itemVariants = {
 hidden: { opacity: 0, y: 20 },
 visible: {
  opacity: 1,
  y: 0,
  transition: {
   type: 'spring' as const,
   stiffness: 100,
   damping: 15
  }
 }
};

const balanceVariants = {
 hidden: { opacity: 0, scale: 0.8 },
 visible: {
  opacity: 1,
  scale: 1,
  transition: {
   type: 'spring' as const,
   stiffness: 100,
   damping: 15,
   delay: 0.2
  }
 }
};

const transactionVariants = {
 hidden: { opacity: 0, x: -20 },
 visible: (i: number) => ({
  opacity: 1,
  x: 0,
  transition: {
   delay: i * 0.05,
   type: 'spring' as const,
   stiffness: 100,
   damping: 15
  }
 })
};

export default function WalletPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showTopup, setShowTopup] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);

  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useQuery({
   queryKey: ['wallet-balance'],
   queryFn: getWalletBalance,
  });

  const { data: transactionsData, isLoading: txLoading, refetch: refetchTransactions } = useQuery({
   queryKey: ['wallet-transactions', transactionsPage],
   queryFn: () => getWalletTransactions(transactionsPage),
  });

  const { currency: detectedCurrency, loading: currencyLoading } = useGeolocationCurrency();
  const displayCurrency = 'USD';
  const currencySymbol = getCurrencySymbol(displayCurrency);

  const transactions = transactionsData?.transactions || [];
  const pagination = transactionsData?.pagination;

 if (balanceLoading) {
  return (
   <div className="container mx-auto px-4 py-8 max-w-5xl">
    <div className="animate-pulse">
     <div className="h-56 bg-stone-100 rounded-[2rem] mb-8" />
     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map(i => (
       <div key={i} className="h-32 bg-stone-100 rounded-2xl" />
      ))}
     </div>
     <div className="h-96 bg-stone-100 rounded-3xl" />
    </div>
   </div>
  );
 }

 return (
  <motion.div 
   className="container mx-auto px-4 py-8 max-w-5xl"
   initial="hidden"
   animate="visible"
   variants={containerVariants}
  >
   <motion.div variants={itemVariants} className="mb-8">
    <div className="flex items-center justify-between mb-2">
     <div>
      <h1 className="text-4xl font-bold text-stone-900 tracking-tight">Billing & Credits</h1>
      <p className="text-stone-500 mt-2 text-lg">Manage your credits, top-ups, and payment history</p>
     </div>
     <SecurityBanner variant="compact" />
    </div>
   </motion.div>

   <motion.div 
    variants={itemVariants}
    className="relative bg-white rounded-[2rem] p-10 mb-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-stone-100/50 overflow-hidden"
   >
    <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 via-white to-emerald-50/30 rounded-[2rem]" />
    
    <div className="relative z-10">
     <div className="flex items-center gap-4 mb-8">
      <motion.div 
       initial={{ scale: 0 }}
       animate={{ scale: 1 }}
       transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
       className="p-3 bg-teal-100 rounded-2xl"
      >
       <Wallet className="h-6 w-6 text-teal-600" aria-hidden="true" />
      </motion.div>
      <span className="text-sm font-medium text-stone-400 uppercase tracking-widest">Available Balance</span>
     </div>
     
       <div className="flex items-baseline gap-3 mb-10">
       <motion.span 
        variants={balanceVariants}
        className="text-7xl font-bold text-stone-900 tracking-tighter"
       >
        <CurrencyDisplay amount={balance?.available_credits || 0} showSymbol={false} unit="cents" />
       </motion.span>
       <span className="text-2xl text-stone-400 font-medium">credits</span>
      </div>

     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { 
         icon: Clock, 
         label: 'In Escrow', 
         value: <CreditsDisplay amount={balance?.escrow_credits || 0} unit="cents" />,
         color: 'amber'
        },
        { 
         icon: TrendingUp, 
         label: 'Total Earnings', 
         value: <CreditsDisplay amount={balance?.total_earnings_credits || 0} unit="cents" />,
         color: 'green'
        },
        { 
         icon: DollarSign, 
         label: 'Currency', 
         value: currencyLoading ? 'Loading...' : `${displayCurrency} (${currencySymbol})`,
         color: 'teal'
        },
       { 
        icon: Receipt, 
        label: 'Transactions', 
        value: pagination?.total || 0,
        color: 'blue'
       }
      ].map((stat, i) => (
       <motion.div
        key={stat.label}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 + i * 0.1, type: 'spring', stiffness: 100 }}
        className="bg-stone-50/80 rounded-2xl p-5 border border-stone-100/50"
       >
        <div className="flex items-center gap-2 mb-3">
         <stat.icon className={`h-4 w-4 text-${stat.color}-600`} aria-hidden="true" />
         <span className="text-xs text-stone-500 font-medium">{stat.label}</span>
        </div>
        <p className="text-2xl font-bold text-stone-900">{stat.value}</p>
       </motion.div>
      ))}
     </div>
    </div>
   </motion.div>

   <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
    {[
     { 
      icon: Plus, 
      label: 'Top Up Credits', 
      sublabel: 'Add funds to your wallet',
      primary: true,
      onClick: () => setShowTopup(true)
     },
     { 
      icon: History, 
      label: 'View History', 
      sublabel: 'Check all transactions',
      onClick: () => document.getElementById('transactions-section')?.scrollIntoView({ behavior: 'smooth' })
     },
     { 
      icon: CreditCard, 
      label: 'Payment Methods', 
      sublabel: 'Manage cards & accounts',
      onClick: () => navigate('/careseeker/wallet/payment-methods')
     }
    ].map((action, i) => (
     <motion.button
      key={action.label}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + i * 0.1 }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={action.onClick}
      className={`group relative h-auto py-6 rounded-2xl flex flex-col items-center gap-2 
        ${action.primary 
         ? 'bg-teal-600 text-white shadow-[0_4px_20px_rgba(13,148,136,0.2)] hover:shadow-[0_8px_30px_rgba(13,148,136,0.3)]' 
         : 'bg-white text-stone-700 border-2 border-stone-200 hover:border-stone-300 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
        }
        transition-shadow duration-300`}
     >
      <motion.div 
       className={`p-2 rounded-xl ${action.primary ? 'bg-white/20' : 'bg-stone-100 group-hover:bg-stone-200'} transition-colors`}
       whileHover={{ rotate: action.primary ? 90 : 0 }}
      >
       <action.icon className={`h-6 w-6 ${action.primary ? 'text-white' : 'text-stone-600'}`} aria-hidden="true" />
      </motion.div>
      <div className="text-center">
       <span className={`block font-bold text-lg ${action.primary ? 'text-white' : 'text-stone-700'}`}>{action.label}</span>
       <span className={`text-xs ${action.primary ? 'text-teal-100' : 'text-stone-500'}`}>{action.sublabel}</span>
      </div>
     </motion.button>
    ))}
   </motion.div>

   <motion.div variants={itemVariants} id="transactions-section">
    <Card className="border-0 shadow-[0_4px_24px_rgba(0,0,0,0.03)] rounded-[2rem] overflow-hidden">
     <CardHeader className="bg-stone-50/50 border-b border-stone-100/50 px-8 py-6">
      <div className="flex items-center justify-between">
       <div className="flex items-center gap-3">
        <div className="p-2 bg-teal-100 rounded-xl">
         <Receipt className="h-5 w-5 text-teal-600" aria-hidden="true" />
        </div>
        <div>
         <CardTitle className="text-xl font-bold text-stone-900">Transaction History</CardTitle>
         <p className="text-sm text-stone-500 mt-0.5">Track your credits usage and top-ups</p>
        </div>
       </div>
       {pagination && pagination.total > 0 && (
        <span className="text-sm text-stone-500 font-medium">
         {pagination.total} transactions
        </span>
       )}
      </div>
     </CardHeader>
     <CardContent className="p-0">
      {txLoading ? (
       <div className="p-8 space-y-4">
        {[1, 2, 3].map(i => (
         <div key={i} className="flex items-center gap-4">
          <div className="w-12 h-12 bg-stone-100 rounded-2xl animate-pulse" />
          <div className="flex-1 space-y-2">
           <div className="h-4 bg-stone-100 rounded w-1/3 animate-pulse" />
           <div className="h-3 bg-stone-100 rounded w-1/4 animate-pulse" />
          </div>
         </div>
        ))}
       </div>
      ) : transactions.length === 0 ? (
       <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className="text-center py-16 px-8"
       >
        <motion.div 
         initial={{ scale: 0 }}
         animate={{ scale: 1 }}
         transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
         className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4"
        >
         <Receipt className="h-10 w-10 text-stone-400" />
        </motion.div>
        <h3 className="text-lg font-semibold text-stone-900 mb-2">No transactions yet</h3>
        <p className="text-stone-500 max-w-sm mx-auto mb-6">
         Your transaction history will appear here once you start using credits for bookings or top-ups.
        </p>
        <Button onClick={() => setShowTopup(true)} className="bg-teal-600 hover:bg-teal-700 text-white rounded-full px-6">
         <Zap className="mr-2 h-4 w-4" />
         Top Up Now
        </Button>
       </motion.div>
      ) : (
       <div className="divide-y divide-stone-100">
        {transactions.map((tx: any, i: number) => (
         <motion.div
          key={tx.id}
          custom={i}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={transactionVariants}
          whileHover={{ x: 4 }}
          className="flex items-center justify-between p-6 hover:bg-stone-50/50 transition-colors group cursor-default"
         >
          <div className="flex items-center gap-4">
           <motion.div 
            className={`p-3 rounded-2xl ${tx.amount_credits > 0 ? 'bg-green-100' : 'bg-red-100'}`}
            whileHover={{ scale: 1.1 }}
           >
            {tx.amount_credits > 0 ? (
             <ArrowUpRight className="h-5 w-5 text-green-600" />
            ) : (
             <ArrowDownRight className="h-5 w-5 text-red-600" />
            )}
           </motion.div>
           <div>
            <p className="font-semibold text-stone-900">{tx.description}</p>
            <div className="flex items-center gap-2 mt-1">
             <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full font-medium">
              {tx.type}
             </span>
             <span className="text-xs text-stone-400">
              {new Date(tx.created_at).toLocaleDateString('en-US', { 
               year: 'numeric', 
               month: 'short', 
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
              })}
             </span>
            </div>
           </div>
          </div>
          <div className="text-right">
            <p className={`font-bold text-lg ${tx.amount_credits > 0 ? 'text-green-600' : 'text-red-600'}`}>
             {tx.amount_credits > 0 ? '+' : ''}<CurrencyDisplay amount={tx.amount_credits || 0} showSymbol={false} unit="cents" />
            </p>
            <p className="text-xs text-stone-400 font-medium">
             <CreditsDisplay amount={tx.balance_after_credits || 0} unit="cents" />
            </p>
          </div>
         </motion.div>
        ))}

        {pagination && pagination.last_page > 1 && (
         <div className="flex items-center justify-between p-6 border-t border-stone-100 bg-stone-50/30">
          <Button
           variant="outline"
           size="sm"
           disabled={pagination.current_page === 1}
           onClick={() => setTransactionsPage(p => p - 1)}
           className="rounded-full border-stone-200 hover:bg-white hover:border-stone-300"
          >
           Previous
          </Button>
          <span className="text-sm text-stone-500 font-medium">
           Page {pagination.current_page} of {pagination.last_page}
          </span>
          <Button
           variant="outline"
           size="sm"
           disabled={pagination.current_page === pagination.last_page}
           onClick={() => setTransactionsPage(p => p + 1)}
           className="rounded-full border-stone-200 hover:bg-white hover:border-stone-300"
          >
           Next
          </Button>
         </div>
        )}
       </div>
      )}
     </CardContent>
    </Card>
   </motion.div>

   {showTopup && <TopupModal onClose={() => setShowTopup(false)} onSuccess={() => {
     refetchBalance();
     refetchTransactions();
   }} currency={displayCurrency} currencySymbol={currencySymbol} />}
  </motion.div>
 );
}
