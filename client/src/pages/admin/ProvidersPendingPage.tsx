/**
 * Pending Providers Page
 * Admin interface for reviewing and approving providers
 */


import { useState, useEffect , useRef } from 'react';
import { ProviderApprovalCard } from '@/components/admin/ProviderApprovalCard';
import { Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { client } from '@/lib/api/client';
import { isApiError } from '@/lib/errors';

interface Provider {
 id: string;
 firstName: string;
 lastName: string;
 email: string;
 phone: string;
 verificationStatus: string;
 createdAt: string;
 documents?: Record<string, unknown>[];
}

export default function PendingProvidersPage() {
 const [providers, setProviders] = useState<Provider[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');

 useEffect(() => {
 fetchPendingProviders();
 }, []);

 const fetchPendingProviders = async () => {
 try {
 const response = await client.get('/admin/providers/pending');
 const providersList = response.data?.data?.providers || response.data?.providers || response.data || [];
 setProviders(Array.isArray(providersList) ? providersList : []);
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load pending providers');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to load pending providers');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleApprove = (id: string) => {
 setProviders(prev => prev.filter(p => p.id !== id));
 };

 const handleReject = (id: string) => {
 setProviders(prev => prev.filter(p => p.id !== id));
 };

 const filteredProviders = providers.filter(provider =>
 provider.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 provider.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 provider.email.toLowerCase().includes(searchTerm.toLowerCase())
 );

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-screen">
 <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600"></div>
 </div>
 );
 }

 return (
 <div className="container mx-auto px-4 py-8">
 <div className="mb-8">
 <h1 className="text-3xl font-semibold text-stone-900 mb-2">Pending Provider Approvals</h1>
 <p className="text-stone-600">Review and approve provider applications</p>
 </div>

 {/* Search and Filters */}
 <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4 mb-6">
 <div className="flex items-center gap-4">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 size-5" />
 <input
 type="text"
 placeholder="Search by name or email..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
 />
 </div>
 <button className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 flex items-center gap-2">
 <Filter className="size-5" />
 Filters
 </button>
 </div>
 </div>

 {/* Providers List */}
 {filteredProviders.length === 0 ? (
 <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-12 text-center">
 <h3 className="text-lg font-semibold text-stone-900 mb-2">No pending approvals</h3>
 <p className="text-stone-600">
 {searchTerm
 ? 'No providers match your search'
 : 'All provider applications have been reviewed'}
 </p>
 </div>
 ) : (
 <div className="space-y-4">
 {filteredProviders.map((provider) => (
 <ProviderApprovalCard
 key={provider.id}
 provider={provider}
 onApprove={handleApprove}
 onReject={handleReject}
 />
 ))}
 </div>
 )}
 </div>
 );
}
