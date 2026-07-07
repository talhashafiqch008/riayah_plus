
import { useState, useEffect } from 'react';
import {
 CheckSquare, Clock, AlertCircle, CheckCircle, Plus, User,
 Calendar, MapPin, ChevronRight, Flag, FileText, Camera,
 MessageCircle, AlertTriangle, X, Filter, Heart, Activity,
 Thermometer, Droplet, Pill, Stethoscope, ClipboardList,
 Image, Car, Utensils, Sparkles, Brain, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { STORAGE_KEYS } from '@/lib/storage-keys';




// Role detection helper
const getRoleInfo = () => {
 if (typeof window === 'undefined') return { role: 'SUPPORT_WORKER', roleCategory: 'SUPPORT' };

 try {
 // Try to get from onboarding draft first (most accurate)
 const draft = localStorage.getItem(STORAGE_KEYS.providerOnboardingDraft);
 if (draft) {
 const parsed = JSON.parse(draft);
 if (parsed.data?.role) {
 return {
 role: parsed.data.role,
 roleCategory: parsed.data.roleCategory || 'SUPPORT'
 };
 }
 }

 // Fallback to user data
 const userData = localStorage.getItem(STORAGE_KEYS.user);
 if (userData) {
 const user = JSON.parse(userData);
 return {
 role: user.role?.toUpperCase() || 'SUPPORT_WORKER',
 roleCategory: ['DOCTOR', 'NURSE', 'ALLIED_HEALTH'].includes(user.role?.toUpperCase()) ? 'CLINICAL' : 'SUPPORT'
 };
 }
 } catch (e) {
 console.error('Error getting role info:', e);
 }

 return { role: 'SUPPORT_WORKER', roleCategory: 'SUPPORT' };
};

interface Task {
 id: string;
 title: string;
 description: string;
 patientName: string;
 patientAvatar: string;
 dueDate: string;
 dueTime?: string;
 priority: 'low' | 'medium' | 'high' | 'urgent';
 status: 'pending' | 'in-progress' | 'completed' | 'overdue';
 category: 'medication' | 'hygiene' | 'mobility' | 'nutrition' | 'documentation' | 'clinical' | 'cleaning' | 'other';
 notes?: string;
}

// Role-specific mock tasks
const getTasksForRole = (role: string): Task[] => {
 const baseTasks: Task[] = [
 {
 id: '1',
 title: 'Submit daily care report',
 description: 'Document all activities and observations',
 patientName: 'Mohammed Al-Rashid',
 patientAvatar: 'MA',
 dueDate: 'Today',
 dueTime: '05:00 PM',
 priority: 'low',
 status: 'pending',
 category: 'documentation',
 },
 ];

 switch (role) {
 case 'DOCTOR':
 case 'ALLIED_HEALTH':
 return [
 {
 id: '1',
 title: 'Telehealth consultation',
 description: 'Follow-up appointment for diabetes management',
 patientName: 'Mohammed Al-Rashid',
 patientAvatar: 'MA',
 dueDate: 'Today',
 dueTime: '10:00 AM',
 priority: 'high',
 status: 'pending',
 category: 'clinical',
 },
 {
 id: '2',
 title: 'Review lab results & prescribe',
 description: 'Blood work results need review, may need medication adjustment',
 patientName: 'Fatima Al-Hassan',
 patientAvatar: 'FA',
 dueDate: 'Today',
 dueTime: '11:30 AM',
 priority: 'high',
 status: 'pending',
 category: 'clinical',
 },
 {
 id: '3',
 title: 'Write referral letter',
 description: 'Referral to cardiologist for further evaluation',
 patientName: 'Ahmed Sayeed',
 patientAvatar: 'AS',
 dueDate: 'Today',
 dueTime: '02:00 PM',
 priority: 'medium',
 status: 'in-progress',
 category: 'documentation',
 },
 ...baseTasks,
 ];

 case 'NURSE':
 return [
 {
 id: '1',
 title: 'Administer morning medication',
 description: 'Blood pressure and diabetes medication with breakfast',
 patientName: 'Mohammed Al-Rashid',
 patientAvatar: 'MA',
 dueDate: 'Today',
 dueTime: '09:00 AM',
 priority: 'high',
 status: 'completed',
 category: 'medication',
 },
 {
 id: '2',
 title: 'Record vital signs',
 description: 'BP, Heart Rate, SpO2, Temperature',
 patientName: 'Fatima Al-Hassan',
 patientAvatar: 'FA',
 dueDate: 'Today',
 dueTime: '10:00 AM',
 priority: 'high',
 status: 'in-progress',
 category: 'clinical',
 },
 {
 id: '3',
 title: 'Wound dressing change',
 description: 'Change bandage on left knee surgical site',
 patientName: 'Ahmed Sayeed',
 patientAvatar: 'AS',
 dueDate: 'Today',
 dueTime: '11:00 AM',
 priority: 'urgent',
 status: 'pending',
 category: 'clinical',
 },
 {
 id: '4',
 title: 'Administer insulin injection',
 description: '10 units before lunch as prescribed',
 patientName: 'Mohammed Al-Rashid',
 patientAvatar: 'MA',
 dueDate: 'Today',
 dueTime: '12:00 PM',
 priority: 'high',
 status: 'pending',
 category: 'medication',
 },
 ...baseTasks,
 ];

 case 'CLEANER':
 case 'GARDENER':
 return [
 {
 id: '1',
 title: 'Deep clean living room',
 description: 'Vacuum, dust, mop floors, clean windows',
 patientName: 'Al-Rashid Residence',
 patientAvatar: 'AR',
 dueDate: 'Today',
 dueTime: '09:00 AM',
 priority: 'medium',
 status: 'completed',
 category: 'cleaning',
 },
 {
 id: '2',
 title: 'Kitchen sanitization',
 description: 'Clean counters, appliances, and organize pantry',
 patientName: 'Al-Rashid Residence',
 patientAvatar: 'AR',
 dueDate: 'Today',
 dueTime: '11:00 AM',
 priority: 'high',
 status: 'in-progress',
 category: 'cleaning',
 },
 {
 id: '3',
 title: 'Bathroom cleaning',
 description: 'Disinfect and deep clean all bathrooms',
 patientName: 'Al-Rashid Residence',
 patientAvatar: 'AR',
 dueDate: 'Today',
 dueTime: '02:00 PM',
 priority: 'medium',
 status: 'pending',
 category: 'cleaning',
 },
 ...baseTasks,
 ];

 default: // SUPPORT_WORKER
 return [
 {
 id: '1',
 title: 'Morning routine assistance',
 description: 'Help with personal hygiene, dressing, and breakfast',
 patientName: 'Mohammed Al-Rashid',
 patientAvatar: 'MA',
 dueDate: 'Today',
 dueTime: '08:00 AM',
 priority: 'high',
 status: 'completed',
 category: 'hygiene',
 },
 {
 id: '2',
 title: 'Physical therapy exercises',
 description: 'Assist with 20-minute stretching routine',
 patientName: 'Ahmed Sayeed',
 patientAvatar: 'AS',
 dueDate: 'Today',
 dueTime: '10:30 AM',
 priority: 'medium',
 status: 'in-progress',
 category: 'mobility',
 },
 {
 id: '3',
 title: 'Prepare and serve lunch',
 description: 'Low-sodium meal as per dietary plan',
 patientName: 'Fatima Al-Hassan',
 patientAvatar: 'FA',
 dueDate: 'Today',
 dueTime: '12:00 PM',
 priority: 'medium',
 status: 'pending',
 category: 'nutrition',
 },
 {
 id: '4',
 title: 'Companionship activity',
 description: 'Engage in conversation, games, or reading',
 patientName: 'Mohammed Al-Rashid',
 patientAvatar: 'MA',
 dueDate: 'Today',
 dueTime: '03:00 PM',
 priority: 'low',
 status: 'pending',
 category: 'other',
 },
 ...baseTasks,
 ];
 }
};

// ============ ROLE-SPECIFIC COMPONENTS ============

// Doctor/Clinician: Medical Notes & Prescriptions
function DoctorNotesSection() {
 const [notes, setNotes] = useState('');
 const [prescriptions, setPrescriptions] = useState([
 { id: 1, medication: 'Metformin 500mg', dosage: 'Twice daily with meals', duration: '30 days' },
 { id: 2, medication: 'Lisinopril 10mg', dosage: 'Once daily', duration: '30 days' },
 ]);

 return (
 <div className="bg-white rounded-xl border border-teal-200 overflow-hidden">
 <div className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 border-b border-teal-100">
 <div className="flex items-center gap-2">
 <Stethoscope className="size-5 text-teal-600" />
 <h3 className="font-semibold text-stone-900">Clinical Tools</h3>
 <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">Doctor</span>
 </div>
 </div>
 <div className="p-4 space-y-4">
 {/* Quick Actions */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
 <button className="p-3 bg-teal-50 rounded-lg text-center hover:bg-teal-100 transition-colors">
 <FileText className="size-5 text-teal-600 mx-auto mb-1" />
 <span className="text-xs font-medium text-stone-700">Medical Note</span>
 </button>
 <button className="p-3 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition-colors">
 <Pill className="size-5 text-blue-600 mx-auto mb-1" />
 <span className="text-xs font-medium text-stone-700">Prescription</span>
 </button>
 <button className="p-3 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition-colors">
 <ChevronRight className="size-5 text-purple-600 mx-auto mb-1" />
 <span className="text-xs font-medium text-stone-700">Referral</span>
 </button>
 <button className="p-3 bg-amber-50 rounded-lg text-center hover:bg-amber-100 transition-colors">
 <ClipboardList className="size-5 text-amber-600 mx-auto mb-1" />
 <span className="text-xs font-medium text-stone-700">Lab Order</span>
 </button>
 </div>

 {/* Active Prescriptions */}
 <div>
 <h4 className="text-sm font-semibold text-stone-700 mb-2">Today's Prescriptions</h4>
 <div className="space-y-2">
 {prescriptions.map((rx) => (
 <div key={rx.id} className="p-3 bg-stone-50 rounded-lg flex items-center justify-between">
 <div>
 <p className="font-medium text-stone-900">{rx.medication}</p>
 <p className="text-sm text-stone-500">{rx.dosage} • {rx.duration}</p>
 </div>
 <CheckCircle className="size-5 text-green-500" />
 </div>
 ))}
 </div>
 </div>

 {/* Quick Note */}
 <div>
 <label htmlFor="quick-medical-note" className="block text-sm font-medium text-stone-700 mb-1">Quick Medical Note</label>
 <textarea id="quick-medical-note"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Type your medical notes here..."
 className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
 rows={3}
 />
 <Button size="sm" className="mt-2">Save Note</Button>
 </div>
 </div>
 </div>
 );
}

// Nurse: Vitals Recording
function NurseVitalsSection() {
 const [vitals, setVitals] = useState({
 bloodPressure: '',
 heartRate: '',
 temperature: '',
 spO2: '',
 bloodSugar: '',
 });

 const recentVitals = [
 { time: '08:00 AM', bp: '120/80', hr: '72', temp: '36.5°C', spo2: '98%' },
 { time: '12:00 PM', bp: '118/78', hr: '75', temp: '36.6°C', spo2: '97%' },
 ];

 return (
 <div className="bg-white rounded-xl border border-pink-200 overflow-hidden">
 <div className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100">
 <div className="flex items-center gap-2">
 <Activity className="size-5 text-pink-600" />
 <h3 className="font-semibold text-stone-900">Clinical Nursing Tools</h3>
 <span className="text-xs px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full">Nurse</span>
 </div>
 </div>
 <div className="p-4 space-y-4">
 {/* Quick Actions */}
 <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
 <button className="p-3 bg-red-50 rounded-lg text-center hover:bg-red-100 transition-colors">
 <Heart className="size-5 text-red-500 mx-auto mb-1" />
 <span className="text-xs font-medium text-stone-700">Vitals</span>
 </button>
 <button className="p-3 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition-colors">
 <Pill className="size-5 text-blue-600 mx-auto mb-1" />
 <span className="text-xs font-medium text-stone-700">Medication</span>
 </button>
 <button className="p-3 bg-amber-50 rounded-lg text-center hover:bg-amber-100 transition-colors">
 <Droplet className="size-5 text-amber-600 mx-auto mb-1" />
 <span className="text-xs font-medium text-stone-700">Wound Care</span>
 </button>
 <button className="p-3 bg-green-50 rounded-lg text-center hover:bg-green-100 transition-colors">
 <Thermometer className="size-5 text-green-600 mx-auto mb-1" />
 <span className="text-xs font-medium text-stone-700">Blood Sugar</span>
 </button>
 <button className="p-3 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition-colors">
 <FileText className="size-5 text-purple-600 mx-auto mb-1" />
 <span className="text-xs font-medium text-stone-700">Notes</span>
 </button>
 </div>

 {/* Vitals Input */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
 <div>
 <label htmlFor="blood-pressure" className="block text-xs font-medium text-stone-500 mb-1">Blood Pressure</label>
 <input id="blood-pressure"
 type="text"
 placeholder="120/80"
 value={vitals.bloodPressure}
 onChange={(e) => setVitals(prev => ({...prev, bloodPressure: e.target.value }))}
 className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
 />
 </div>
 <div>
 <label htmlFor="heart-rate" className="block text-xs font-medium text-stone-500 mb-1">Heart Rate</label>
 <input id="heart-rate"
 type="text"
 placeholder="72 bpm"
 value={vitals.heartRate}
 onChange={(e) => setVitals(prev => ({...prev, heartRate: e.target.value }))}
 className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
 />
 </div>
 <div>
 <label htmlFor="temperature" className="block text-xs font-medium text-stone-500 mb-1">Temperature</label>
 <input id="temperature"
 type="text"
 placeholder="36.5°C"
 value={vitals.temperature}
 onChange={(e) => setVitals(prev => ({...prev, temperature: e.target.value }))}
 className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
 />
 </div>
 <div>
 <label htmlFor="spo2" className="block text-xs font-medium text-stone-500 mb-1">SpO2</label>
 <input id="spo2"
 type="text"
 placeholder="98%"
 value={vitals.spO2}
 onChange={(e) => setVitals(prev => ({...prev, spO2: e.target.value }))}
 className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
 />
 </div>
 <div>
 <label htmlFor="blood-sugar" className="block text-xs font-medium text-stone-500 mb-1">Blood Sugar</label>
 <input id="blood-sugar"
 type="text"
 placeholder="120 mg/dL"
 value={vitals.bloodSugar}
 onChange={(e) => setVitals(prev => ({...prev, bloodSugar: e.target.value }))}
 className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
 />
 </div>
 </div>
 <Button size="sm">Record Vitals</Button>

 {/* Recent Vitals */}
 <div>
 <h4 className="text-sm font-semibold text-stone-700 mb-2">Today's Readings</h4>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-stone-50">
 <th className="px-3 py-2 text-left text-stone-600">Time</th>
 <th className="px-3 py-2 text-left text-stone-600">BP</th>
 <th className="px-3 py-2 text-left text-stone-600">HR</th>
 <th className="px-3 py-2 text-left text-stone-600">Temp</th>
 <th className="px-3 py-2 text-left text-stone-600">SpO2</th>
 </tr>
 </thead>
 <tbody>
 {recentVitals.map((v) => (
 <tr key={v.time} className="border-t border-stone-100">
 <td className="px-3 py-2 text-stone-700">{v.time}</td>
 <td className="px-3 py-2 text-stone-900 font-medium">{v.bp}</td>
 <td className="px-3 py-2 text-stone-900">{v.hr}</td>
 <td className="px-3 py-2 text-stone-900">{v.temp}</td>
 <td className="px-3 py-2 text-stone-900">{v.spo2}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </div>
 );
}

// Support Worker: Activity & Behaviour Logs
function SupportWorkerSection() {
 const [activityLog, setActivityLog] = useState('');
 const [mood, setMood] = useState('');

 const moodOptions = ['😊 Happy', '😐 Neutral', '😔 Sad', '😤 Agitated', '😴 Tired'];

 return (
 <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
 <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
 <div className="flex items-center gap-2">
 <Heart className="size-5 text-amber-600" />
 <h3 className="font-semibold text-stone-900">Support Tools</h3>
 <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Support Worker</span>
 </div>
 </div>
 <div className="p-4 space-y-4">
 {/* Quick Actions */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
 <button className="p-3 bg-amber-50 rounded-lg text-center hover:bg-amber-100 transition-colors">
 <ClipboardList className="size-5 text-amber-600 mx-auto mb-1" />
 <span className="text-xs font-medium text-stone-700">Activity Log</span>
 </button>
 <button className="p-3 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition-colors">
 <Brain className="size-5 text-purple-600 mx-auto mb-1" />
 <span className="text-xs font-medium text-stone-700">Behaviour</span>
 </button>
 <button className="p-3 bg-green-50 rounded-lg text-center hover:bg-green-100 transition-colors">
 <TrendingUp className="size-5 text-green-600 mx-auto mb-1" />
 <span className="text-xs font-medium text-stone-700">Progress</span>
 </button>
 <button className="p-3 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition-colors">
 <Car className="size-5 text-blue-600 mx-auto mb-1" />
 <span className="text-xs font-medium text-stone-700">Transport</span>
 </button>
 </div>

 {/* Mood Tracker */}
 <div>
 <span className="block text-sm font-medium text-stone-700 mb-2">Client Mood</span>
 <div className="flex flex-wrap gap-2">
 {moodOptions.map((m) => (
 <button
 key={m}
 onClick={() => setMood(m)}
 className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${mood === m ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200' }`}
 >
 {m}
 </button>
 ))}
 </div>
 </div>

 {/* Activity Log */}
 <div>
 <label htmlFor="daily-activity-log" className="block text-sm font-medium text-stone-700 mb-1">Daily Activity Log</label>
 <textarea id="daily-activity-log"
 value={activityLog}
 onChange={(e) => setActivityLog(e.target.value)}
 placeholder="Document activities, progress, and observations..."
 className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
 rows={3}
 />
 <Button size="sm" className="mt-2 bg-amber-600 hover:bg-amber-700">Save Activity Log</Button>
 </div>
 </div>
 </div>
 );
}

// Cleaner/Gardener: Photo Checklist
function CleanerChecklistSection() {
 const [checklist, setChecklist] = useState([
 { id: 1, task: 'Living Room - Vacuumed', completed: true },
 { id: 2, task: 'Living Room - Dusted', completed: true },
 { id: 3, task: 'Kitchen - Counters cleaned', completed: false },
 { id: 4, task: 'Kitchen - Appliances wiped', completed: false },
 { id: 5, task: 'Bathroom - Disinfected', completed: false },
 ]);

 const toggleTask = (id: number) => {
 setChecklist(checklist.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
 };

 return (
 <div className="bg-white rounded-xl border border-green-200 overflow-hidden">
 <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
 <div className="flex items-center gap-2">
 <Sparkles className="size-5 text-green-600" />
 <h3 className="font-semibold text-stone-900">Cleaning Checklist</h3>
 <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Cleaner</span>
 </div>
 </div>
 <div className="p-4 space-y-4">
 {/* Photo Upload */}
 <div className="grid grid-cols-2 gap-3">
 <div className="p-4 border-2 border-dashed border-stone-200 rounded-xl text-center hover:border-green-400 transition-colors cursor-pointer">
 <Camera className="size-8 text-stone-400 mx-auto mb-2" />
 <p className="text-sm font-medium text-stone-600">Before Photo</p>
 <p className="text-xs text-stone-400">Tap to upload</p>
 </div>
 <div className="p-4 border-2 border-dashed border-stone-200 rounded-xl text-center hover:border-green-400 transition-colors cursor-pointer">
 <img className="size-8 text-stone-400 mx-auto mb-2" loading="lazy" />
 <p className="text-sm font-medium text-stone-600">After Photo</p>
 <p className="text-xs text-stone-400">Tap to upload</p>
 </div>
 </div>

 {/* Checklist */}
 <div>
 <h4 className="text-sm font-semibold text-stone-700 mb-2">Task Checklist</h4>
 <div className="space-y-2">
 {checklist.map((item) => (
 <div role="button" tabIndex={0}
 key={item.id}
 onClick={() => toggleTask(item.id)}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors"
 >
 <div className={`size-5 rounded-full border-2 flex items-center justify-center ${item.completed ? 'bg-green-500 border-green-500' : 'border-stone-300' }`}>
 {item.completed && <CheckCircle className="size-3 text-white" />}
 </div>
 <span className={item.completed ? 'text-stone-400 line-through' : 'text-stone-700'}>
 {item.task}
 </span>
 </div>
 ))}
 </div>
 </div>

 {/* Completion */}
 <div className="pt-3 border-t border-stone-100">
 <div className="flex items-center justify-between mb-3">
 <span className="text-sm text-stone-600">Progress</span>
 <span className="text-sm font-bold text-green-600">
 {checklist.filter(t => t.completed).length}/{checklist.length} completed
 </span>
 </div>
 <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
 <div
 className="h-full bg-green-500 transition-all"
 style={{ width: `${(checklist.filter(t => t.completed).length / checklist.length) * 100}%` }}
 />
 </div>
 <Button size="sm" className="mt-3 w-full bg-green-600 hover:bg-green-700">
 Mark Job Complete
 </Button>
 </div>
 </div>
 </div>
 );
}

// ============ MAIN TASKS PAGE ============

export default function TasksPage() {
 const { user } = useAuth();
 const [roleInfo, setRoleInfo] = useState({ role: 'SUPPORT_WORKER', roleCategory: 'SUPPORT' });
 const [tasks, setTasks] = useState<Task[]>([]);
 const [filter, setFilter] = useState<string>('all');
 const [showIncidentForm, setShowIncidentForm] = useState(false);

 // Get role info on mount
 useEffect(() => {
 const info = getRoleInfo();
 setRoleInfo(info);
 setTasks(getTasksForRole(info.role));
 }, []);

 const filteredTasks = tasks.filter(t => {
 if (filter === 'all') return true;
 if (filter === 'overdue') return t.status === 'overdue';
 if (filter === 'today') return t.dueDate === 'Today';
 return t.status === filter;
 });

 const stats = {
 total: tasks.length,
 pending: tasks.filter(t => t.status === 'pending').length,
 inProgress: tasks.filter(t => t.status === 'in-progress').length,
 completed: tasks.filter(t => t.status === 'completed').length,
 overdue: tasks.filter(t => t.status === 'overdue').length,
 };

 const getPriorityConfig = (priority: string) => {
 switch (priority) {
 case 'urgent': return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle };
 case 'high': return { bg: 'bg-orange-100', text: 'text-orange-700', icon: Flag };
 case 'medium': return { bg: 'bg-amber-100', text: 'text-amber-700', icon: Flag };
 case 'low': return { bg: 'bg-stone-100', text: 'text-stone-700', icon: Flag };
 default: return { bg: 'bg-stone-100', text: 'text-stone-700', icon: Flag };
 }
 };

 const getStatusConfig = (status: string) => {
 switch (status) {
 case 'completed': return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle };
 case 'in-progress': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock };
 case 'overdue': return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle };
 default: return { bg: 'bg-stone-100', text: 'text-stone-700', icon: Clock };
 }
 };

 const getCategoryIcon = (category: string) => {
 switch (category) {
 case 'medication': return '💊';
 case 'hygiene': return '🧼';
 case 'mobility': return '🚶';
 case 'nutrition': return '🍽️';
 case 'documentation': return '📝';
 case 'clinical': return '🩺';
 case 'cleaning': return '🧹';
 default: return '📋';
 }
 };

 const handleCompleteTask = (id: string) => {
 setTasks(tasks.map(t => t.id === id ? { ...t, status: 'completed' as const } : t));
 };

 const handleStartTask = (id: string) => {
 setTasks(tasks.map(t => t.id === id ? { ...t, status: 'in-progress' as const } : t));
 };

 const getRoleDisplayName = () => {
 switch (roleInfo.role) {
 case 'DOCTOR': return 'Doctor / Clinician';
 case 'NURSE': return 'Nurse';
 case 'ALLIED_HEALTH': return 'Allied Health';
 case 'SUPPORT_WORKER': return 'Support Worker';
 case 'CLEANER': return 'Cleaner';
 case 'GARDENER': return 'Gardener';
 default: return 'Provider';
 }
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <h2 className="text-2xl font-semibold text-stone-900">Tasks</h2>
 <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleInfo.roleCategory === 'CLINICAL' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700' }`}>
 {getRoleDisplayName()}
 </span>
 </div>
 <p className="text-stone-600">Manage care tasks and document activities</p>
 </div>
 <div className="flex gap-3">
 <Button variant="outline" onClick={() => setShowIncidentForm(true)}>
 <AlertTriangle className="size-4 mr-2" />
 Report Incident
 </Button>
 <Button>
 <Plus className="size-4 mr-2" />
 Add Task
 </Button>
 </div>
 </div>

 {/* Role-Specific Section */}
 {roleInfo.role === 'DOCTOR' || roleInfo.role === 'ALLIED_HEALTH' ? (
 <DoctorNotesSection />
 ) : roleInfo.role === 'NURSE' ? (
 <NurseVitalsSection />
 ) : roleInfo.role === 'CLEANER' || roleInfo.role === 'GARDENER' ? (
 <CleanerChecklistSection />
 ) : (
 <SupportWorkerSection />
 )}

 {/* Overdue Alert */}
 {stats.overdue > 0 && (
 <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-red-100 rounded-lg">
 <AlertCircle className="size-5 text-red-600" />
 </div>
 <div>
 <p className="font-semibold text-red-900">{stats.overdue} Overdue Task{stats.overdue > 1 ? 's' : ''}</p>
 <p className="text-sm text-red-700">Please complete or reschedule these tasks immediately</p>
 </div>
 </div>
 <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => setFilter('overdue')}>
 View Overdue
 </Button>
 </div>
 )}

 {/* Stats */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
 <div className="bg-white rounded-xl p-4 border border-stone-200 text-center">
 <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
 <p className="text-xs text-stone-500">Total</p>
 </div>
 <div className="bg-white rounded-xl p-4 border border-stone-200 text-center">
 <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
 <p className="text-xs text-stone-500">Pending</p>
 </div>
 <div className="bg-white rounded-xl p-4 border border-stone-200 text-center">
 <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
 <p className="text-xs text-stone-500">In Progress</p>
 </div>
 <div className="bg-white rounded-xl p-4 border border-stone-200 text-center">
 <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
 <p className="text-xs text-stone-500">Completed</p>
 </div>
 <div className="bg-white rounded-xl p-4 border border-red-200 text-center">
 <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
 <p className="text-xs text-stone-500">Overdue</p>
 </div>
 </div>

 {/* Filters */}
 <div className="bg-white rounded-xl p-4 border border-stone-200">
 <div className="flex gap-2 flex-wrap">
 {[
 { id: 'all', label: 'All Tasks' },
 { id: 'today', label: 'Today' },
 { id: 'pending', label: 'Pending' },
 { id: 'in-progress', label: 'In Progress' },
 { id: 'completed', label: 'Completed' },
 { id: 'overdue', label: 'Overdue' },
 ].map((f) => (
 <button
 key={f.id}
 onClick={() => setFilter(f.id)}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.id ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200' }`}
 >
 {f.label}
 </button>
 ))}
 </div>
 </div>

 {/* Tasks List */}
 {filteredTasks.length === 0 ? (
 <div className="bg-white rounded-xl p-12 border border-stone-200 text-center">
 <CheckSquare className="size-16 text-stone-300 mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-stone-900 mb-2">No tasks found</h3>
 <p className="text-stone-600">Great job! All tasks are completed.</p>
 </div>
 ) : (
 <div className="space-y-3">
 {filteredTasks.map((task) => {
 const priorityConfig = getPriorityConfig(task.priority);
 const statusConfig = getStatusConfig(task.status);
 const StatusIcon = statusConfig.icon;

 return (
 <div
 key={task.id}
 className={`bg-white rounded-xl p-5 border shadow-sm transition-all ${task.status === 'overdue' ? 'border-red-200' : task.status === 'completed' ? 'border-green-200 opacity-70' : 'border-stone-200 hover:border-teal-200' }`}
 >
 <div className="flex items-start gap-4">
 {/* Checkbox */}
 <button
 onClick={() => task.status !== 'completed' && handleCompleteTask(task.id)}
 className={`mt-1 size-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${task.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-stone-300 hover:border-teal-500' }`}
 >
 {task.status === 'completed' && <CheckCircle className="size-4 text-white" />}
 </button>

 {/* Task Content */}
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="text-lg">{getCategoryIcon(task.category)}</span>
 <h4 className={`font-semibold ${task.status === 'completed' ? 'text-stone-400 line-through' : 'text-stone-900' }`}>
 {task.title}
 </h4>
 </div>
 <p className={`text-sm ${task.status === 'completed' ? 'text-stone-400' : 'text-stone-600' }`}>
 {task.description}
 </p>
 </div>
 <div className="flex items-center gap-2 flex-shrink-0">
 <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${priorityConfig.bg} ${priorityConfig.text}`}>
 {task.priority}
 </span>
 <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize ${statusConfig.bg} ${statusConfig.text}`}>
 <StatusIcon className="size-3" />
 {task.status.replace('-', ' ')}
 </span>
 </div>
 </div>

 {/* Patient & Time */}
 <div className="flex items-center gap-4 mt-3 text-sm text-stone-500">
 <div className="flex items-center gap-2">
 <div className="size-6 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-xs font-bold">
 {task.patientAvatar}
 </div>
 <span>{task.patientName}</span>
 </div>
 <div className="flex items-center gap-1">
 <Clock className="size-4 text-stone-400" />
 <span className={task.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
 {task.dueDate} {task.dueTime && `at ${task.dueTime}`}
 </span>
 </div>
 </div>

 {/* Notes */}
 {task.notes && (
 <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-100">
 <p className="text-sm text-amber-800">⚠️ {task.notes}</p>
 </div>
 )}

 {/* Actions */}
 {task.status !== 'completed' && (
 <div className="flex gap-2 mt-4 pt-3 border-t border-stone-100">
 {task.status === 'pending' && (
 <Button size="sm" onClick={() => handleStartTask(task.id)}>
 Start Task
 </Button>
 )}
 {task.status === 'in-progress' && (
 <Button size="sm" onClick={() => handleCompleteTask(task.id)}>
 <CheckCircle className="size-4 mr-1" />
 Complete
 </Button>
 )}
 <Button size="sm" variant="outline">
 <FileText className="size-4 mr-1" />
 Add Note
 </Button>
 <Button size="sm" variant="outline">
 <Camera className="size-4 mr-1" />
 Upload Photo
 </Button>
 </div>
 )}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Incident Report Modal */}
 {showIncidentForm && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); } }} onClick={() => setShowIncidentForm(false)}>
 <div className="bg-white rounded-2xl w-full max-w-lg" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); } }} onClick={e => e.stopPropagation()}>
 <div className="p-6 border-b border-stone-200 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-red-100 rounded-lg">
 <AlertTriangle className="size-5 text-red-600" />
 </div>
 <h2 className="text-lg font-semibold text-stone-900">Report Incident</h2>
 </div>
 <button onClick={() => setShowIncidentForm(false)} className="text-stone-400 hover:text-stone-600">
 <X className="size-5" />
 </button>
 </div>
 <div className="p-6 space-y-4">
 <div>
 <label htmlFor="patient" className="block text-sm font-medium text-stone-700 mb-1">Patient</label>
 <select id="patient" className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
 <option>Select patient</option>
 <option>Mohammed Al-Rashid</option>
 <option>Fatima Al-Hassan</option>
 <option>Ahmed Sayeed</option>
 </select>
 </div>
 <div>
 <label htmlFor="incident-type" className="block text-sm font-medium text-stone-700 mb-1">Incident Type</label>
 <select id="incident-type" className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
 <option>Select type</option>
 <option>Fall</option>
 <option>Medication Error</option>
 <option>Medical Emergency</option>
 <option>Behavioral Issue</option>
 <option>Equipment Failure</option>
 <option>Other</option>
 </select>
 </div>
 <div>
 <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-1">Description</label>
 <textarea id="description"
 rows={4}
 placeholder="Describe what happened..."
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 <div>
 <span className="block text-sm font-medium text-stone-700 mb-1">Severity</span>
 <div className="flex gap-2">
 {['Low', 'Medium', 'High', 'Critical'].map((level) => (
 <button
 key={level}
 className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200"
 >
 {level}
 </button>
 ))}
 </div>
 </div>
 <Button className="w-full bg-red-600 hover:bg-red-700">
 Submit Incident Report
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
