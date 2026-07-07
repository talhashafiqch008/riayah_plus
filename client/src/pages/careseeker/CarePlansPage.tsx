
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/components/motion/variants';

import { useState, useEffect , useRef } from 'react';
import { Link } from 'react-router-dom';
import {
 ArrowLeft, Check, Star, Crown, Zap, Clock, AlertCircle, CheckCircle,
 Loader2, FileText, Plus, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getCarePlans } from '@/lib/api/careseeker';


interface CarePlanItem {
 id: number;
 title: string;
 description?: string;
 category?: string;
 frequency?: string;
 status?: string;
}

interface CarePlan {
 id: number;
 name: string;
 description?: string;
 status: string;
 hours_per_week: number;
 start_date?: string;
 end_date?: string;
 items?: CarePlanItem[];
}

interface Plan {
 id: string;
 name: string;
 priceQAR: number;
 priceEGP: number;
 billingCycle: 'monthly' | 'yearly';
 description: string;
 features: string[];
 popular?: boolean;
 current?: boolean;
}

const SUBSCRIPTION_PLANS: Plan[] = [
 {
 id: 'basic',
 name: 'Basic Care',
 priceQAR: 199,
 priceEGP: 500,
 billingCycle: 'monthly',
 description: 'Essential care support for individuals',
 features: [
 'Up to 4 care sessions/month',
 'Basic provider matching',
 'In-app messaging',
 'Standard support',
 'Basic health reports',
 ],
 },
 {
 id: 'standard',
 name: 'Standard Care',
 priceQAR: 499,
 priceEGP: 1250,
 billingCycle: 'monthly',
 description: 'Comprehensive care for families',
 features: [
 'Up to 12 care sessions/month',
 'Priority provider matching',
 'Telehealth included',
 'In-app messaging & calls',
 'Priority support',
 'Detailed health reports',
 'Emergency requests',
 ],
 popular: true,
 current: true,
 },
 {
 id: 'premium',
 name: 'Premium Care',
 priceQAR: 999,
 priceEGP: 2500,
 billingCycle: 'monthly',
 description: 'Complete care solution with dedicated support',
 features: [
 'Unlimited care sessions',
 'Dedicated care coordinator',
 'All telehealth features',
 '24/7 support hotline',
 'Comprehensive analytics',
 'Family account (up to 5)',
 'Priority emergency response',
 'Insurance claim assistance',
 ],
 },
];

const YEARLY_DISCOUNT = 0.15;

export default function CarePlansPage() {
 const { user } = useAuth();
 const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
 const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
 const [showConfirmation, setShowConfirmation] = useState(false);

 // TODO: Refactor cascading setState into useReducer or batched update
 // TODO: Combine multiple setState calls
 useEffect(() => {
 async function fetchCarePlans() {
 try {
 setIsLoading(true);
 setError(null);
 const response = await getCarePlans();
 const plans = response.data || response || [];
 setCarePlans(Array.isArray(plans) ? plans : []);
 } catch (err) {
 console.error('Failed to fetch care plans', err);
 setError('Failed to load care plans. Please try again.');
 } finally {
 setIsLoading(false);
 }
 }

 fetchCarePlans();
 }, []);

 const country = user?.country || 'QAT';
 const currency = country === 'EGY' ? 'EGP' : 'QAR';

 const currentSubscription = SUBSCRIPTION_PLANS.find(p => p.current);
 const newPlan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);

 const getPrice = (plan: Plan) => {
 const basePrice = country === 'EGY' ? plan.priceEGP : plan.priceQAR;
 if (billingCycle === 'yearly') {
 return Math.round(basePrice * 12 * (1 - YEARLY_DISCOUNT));
 }
 return basePrice;
 };

 const getMonthlyPrice = (plan: Plan) => {
 return country === 'EGY' ? plan.priceEGP : plan.priceQAR;
 };

 const handlePlanChange = (planId: string) => {
 setSelectedPlan(planId);
 setShowConfirmation(true);
 };

 const isUpgrade = (plan: Plan) => {
 if (!currentSubscription) return false;
 const planOrder = ['basic', 'standard', 'premium'];
 return planOrder.indexOf(plan.id) > planOrder.indexOf(currentSubscription.id);
 };

 if (isLoading) {
 return (
 <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
 <div className="flex items-center gap-4">
 <Link to="/careseeker" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
 <ArrowLeft className="size-5 text-stone-600" />
 </Link>
 <div className="flex-1">
 <h1 className="text-2xl font-semibold text-stone-900">Care Plans</h1>
 <p className="text-stone-600">Loading your care plans&hellip;</p>
 </div>
 </div>
 <div className="flex items-center justify-center py-12">
 <Loader2 className="size-8 animate-spin text-teal-600" />
 </div>
 </motion.div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="flex items-center gap-4">
 <Link to="/careseeker" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
 <ArrowLeft className="size-5 text-stone-600" />
 </Link>
 <div className="flex-1">
 <h1 className="text-2xl font-semibold text-stone-900">Care Plans</h1>
 <p className="text-stone-600">Manage your care plans and subscriptions</p>
 </div>
 </div>

 {error && (
 <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
 <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
 <div>
 <p className="font-medium text-red-900">Error</p>
 <p className="text-sm text-red-700">{error}</p>
 </div>
 </div>
 )}

 <div className="space-y-4">
 <h2 className="text-lg font-semibold text-stone-900">Your Care Plans</h2>
 {carePlans.length === 0 ? (
 <div className="bg-white rounded-xl p-8 ring-1 ring-stone-200/50 text-center">
 <FileText className="size-12 text-stone-300 mx-auto mb-4" />
 <h3 className="text-lg font-medium text-stone-900 mb-2">No care plans yet</h3>
 <p className="text-stone-600 mb-4">Your personalized care plans will appear here once created.</p>
 <Button className="bg-teal-600 hover:bg-teal-700">
 <Plus className="size-4 mr-2" />
 Create Care Plan
 </Button>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {carePlans.map((plan) => (
 <div key={plan.id} className="bg-white rounded-xl p-5 ring-1 ring-stone-200/50 ">
 <div className="flex items-start justify-between mb-3">
 <div>
 <h3 className="font-semibold text-stone-900">{plan.name}</h3>
 {plan.description && (
 <p className="text-sm text-stone-600">{plan.description}</p>
 )}
 </div>
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${ plan.status === 'active' ? 'bg-green-100 text-green-700' : plan.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-700' }`}>
 {plan.status}
 </span>
 </div>
 <div className="flex items-center gap-4 text-sm text-stone-600 mb-3">
 <div className="flex items-center gap-1">
 <Clock className="size-4" />
 <span>{plan.hours_per_week} hrs/week</span>
 </div>
 {plan.start_date && (
 <span>From {new Date(plan.start_date).toLocaleDateString()}</span>
 )}
 </div>
 {plan.items && plan.items.length > 0 && (
 <div className="space-y-2">
 <p className="text-sm font-medium text-stone-700">Plan Items</p>
 <ul className="space-y-1">
 {plan.items.slice(0, 3).map((item) => (
 <li key={item.id} className="flex items-center gap-2 text-sm text-stone-600">
 <Check className="size-3 text-teal-500" />
 {item.title}
 </li>
 ))}
 {plan.items.length > 3 && (
 <li className="text-sm text-stone-500">
 +{plan.items.length - 3} more items
 </li>
 )}
 </ul>
 </div>
 )}
 <div className="mt-4 pt-4 border-t ring-1 ring-stone-100/50">
 <Link
 to={`/careseeker/care-plans/${plan.id}`}
 className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
 >
 View Details
 <ChevronRight className="size-4" />
 </Link>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="space-y-4">
 <h2 className="text-lg font-semibold text-stone-900">Subscription Plans</h2>

 {currentSubscription && (
 <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-5 text-white">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-white/20 rounded-lg">
 <Crown className="size-5" />
 </div>
 <div>
 <p className="text-teal-100 text-sm">Current Plan</p>
 <p className="text-xl font-bold">{currentSubscription.name}</p>
 </div>
 </div>
 <div className="text-right">
 <p className="text-2xl font-bold">{currency} {getPrice(currentSubscription)}</p>
 <p className="text-teal-100 text-sm">/{billingCycle === 'yearly' ? 'year' : 'month'}</p>
 </div>
 </div>
 <div className="mt-4 flex items-center gap-2 text-sm text-teal-100">
 <Clock className="size-4" />
 <span>Next billing: January 1, 2026</span>
 </div>
 </div>
 )}

 <div className="flex items-center justify-center gap-4">
 <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-stone-900' : 'text-stone-500'}`}>
 Monthly
 </span>
 <button
 onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
 className={`relative w-14 h-7 rounded-full transition-colors ${billingCycle === 'yearly' ? 'bg-teal-600' : 'bg-stone-300' }`}
 aria-label="Toggle billing cycle"
 >
 <div
 className={`absolute top-1 size-5 bg-white rounded-full shadow transition-transform duration-300 ${billingCycle === 'yearly' ? 'left-8' : 'left-1' }`}
 />
 </button>
 <div className="flex items-center gap-2">
 <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-stone-900' : 'text-stone-500'}`}>
 Yearly
 </span>
 <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
 Save 15%
 </span>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {SUBSCRIPTION_PLANS.map((plan) => (
 <div
 key={plan.id}
 className={`relative bg-white/90 backdrop-blur-xl rounded-2xl border-2 p-6 transition-transform duration-300 ${plan.popular ? 'border-teal-500 shadow-lg shadow-teal-100' : plan.current ? 'border-teal-300' : 'ring-1 ring-stone-200/50 hover:border-stone-300' }`}
 >
 {plan.popular && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2">
 <span className="px-3 py-1 bg-teal-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
 <Star className="size-3" />
 Most Popular
 </span>
 </div>
 )}

 {plan.current && (
 <div className="absolute -top-3 right-4">
 <span className="px-3 py-1 bg-stone-700 text-white text-xs font-bold rounded-full">
 Current Plan
 </span>
 </div>
 )}

 <div className="text-center mb-6">
 <h3 className="text-xl font-semibold text-stone-900 mb-1">{plan.name}</h3>
 <p className="text-sm text-stone-500">{plan.description}</p>
 </div>

 <div className="text-center mb-6">
 <div className="flex items-baseline justify-center gap-1">
 <span className="text-sm text-stone-500">{currency}</span>
 <span className="text-4xl font-bold text-stone-900">{getPrice(plan)}</span>
 </div>
 <p className="text-sm text-stone-500">
 /{billingCycle === 'yearly' ? 'year' : 'month'}
 </p>
 {billingCycle === 'yearly' && (
 <p className="text-xs text-green-600 mt-1">
 Save {currency} {Math.round(getMonthlyPrice(plan) * 12 * YEARLY_DISCOUNT)}/year
 </p>
 )}
 </div>

 <ul className="space-y-3 mb-6">
 {plan.features.map((feature) => (
 <li key={feature} className="flex items-start gap-2 text-sm">
 <Check className="size-4 text-teal-500 flex-shrink-0 mt-0.5" />
 <span className="text-stone-600">{feature}</span>
 </li>
 ))}
 </ul>

 {plan.current ? (
 <Button variant="outline" className="w-full" disabled>
 Current Plan
 </Button>
 ) : (
 <Button
 className={`w-full ${isUpgrade(plan) ? 'bg-teal-600 hover:bg-teal-700' : 'bg-stone-600 hover:bg-stone-700' }`}
 onClick={() => handlePlanChange(plan.id)}
 >
 {isUpgrade(plan) ? (
 <>
 <Zap className="size-4 mr-2" />
 Upgrade
 </>
 ) : (
 <>
 <ChevronRight className="size-4 mr-2" />
 Downgrade
 </>
 )}
 </Button>
 )}
 </div>
 ))}
 </div>
 </div>

 {showConfirmation && newPlan && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); } }} onClick={() => setShowConfirmation(false)}>
 <div className="bg-white/90 backdrop-blur-xl rounded-2xl w-full max-w-md" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); } }} onClick={e => e.stopPropagation()}>
 <div className="p-6 border-b ring-1 ring-stone-200/50">
 <h2 className="text-lg font-semibold text-stone-900">
 {isUpgrade(newPlan) ? 'Upgrade' : 'Downgrade'} to {newPlan.name}?
 </h2>
 </div>
 <div className="p-6 space-y-4">
 {isUpgrade(newPlan) ? (
 <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
 <CheckCircle className="size-5 text-green-600 flex-shrink-0" />
 <div>
 <p className="font-medium text-green-900">Immediate access to new features</p>
 <p className="text-sm text-green-700">You will be charged the difference for this billing period.</p>
 </div>
 </div>
 ) : (
 <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
 <AlertCircle className="size-5 text-amber-600 flex-shrink-0" />
 <div>
 <p className="font-medium text-amber-900">Some features will be removed</p>
 <p className="text-sm text-amber-700">Changes take effect at the end of your billing cycle.</p>
 </div>
 </div>
 )}

 <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
 <span className="text-stone-600">New price</span>
 <span className="text-xl font-bold text-stone-900">
 {currency} {getPrice(newPlan)}/{billingCycle === 'yearly' ? 'year' : 'month'}
 </span>
 </div>

 <div className="flex gap-3">
 <Button variant="outline" className="flex-1" onClick={() => setShowConfirmation(false)}>
 Cancel
 </Button>
 <Button className={`flex-1 ${isUpgrade(newPlan) ? 'bg-teal-600 hover:bg-teal-700' : ''}`}>
 Confirm {isUpgrade(newPlan) ? 'Upgrade' : 'Downgrade'}
 </Button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
