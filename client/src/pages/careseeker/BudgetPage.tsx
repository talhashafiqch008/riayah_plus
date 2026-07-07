
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
 ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar,
 PieChart, BarChart3, Calculator, AlertCircle, CheckCircle,
 ChevronRight, Wallet, CreditCard, Shield, Info, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCareBudget } from '@/lib/api/careseeker';


interface BudgetBreakdownItem {
 category: string;
 amount: number;
 percentage: number;
 color: string;
}

interface BudgetData {
 monthlyBudget: number;
 currentSpend: number;
 projectedSpend: number;
 currency: string;
 sessions: {
 scheduled: number;
 completed: number;
 avgCost: number;
 };
 breakdown: BudgetBreakdownItem[];
 insuranceCoverage: number;
 outOfPocket: number;
 periodStart?: string;
 periodEnd?: string;
}

const FALLBACK_TREND = [
 { month: 'Jul', amount: 4200 },
 { month: 'Aug', amount: 4500 },
 { month: 'Sep', amount: 3800 },
 { month: 'Oct', amount: 4100 },
 { month: 'Nov', amount: 3900 },
 { month: 'Dec', amount: 3250 },
];

export default function BudgetPage() {
 const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('monthly');
 const [showForecast, setShowForecast] = useState(true);
 const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 // TODO: Refactor cascading setState into useReducer or batched update
 // TODO: Combine multiple setState calls
 useEffect(() => {
 async function fetchBudget() {
 try {
 setIsLoading(true);
 setError(null);
 const response = await getCareBudget();
 const data = response.data || response;
 if (data && typeof data === 'object') {
 setBudgetData({
 monthlyBudget: data.monthlyBudget || 0,
 currentSpend: data.currentSpend || 0,
 projectedSpend: data.projectedSpend || 0,
 currency: data.currency || 'QAR',
 sessions: data.sessions || { scheduled: 0, completed: 0, avgCost: 0 },
 breakdown: data.breakdown || [],
 insuranceCoverage: data.insuranceCoverage || 0,
 outOfPocket: data.outOfPocket || 0,
 periodStart: data.periodStart,
 periodEnd: data.periodEnd,
 });
 }
 } catch (err) {
 console.error('Failed to fetch budget', err);
 setError('Failed to load budget data. Please try again.');
 } finally {
 setIsLoading(false);
 }
 }

 fetchBudget();
 }, []);

 if (isLoading) {
 return (
 <div className="space-y-6">
 <div className="flex items-center gap-4">
 <Link to="/careseeker" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
 <ArrowLeft className="size-5 text-stone-600" />
 </Link>
 <div className="flex-1">
 <h1 className="text-2xl font-semibold text-stone-900">Budget & Forecasting</h1>
 <p className="text-stone-600">Loading budget data&hellip;</p>
 </div>
 </div>
 <div className="flex items-center justify-center py-12">
 <Loader2 className="size-8 animate-spin text-teal-600" />
 </div>
 </div>
 );
 }

 const data = budgetData || {
 monthlyBudget: 0,
 currentSpend: 0,
 projectedSpend: 0,
 currency: 'QAR',
 sessions: { scheduled: 0, completed: 0, avgCost: 0 },
 breakdown: [],
 insuranceCoverage: 0,
 outOfPocket: 0,
 };

 const budgetUsage = data.monthlyBudget > 0 ? (data.currentSpend / data.monthlyBudget) * 100 : 0;
 const projectedUsage = data.monthlyBudget > 0 ? (data.projectedSpend / data.monthlyBudget) * 100 : 0;
 const isOverBudget = projectedUsage > 100;
 const currency = data.currency;

 return (
 <div className="space-y-6">
 <div className="flex items-center gap-4">
 <Link to="/careseeker" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
 <ArrowLeft className="size-5 text-stone-600" />
 </Link>
 <div className="flex-1">
 <h1 className="text-2xl font-semibold text-stone-900">Budget & Forecasting</h1>
 <p className="text-stone-600">Track spending and plan your care budget</p>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => setSelectedPeriod('monthly')}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === 'monthly' ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200' }`}
 >
 Monthly
 </button>
 <button
 onClick={() => setSelectedPeriod('yearly')}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === 'yearly' ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200' }`}
 >
 Yearly
 </button>
 </div>
 </div>

 {error && (
 <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
 <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
 <div>
 <p className="font-medium text-red-900">Error</p>
 <p className="text-sm text-red-700">{error}</p>
 <Button
 size="sm"
 variant="outline"
 className="mt-2"
 onClick={() => window.location.reload()}
 >
 Retry
 </Button>
 </div>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-white rounded-xl p-5 ring-1 ring-stone-200/50 ">
 <div className="flex items-center justify-between mb-3">
 <div className="p-2 bg-teal-100 rounded-lg">
 <Wallet className="size-5 text-teal-600" />
 </div>
 <span className="text-xs text-stone-500">Monthly Budget</span>
 </div>
 <p className="text-2xl font-bold text-stone-900">{currency} {data.monthlyBudget.toLocaleString()}</p>
 <p className="text-sm text-stone-500">Set limit</p>
 </div>

 <div className="bg-white rounded-xl p-5 ring-1 ring-stone-200/50 ">
 <div className="flex items-center justify-between mb-3">
 <div className="p-2 bg-blue-100 rounded-lg">
 <DollarSign className="size-5 text-blue-600" />
 </div>
 <span className="text-xs text-stone-500">Current Spend</span>
 </div>
 <p className="text-2xl font-bold text-stone-900">{currency} {data.currentSpend.toLocaleString()}</p>
 <p className="text-sm text-green-600 flex items-center gap-1">
 <TrendingDown className="size-3" />
 {(100 - budgetUsage).toFixed(0)}% remaining
 </p>
 </div>

 <div className={`bg-white rounded-xl p-5 border  ${isOverBudget ? 'border-red-200' : 'ring-1 ring-stone-200/50'}`}>
 <div className="flex items-center justify-between mb-3">
 <div className={`p-2 rounded-lg ${isOverBudget ? 'bg-red-100' : 'bg-amber-100'}`}>
 <TrendingUp className={`size-5 ${isOverBudget ? 'text-red-600' : 'text-amber-600'}`} />
 </div>
 <span className="text-xs text-stone-500">Projected</span>
 </div>
 <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-stone-900'}`}>
 {currency} {data.projectedSpend.toLocaleString()}
 </p>
 <p className={`text-sm flex items-center gap-1 ${isOverBudget ? 'text-red-600' : 'text-amber-600'}`}>
 {isOverBudget ? (
 <>
 <AlertCircle className="size-3" />
 Over budget by {(projectedUsage - 100).toFixed(0)}%
 </>
 ) : (
 <>
 <CheckCircle className="size-3" />
 Within budget
 </>
 )}
 </p>
 </div>

 <div className="bg-white rounded-xl p-5 ring-1 ring-stone-200/50 ">
 <div className="flex items-center justify-between mb-3">
 <div className="p-2 bg-purple-100 rounded-lg">
 <Shield className="size-5 text-purple-600" />
 </div>
 <span className="text-xs text-stone-500">Insurance Coverage</span>
 </div>
 <p className="text-2xl font-bold text-stone-900">{data.insuranceCoverage}%</p>
 <p className="text-sm text-stone-500">Out of pocket: {currency} {data.outOfPocket}</p>
 </div>
 </div>

 <div className="bg-white rounded-xl p-6 ring-1 ring-stone-200/50 ">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-stone-900">Budget Progress</h2>
 <Button variant="outline" size="sm">
 <Calculator className="size-4 mr-2" />
 Adjust Budget
 </Button>
 </div>

 <div className="relative mb-4">
 <div className="h-6 bg-stone-100 rounded-full overflow-hidden">
 <div
 className="h-full bg-gradient-to-r from-teal-500 to-teal-600 transition-transform duration-300"
 style={{ width: `${Math.min(budgetUsage, 100)}%` }}
 />
 </div>
 <div
 className={`absolute top-0 h-6 w-0.5 ${isOverBudget ? 'bg-red-500' : 'bg-amber-500'}`}
 style={{ left: `${Math.min(projectedUsage, 100)}%` }}
 >
 <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium ${isOverBudget ? 'text-red-600' : 'text-amber-600'}`}>
 Projected
 </div>
 </div>
 </div>

 <div className="flex justify-between text-sm">
 <span className="text-stone-500">{currency} 0</span>
 <span className="text-stone-500">{currency} {data.monthlyBudget.toLocaleString()}</span>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white rounded-xl p-6 ring-1 ring-stone-200/50 ">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-stone-900">Spending by Category</h2>
 <PieChart className="size-5 text-stone-400" />
 </div>
 {data.breakdown.length === 0 ? (
 <div className="text-center py-8">
 <p className="text-sm text-stone-500">No spending data available yet.</p>
 </div>
 ) : (
 <div className="space-y-4">
 {data.breakdown.map((item) => (
 <div key={item.category}>
 <div className="flex items-center justify-between mb-1">
 <span className="text-sm font-medium text-stone-700">{item.category}</span>
 <span className="text-sm text-stone-900">{currency} {item.amount.toLocaleString()}</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
 <div
 className={`h-full ${item.color} transition-transform duration-300`}
 style={{ width: `${item.percentage}%` }}
 />
 </div>
 <span className="text-xs text-stone-500 w-10">{item.percentage}%</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="bg-white rounded-xl p-6 ring-1 ring-stone-200/50 ">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-stone-900">Monthly Trend</h2>
 <BarChart3 className="size-5 text-stone-400" />
 </div>
 <div className="flex items-end justify-between h-40 gap-2">
 {FALLBACK_TREND.map((item) => {
 const height = data.monthlyBudget > 0 ? (item.amount / data.monthlyBudget) * 100 : 0;
 return (
 <div key={item.month} className="flex-1 flex flex-col items-center">
 <div
 className="w-full bg-gradient-to-t from-teal-500 to-teal-400 rounded-t-lg transition-transform duration-300 hover:from-teal-600 hover:to-teal-500"
 style={{ height: `${Math.min(height, 100)}%` }}
 />
 <span className="text-xs text-stone-500 mt-2">{item.month}</span>
 </div>
 );
 })}
 </div>
 <div className="mt-4 pt-4 border-t ring-1 ring-stone-100/50">
 <div className="flex items-center justify-between text-sm">
 <span className="text-stone-500">Average monthly spend</span>
 <span className="font-semibold text-stone-900">
 {currency} {Math.round(FALLBACK_TREND.reduce((a, b) => a + b.amount, 0) / 6).toLocaleString()}
 </span>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6 border border-teal-100">
 <div className="flex items-start gap-4">
 <div className="p-3 bg-teal-100 rounded-xl">
 <Calculator className="size-6 text-teal-600" />
 </div>
 <div className="flex-1">
 <h3 className="text-lg font-semibold text-stone-900 mb-2">Budget Forecast</h3>
 <p className="text-stone-600 mb-4">
 Based on your current spending pattern, here is what we project for the next 3 months:
 </p>
 <div className="grid grid-cols-3 gap-4 mb-4">
 <div className="bg-white/60 rounded-lg p-3 text-center">
 <p className="text-sm text-stone-500">Next Month</p>
 <p className="text-lg font-bold text-stone-900">{currency} {Math.round(data.projectedSpend * 1.05).toLocaleString()}</p>
 </div>
 <div className="bg-white/60 rounded-lg p-3 text-center">
 <p className="text-sm text-stone-500">Month 2</p>
 <p className="text-lg font-bold text-stone-900">{currency} {Math.round(data.projectedSpend * 1.08).toLocaleString()}</p>
 </div>
 <div className="bg-white/60 rounded-lg p-3 text-center">
 <p className="text-sm text-stone-500">Month 3</p>
 <p className="text-lg font-bold text-stone-900">{currency} {Math.round(data.projectedSpend * 1.1).toLocaleString()}</p>
 </div>
 </div>
 <div className="flex items-center gap-2 text-sm text-teal-700">
 <Info className="size-4" />
 Consider upgrading to a yearly plan to save 15% on care costs.
 </div>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Link to="/careseeker/care-plans" className="bg-white rounded-xl p-4 ring-1 ring-stone-200/50 hover:border-teal-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-transform duration-300 flex items-center justify-between group">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition-colors">
 <Calendar className="size-5 text-teal-600" />
 </div>
 <div>
 <p className="font-semibold text-stone-900">View Care Plans</p>
 <p className="text-sm text-stone-500">Compare monthly & yearly</p>
 </div>
 </div>
 <ChevronRight className="size-5 text-stone-400 group-hover:text-teal-600" />
 </Link>

 <Link to="/careseeker/payments" className="bg-white rounded-xl p-4 ring-1 ring-stone-200/50 hover:border-teal-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-transform duration-300 flex items-center justify-between group">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
 <CreditCard className="size-5 text-blue-600" />
 </div>
 <div>
 <p className="font-semibold text-stone-900">Payment History</p>
 <p className="text-sm text-stone-500">View all transactions</p>
 </div>
 </div>
 <ChevronRight className="size-5 text-stone-400 group-hover:text-teal-600" />
 </Link>

 <button className="bg-white rounded-xl p-4 ring-1 ring-stone-200/50 hover:border-teal-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-transform duration-300 flex items-center justify-between group text-left">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
 <Shield className="size-5 text-purple-600" />
 </div>
 <div>
 <p className="font-semibold text-stone-900">Insurance Claims</p>
 <p className="text-sm text-stone-500">Submit for reimbursement</p>
 </div>
 </div>
 <ChevronRight className="size-5 text-stone-400 group-hover:text-teal-600" />
 </button>
 </div>
 </div>
 );
}
