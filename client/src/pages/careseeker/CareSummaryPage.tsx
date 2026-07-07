
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/components/motion/variants';

import { useState, useEffect , useRef } from 'react';
import { Link } from 'react-router-dom';
import {
 Heart,
 User,
 Users,
 Calendar,
 Phone,
 Clock,
 Shield,
 ChevronRight,
 Stethoscope,
 Home as HomeIcon,
 Brain,
 Pill,
 Star,
 Video,
 MapPin,
 Activity,
 FileText,
 CheckCircle,
 Download,
 Loader2,
 Award,
 AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getCareSummary } from '@/lib/api/careseeker';


interface AssignedProvider {
 id: string;
 name: string;
 avatar?: string;
 role: string;
 specialization: string;
 rating?: number;
 phone?: string;
 nextSession?: string;
}

interface CareData {
 careCategories: string[];
 careLevel: string;
 assignedProviders: AssignedProvider[];
 nextSession?: {
 id: string;
 provider: string;
 providerAvatar?: string;
 date: string;
 time: string;
 type: string;
 status: string;
 };
 emergencyContact: {
 name: string;
 relationship: string;
 phone: string;
 };
 carePlan?: {
 name: string;
 hoursPerWeek: number;
 startDate: string;
 status: string;
 };
 healthMetrics: {
 lastCheckup?: string;
 medications: number;
 appointments: number;
 };
}

export default function CareSummaryPage() {
 const { user } = useAuth();
 const [careData, setCareData] = useState<CareData | null>(null);
 const [isExporting, setIsExporting] = useState(false);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 async function fetchCareSummary() {
 try {
 setIsLoading(true);
 setError(null);
 const response = await getCareSummary();
 const data = response.data || response;
 if (data && typeof data === 'object') {
 setCareData({
 careCategories: data.careCategories || [],
 careLevel: data.careLevel || 'moderate',
 assignedProviders: data.assignedProviders || [],
 nextSession: data.nextSession,
 emergencyContact: data.emergencyContact || { name: '', relationship: '', phone: '' },
 carePlan: data.carePlan,
 healthMetrics: data.healthMetrics || { medications: 0, appointments: 0 },
 });
 } else {
 setCareData({
 careCategories: [],
 careLevel: 'moderate',
 assignedProviders: [],
 emergencyContact: { name: '', relationship: '', phone: '' },
 healthMetrics: { medications: 0, appointments: 0 },
 });
 }
 } catch (err) {
 console.error('Failed to fetch care summary', err);
 setError('Failed to load care summary. Please try again.');
 } finally {
 setIsLoading(false);
 }
 }

 fetchCareSummary();
 }, []);

 const handleExportPDF = async () => {
 if (!careData) return;
 setIsExporting(true);
 await new Promise(resolve => setTimeout(resolve, 1500));

 const pdfContent = `
RAIYAH PLUS - CARE SUMMARY REPORT
================================
Generated: ${new Date().toLocaleDateString()}

CARE SEEKER INFORMATION
-----------------------
Name: ${user?.firstName} ${user?.lastName}
Care Level: ${careData.careLevel}

ACTIVE CARE PLAN
----------------
Plan: ${careData.carePlan?.name}
Hours/Week: ${careData.carePlan?.hoursPerWeek}
Status: Active

CARE TEAM
---------
${careData.assignedProviders.map((p: AssignedProvider) => `- ${p.name} (${p.role}) - ${p.specialization}`).join('\n')}

EMERGENCY CONTACT
-----------------
Name: ${careData.emergencyContact.name}
Relationship: ${careData.emergencyContact.relationship}
Phone: ${careData.emergencyContact.phone}

HEALTH METRICS
--------------
Medications: ${careData.healthMetrics.medications}
Upcoming Appointments: ${careData.healthMetrics.appointments}
Last Checkup: ${careData.healthMetrics.lastCheckup}
 `;

 const blob = new Blob([pdfContent], { type: 'text/plain' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `care-summary-${new Date().toISOString().split('T')[0]}.txt`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);

 setIsExporting(false);
 };

 const careCategories = [
 { id: 'aged_care', name: 'Aged Care', icon: Heart, color: 'bg-rose-500' },
 { id: 'disability_support', name: 'Disability Support', icon: Users, color: 'bg-teal-500' },
 { id: 'child_family', name: 'Child & Family Support', icon: User, color: 'bg-blue-500' },
 { id: 'allied_health', name: 'Allied Health', icon: Award, color: 'bg-purple-500' },
 { id: 'home_support', name: 'Home Support', icon: HomeIcon, color: 'bg-amber-500' },
 ];

 const selectedCategories = careData ? careCategories.filter(c => careData.careCategories?.includes(c.id)) : [];

 if (isLoading) {
 return (
 <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600" />
 </motion.div>
 );
 }

 if (error) {
 return (
 <div className="space-y-6">
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
 </div>
 );
 }

 if (!careData) {
 return (
 <div className="text-center py-12">
 <p className="text-stone-600">No care summary data available.</p>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="bg-gradient-to-r from-teal-500 via-teal-600 to-blue-600 rounded-2xl p-6 text-white relative overflow-hidden">
 <div className="absolute top-0 right-0 size-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
 <div className="relative flex items-start justify-between">
 <div>
 <div className="flex items-center gap-3 mb-2">
 <Shield className="size-6" />
 <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
 Care Profile
 </span>
 </div>
 <h2 className="text-2xl font-semibold mb-1">Your Care Summary</h2>
 <p className="text-teal-100">Overview of your care needs and active services</p>
 </div>
 <Button
 onClick={handleExportPDF}
 disabled={isExporting}
 className="bg-white/20 hover:bg-white/30 text-white border-0"
 >
 {isExporting ? (
 <>
 <Loader2 className="size-4 mr-2 animate-spin" />
 Exporting&hellip;
 </>
 ) : (
 <>
 <Download className="size-4 mr-2" />
 Export PDF
 </>
 )}
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 space-y-6">
 {careData.carePlan && (
 <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-6 border border-teal-200">
 <div className="flex items-start justify-between">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <Activity className="size-5 text-teal-600" />
 <h3 className="text-lg font-semibold text-stone-900">Active Care Plan</h3>
 </div>
 <p className="text-xl font-semibold text-teal-700 mb-1">{careData.carePlan.name}</p>
 <p className="text-sm text-stone-600">{careData.carePlan.hoursPerWeek} hours per week</p>
 </div>
 <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
 <CheckCircle className="size-4" />
 Active
 </span>
 </div>
 <div className="mt-4 pt-4 border-t border-teal-200 flex items-center justify-between">
 <p className="text-sm text-stone-600">Started {new Date(careData.carePlan.startDate).toLocaleDateString()}</p>
 <Link to="/careseeker/bookings">
 <Button size="sm" variant="outline">View Schedule</Button>
 </Link>
 </div>
 </div>
 )}

 <div className="bg-white rounded-xl p-6 ring-1 ring-stone-200/50 ">
 <h3 className="text-lg font-semibold text-stone-900 mb-4">Selected Care Categories</h3>
 {selectedCategories.length === 0 ? (
 <div className="text-center py-6">
 <p className="text-sm text-stone-500">No care categories selected.</p>
 <Link to="/careseeker/settings">
 <Button size="sm" className="mt-2">Update Preferences</Button>
 </Link>
 </div>
 ) : (
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
 {selectedCategories.map((category) => (
 <div
 key={category.id}
 className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg ring-1 ring-stone-200/50"
 >
 <div className={`size-10 ${category.color} rounded-lg flex items-center justify-center`}>
 <category.icon className="size-5 text-white" />
 </div>
 <span className="text-sm font-medium text-stone-700">{category.name}</span>
 </div>
 ))}
 </div>
 )}
 <Link
 to="/careseeker/settings"
 className="inline-flex items-center gap-1 mt-4 text-sm text-teal-600 hover:text-teal-700 font-medium"
 >
 Edit Care Needs
 <ChevronRight className="size-4" />
 </Link>
 </div>

 <div className="bg-white rounded-xl p-6 ring-1 ring-stone-200/50 ">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-stone-900">Your Care Team</h3>
 <Link to="/careseeker/providers" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
 Add Provider
 </Link>
 </div>
 {careData.assignedProviders.length === 0 ? (
 <div className="text-center py-8">
 <div className="size-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
 <User className="size-7 text-stone-400" />
 </div>
 <p className="text-stone-600 font-medium">No providers assigned yet</p>
 <p className="text-sm text-stone-500 mt-1">Search and connect with care professionals</p>
 <Link to="/careseeker/providers">
 <Button className="mt-4" size="sm">Find Providers</Button>
 </Link>
 </div>
 ) : (
 <div className="space-y-3">
 {careData.assignedProviders.map((provider: AssignedProvider) => (
 <div key={provider.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
 <div className="flex items-center gap-4">
 <div className="size-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
 {provider.avatar}
 </div>
 <div>
 <div className="flex items-center gap-2">
 <p className="font-semibold text-stone-900">{provider.name}</p>
 <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">{provider.role}</span>
 </div>
 <p className="text-sm text-stone-500">{provider.specialization}</p>
 <div className="flex items-center gap-3 mt-1 text-sm text-stone-500">
 <div className="flex items-center gap-1">
 <Star className="size-4 text-yellow-400 fill-current" />
 <span>{provider.rating}</span>
 </div>
 <span>&bull;</span>
 <div className="flex items-center gap-1">
 <Clock className="size-3" />
 <span>{provider.nextSession}</span>
 </div>
 </div>
 </div>
 </div>
 <div className="flex gap-2">
 <Button variant="ghost" size="sm">
 <Phone className="size-4" />
 </Button>
 <Link to="/careseeker/messages">
 <Button variant="outline" size="sm">Message</Button>
 </Link>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="bg-white rounded-xl p-6 ring-1 ring-stone-200/50 ">
 <h3 className="text-lg font-semibold text-stone-900 mb-4">Care Overview</h3>
 <div className="grid grid-cols-3 gap-4">
 <div className="p-4 bg-stone-50 rounded-lg text-center">
 <FileText className="size-6 text-teal-600 mx-auto mb-2" />
 <p className="text-2xl font-bold text-stone-900">{careData.healthMetrics?.medications || 0}</p>
 <p className="text-sm text-stone-500">Medication Reminders</p>
 </div>
 <div className="p-4 bg-stone-50 rounded-lg text-center">
 <Calendar className="size-6 text-blue-600 mx-auto mb-2" />
 <p className="text-2xl font-bold text-stone-900">{careData.healthMetrics?.appointments || 0}</p>
 <p className="text-sm text-stone-500">Upcoming Sessions</p>
 </div>
 <div className="p-4 bg-stone-50 rounded-lg text-center">
 <Activity className="size-6 text-purple-600 mx-auto mb-2" />
 <p className="text-lg font-bold text-stone-900">
 {careData.healthMetrics?.lastCheckup
 ? new Date(careData.healthMetrics.lastCheckup).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
 : 'N/A'}
 </p>
 <p className="text-sm text-stone-500">Last Session</p>
 </div>
 </div>
 </div>
 </div>

 <div className="space-y-6">
 <div className="bg-white rounded-xl p-6 ring-1 ring-stone-200/50 ">
 <h3 className="text-lg font-semibold text-stone-900 mb-4">Next Session</h3>
 {careData.nextSession ? (
 <div>
 <div className="flex items-center gap-3 mb-4">
 <div className="size-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
 {careData.nextSession.providerAvatar}
 </div>
 <div>
 <p className="font-semibold text-stone-900">{careData.nextSession.provider}</p>
 <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit ${careData.nextSession.type === 'video' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700' }`}>
 {careData.nextSession.type === 'video' ? <Video className="size-3" /> : <MapPin className="size-3" />}
 <span className="capitalize">{careData.nextSession.type}</span>
 </div>
 </div>
 </div>
 <div className="space-y-2 text-sm">
 <div className="flex items-center gap-2 text-stone-600">
 <Calendar className="size-4 text-stone-400" />
 <span>{careData.nextSession.date}</span>
 </div>
 <div className="flex items-center gap-2 text-stone-600">
 <Clock className="size-4 text-stone-400" />
 <span>{careData.nextSession.time}</span>
 </div>
 </div>
 <div className="flex gap-2 mt-4">
 {careData.nextSession.type === 'video' && (
 <Button size="sm" className="flex-1">
 <Video className="size-4 mr-1" />
 Join
 </Button>
 )}
 <Link to="/careseeker/bookings" className="flex-1">
 <Button variant="outline" size="sm" className="w-full">View Details</Button>
 </Link>
 </div>
 </div>
 ) : (
 <div className="text-center py-6">
 <div className="size-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
 <Calendar className="size-6 text-stone-400" />
 </div>
 <p className="text-sm text-stone-600">No upcoming sessions</p>
 <Link to="/careseeker/providers">
 <Button size="sm" className="mt-3">Book a Session</Button>
 </Link>
 </div>
 )}
 </div>

 <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border border-red-100">
 <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
 <Phone className="size-5 text-red-500" />
 Emergency Contact
 </h3>
 <div className="space-y-3">
 <div>
 <p className="text-sm text-stone-500">Name</p>
 <p className="font-medium text-stone-900">{careData.emergencyContact.name || 'Not set'}</p>
 </div>
 <div>
 <p className="text-sm text-stone-500">Relationship</p>
 <p className="font-medium text-stone-900">{careData.emergencyContact.relationship || 'Not set'}</p>
 </div>
 <div>
 <p className="text-sm text-stone-500">Phone</p>
 {careData.emergencyContact.phone ? (
 <a
 href={`tel:${careData.emergencyContact.phone}`}
 className="font-medium text-teal-600 hover:text-teal-700"
 >
 {careData.emergencyContact.phone}
 </a>
 ) : (
 <p className="font-medium text-stone-500">Not set</p>
 )}
 </div>
 </div>
 <Link
 to="/careseeker/settings"
 className="inline-flex items-center gap-1 mt-4 text-sm text-stone-600 hover:text-stone-900"
 >
 Update Contact
 <ChevronRight className="size-4" />
 </Link>
 </div>

 <div className="bg-white rounded-xl p-6 ring-1 ring-stone-200/50 ">
 <h3 className="text-lg font-semibold text-stone-900 mb-4">Care Level</h3>
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-sm text-stone-600">Required support level</span>
 <span className="text-sm font-medium text-stone-900 capitalize">{careData.careLevel}</span>
 </div>
 <div className="h-3 bg-stone-200 rounded-full overflow-hidden">
 <div
 className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-transform duration-300"
 style={{ width: careData.careLevel === 'low' ? '33%' : careData.careLevel === 'moderate' ? '66%' : '100%' }}
 />
 </div>
 <div className="flex justify-between text-xs text-stone-500">
 <span>Low</span>
 <span>Moderate</span>
 <span>High</span>
 </div>
 </div>
 <p className="text-xs text-stone-500 mt-3">
 Based on your assessment answers
 </p>
 </div>
 </div>
 </div>
 </div>
 );
}
