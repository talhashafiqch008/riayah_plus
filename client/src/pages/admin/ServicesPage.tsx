
import { useState, useEffect , useRef } from 'react';
import { Plus, Edit, Trash2, Search } from "lucide-react";
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/admin/api';

interface Service {
 id: string;
 name: string;
 description: string;
 category: string;
 deliveryTypes: string[];
 pricePerHour: number;
 defaultDurationMinutes: number;
 requiredSkills: string[];
 isActive: boolean;
}

export default function ServiceCatalogManagementPage() {
 const [services, setServices] = useState<Service[]>([]);
 const [searchQuery, setSearchQuery] = useState("");
 const [showAddModal, setShowAddModal] = useState(false);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetchServices();
 }, []);

 const fetchServices = async () => {
 try {
 setLoading(true);
 const response = await adminApi.get('/admin/services');
 const items = response?.data?.items || response?.data || response || [];
 setServices(Array.isArray(items) ? items : []);
 } catch (error) {
 console.error("Failed to fetch services:", error);
 setServices([]);
 } finally {
 setLoading(false);
 }
 };

 const toggleServiceStatus = async (id: string, currentStatus: boolean) => {
 try {
 await adminApi.put(`/admin/services/${id}`, { status: !currentStatus ? 'active' : 'inactive' });
 fetchServices();
 toast.success(`Service ${!currentStatus ? 'activated' : 'deactivated'}`);
 } catch (error) {
 console.error("Failed to update service:", error);
 toast.error('Failed to update service status');
 }
 };

 const filteredServices = services.filter((service) =>
 service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 service.category.toLowerCase().includes(searchQuery.toLowerCase())
 );

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600"></div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Service Catalog</h1>
 <p className="text-sm text-stone-500">Manage available healthcare services</p>
 </div>
 <button
 onClick={() => toast('Add service coming soon', { icon: '🔧' })}
 className="flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
 >
 <Plus className="mr-2 size-4" />
 Add Service
 </button>
 </div>

 {/* Search */}
 <div className="flex w-full max-w-md items-center rounded-lg border bg-white px-3 py-2">
 <Search className="mr-2 size-5 text-stone-400" />
 <input
 type="text"
 placeholder="Search services..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-transparent text-sm focus:outline-none"
 />
 </div>

 {/* Services Table */}
 <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
 <table className="min-w-full divide-y divide-stone-200">
 <thead className="bg-stone-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 Service
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 Category
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 Price/Hour
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 Duration
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 Status
 </th>
 <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-stone-200">
 {filteredServices.map((service) => (
 <tr key={service.id} className="hover:bg-stone-50">
 <td className="px-6 py-4">
 <div>
 <div className="text-sm font-medium text-stone-900">{service.name}</div>
 <div className="text-sm text-stone-500 line-clamp-1">{service.description}</div>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
 {service.category?.replace("_", " ") || 'Uncategorized'}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
 SAR {service.pricePerHour}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
 {service.defaultDurationMinutes} min
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <button
 onClick={() => toggleServiceStatus(service.id, service.isActive)}
 className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${service.isActive ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-700" }`}
 >
 {service.isActive ? "Active" : "Inactive"}
 </button>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
 <button
 onClick={() => toast('Edit service coming soon', { icon: '🔧' })}
 className="text-teal-600 hover:text-teal-900 mr-3"
 >
 <Edit className="size-4 inline" />
 </button>
 <button
 onClick={() => toast('Delete service coming soon', { icon: '🔧' })}
 className="text-red-600 hover:text-red-900"
 >
 <Trash2 className="size-4 inline" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {filteredServices.length === 0 && (
 <div className="text-center py-12 rounded-xl border bg-white">
 <p className="text-stone-500">No services found</p>
 </div>
 )}
 </div>
 );
}
