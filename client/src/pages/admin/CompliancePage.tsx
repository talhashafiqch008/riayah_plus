/**
 * Compliance Dashboard Page
 * Admin interface for monitoring compliance and documents
 */


import { useState, useEffect , useRef } from 'react';
import { FileCheck, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { client } from '@/lib/api/client';
import { isApiError } from '@/lib/errors';

interface ComplianceStats {
 totalProviders: number;
 compliant: number;
 expiringDocuments: number;
 pendingVerifications: number;
}

export default function ComplianceDashboardPage() {
 const [stats, setStats] = useState<ComplianceStats | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetchComplianceStats();
 }, []);

 const fetchComplianceStats = async () => {
 try {
 const response = await client.get('/admin/compliance/stats');
 const statsData = response.data?.data || response.data;
 setStats(statsData);
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load compliance data');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to load compliance data');
 }
 } finally {
 setLoading(false);
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-screen">
 <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600"></div>
 </div>
 );
 }

 const complianceRate = stats
 ? ((stats.compliant / stats.totalProviders) * 100).toFixed(1)
 : 0;

 return (
 <div className="container mx-auto px-4 py-8">
 <div className="mb-8">
 <h1 className="text-3xl font-semibold text-stone-900 mb-2">Compliance Dashboard</h1>
 <p className="text-stone-600">Monitor provider compliance and documentation</p>
 </div>

 {/* Stats Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="size-12 bg-green-100 rounded-lg flex items-center justify-center">
 <FileCheck className="size-6 text-green-600" />
 </div>
 <span className="text-3xl font-bold text-green-600">
 {complianceRate}%
 </span>
 </div>
 <h3 className="text-sm font-medium text-stone-600">Compliance Rate</h3>
 <p className="text-xs text-stone-500 mt-1">
 {stats?.compliant} of {stats?.totalProviders} providers
 </p>
 </div>

 <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="size-12 bg-yellow-100 rounded-lg flex items-center justify-center">
 <Clock className="size-6 text-yellow-600" />
 </div>
 <span className="text-3xl font-bold text-yellow-600">
 {stats?.expiringDocuments || 0}
 </span>
 </div>
 <h3 className="text-sm font-medium text-stone-600">Expiring Soon</h3>
 <p className="text-xs text-stone-500 mt-1">Documents within 30 days</p>
 </div>

 <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="size-12 bg-orange-100 rounded-lg flex items-center justify-center">
 <AlertTriangle className="size-6 text-orange-600" />
 </div>
 <span className="text-3xl font-bold text-orange-600">
 {stats?.pendingVerifications || 0}
 </span>
 </div>
 <h3 className="text-sm font-medium text-stone-600">Pending Review</h3>
 <p className="text-xs text-stone-500 mt-1">Awaiting verification</p>
 </div>

 <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <div className="size-12 bg-blue-100 rounded-lg flex items-center justify-center">
 <TrendingUp className="size-6 text-blue-600" />
 </div>
 <span className="text-3xl font-bold text-blue-600">
 {stats?.totalProviders || 0}
 </span>
 </div>
 <h3 className="text-sm font-medium text-stone-600">Total Providers</h3>
 <p className="text-xs text-stone-500 mt-1">Active on platform</p>
 </div>
 </div>

 {/* Compliance Overview */}
 <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
 <h2 className="text-lg font-semibold text-stone-900 mb-4">Compliance Overview</h2>
 <div className="space-y-4">
 <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
 <div>
 <h3 className="font-medium text-stone-900">License Verification</h3>
 <p className="text-sm text-stone-600">Professional licenses up to date</p>
 </div>
 <span className="text-green-600 font-semibold">95%</span>
 </div>
 <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
 <div>
 <h3 className="font-medium text-stone-900">Background Checks</h3>
 <p className="text-sm text-stone-600">Criminal background verification</p>
 </div>
 <span className="text-green-600 font-semibold">98%</span>
 </div>
 <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
 <div>
 <h3 className="font-medium text-stone-900">Insurance Coverage</h3>
 <p className="text-sm text-stone-600">Professional liability insurance</p>
 </div>
 <span className="text-yellow-600 font-semibold">87%</span>
 </div>
 </div>
 </div>
 </div>
 );
}
