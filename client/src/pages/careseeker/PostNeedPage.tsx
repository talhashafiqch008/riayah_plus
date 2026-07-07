
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/components/motion/variants';

import { useState } from 'react';
import { Plus, DollarSign, MapPin, Clock, Tag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { createCareNeed } from '@/lib/api/care-needs';


export default function PostCareNeedPage() {
 const [formData, setFormData] = useState({
 title: '',
 description: '',
 care_type: 'elderly_care',
 location: '',
 budget_min: '',
 budget_max: '',
 schedule_type: 'one_time' as 'one_time' | 'recurring' | 'flexible',
 preferred_start_date: '',
 preferred_end_date: '',
 });
 const [loading, setLoading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 await createCareNeed({
 ...formData,
 budget_min: formData.budget_min ? Number(formData.budget_min) : undefined,
 budget_max: formData.budget_max ? Number(formData.budget_max) : undefined,
 });
 toast.success('Care need posted successfully!');
 setFormData({
 title: '',
 description: '',
 care_type: 'elderly_care',
 location: '',
 budget_min: '',
 budget_max: '',
 schedule_type: 'one_time',
 preferred_start_date: '',
 preferred_end_date: '',
 });
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to post care need');
 }
 } finally {
 setLoading(false);
 }
 };

 return (
 <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8 max-w-2xl mx-auto p-4 md:p-8">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight flex items-center gap-3">
 <Plus className="size-8 text-teal-600" />
 Post a Care Need
 </h1>
 <p className="text-stone-500 mt-2 text-lg">
 Describe the care you need so providers can bid on it.
 </p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6 bg-white/90 backdrop-blur-xl rounded-3xl p-8 ring-1 ring-stone-200/50/60">
 <div>
 <label htmlFor="input-src-app-careseeker-marketplace-post-page-tsx-70-70" className="block text-sm font-medium text-stone-700 mb-2">Title</label>
 <input
 type="text"
 required
 value={formData.title}
 onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
 className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
 placeholder="e.g., Elderly care for my mother"
 />
 </div>

 <div>
 <label htmlFor="input-src-app-careseeker-marketplace-post-page-tsx-82-82" className="block text-sm font-medium text-stone-700 mb-2">Description</label>
 <textarea
 required
 rows={4}
 value={formData.description}
 onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
 className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
 placeholder="Describe the care needed in detail..."
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="input-src-app-careseeker-marketplace-post-page-tsx-95-95" className="block text-sm font-medium text-stone-700 mb-2">Care Type</label>
 <select
 value={formData.care_type}
 onChange={(e) => setFormData(prev => ({ ...prev, care_type: e.target.value }))}
 className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
 >
 <option value="elderly_care">Elderly Care</option>
 <option value="child_care">Child Care</option>
 <option value="special_needs">Special Needs</option>
 <option value="medical_care">Medical Care</option>
 <option value="companionship">Companionship</option>
 <option value="respite_care">Respite Care</option>
 <option value="hospice_care">Hospice Care</option>
 <option value="physical_therapy">Physical Therapy</option>
 <option value="dementia_care">Dementia Care</option>
 <option value="post_surgery">Post Surgery</option>
 <option value="other">Other</option>
 </select>
 </div>
 <div>
 <label htmlFor="input-src-app-careseeker-marketplace-post-page-tsx-115-115" className="block text-sm font-medium text-stone-700 mb-2">Schedule</label>
 <select
 value={formData.schedule_type}
 onChange={(e) => setFormData(prev => ({ ...prev, schedule_type: e.target.value as 'one_time' | 'recurring' | 'flexible' }))}
 className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
 >
 <option value="one_time">One Time</option>
 <option value="recurring">Recurring</option>
 <option value="flexible">Flexible</option>
 </select>
 </div>
 </div>

 <div>
 <label htmlFor="input-src-app-careseeker-marketplace-post-page-tsx-129-129" className="block text-sm font-medium text-stone-700 mb-2">Location</label>
 <input
 type="text"
 required
 value={formData.location}
 onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
 className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
 placeholder="e.g., Riyadh, Al Olaya"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="input-src-app-careseeker-marketplace-post-page-tsx-142-142" className="block text-sm font-medium text-stone-700 mb-2">Min Budget (SAR)</label>
 <input
 type="number"
 value={formData.budget_min}
 onChange={(e) => setFormData(prev => ({ ...prev, budget_min: e.target.value }))}
 className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
 placeholder="Optional"
 />
 </div>
 <div>
 <label htmlFor="input-src-app-careseeker-marketplace-post-page-tsx-152-152" className="block text-sm font-medium text-stone-700 mb-2">Max Budget (SAR)</label>
 <input
 type="number"
 value={formData.budget_max}
 onChange={(e) => setFormData(prev => ({ ...prev, budget_max: e.target.value }))}
 className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
 placeholder="Optional"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="input-src-app-careseeker-marketplace-post-page-tsx-165-165" className="block text-sm font-medium text-stone-700 mb-2">Preferred Start Date</label>
 <input
 type="date"
 value={formData.preferred_start_date}
 onChange={(e) => setFormData(prev => ({ ...prev, preferred_start_date: e.target.value }))}
 className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
 />
 </div>
 <div>
 <label htmlFor="input-src-app-careseeker-marketplace-post-page-tsx-174-174" className="block text-sm font-medium text-stone-700 mb-2">Preferred End Date</label>
 <input
 type="date"
 value={formData.preferred_end_date}
 onChange={(e) => setFormData(prev => ({ ...prev, preferred_end_date: e.target.value }))}
 className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
 />
 </div>
 </div>

 <Button
 type="submit"
 disabled={loading}
 className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl h-12"
 >
 {loading ? <Loader2 className="size-4 animate-spin" /> : 'Post Care Need'}
 </Button>
 </form>
 </motion.div>
 );
}
