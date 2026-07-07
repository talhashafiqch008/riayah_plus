
import { useState } from 'react';
import {
 GraduationCap, Award, Clock, CheckCircle, Play, Lock, Star,
 ChevronRight, Calendar, FileText, AlertTriangle, TrendingUp,
 BookOpen, Video, Target, Medal, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';




interface Course {
 id: string;
 title: string;
 description: string;
 category: string;
 duration: string;
 type: 'mandatory' | 'optional' | 'certification';
 status: 'completed' | 'in-progress' | 'not-started' | 'locked';
 progress: number;
 dueDate?: string;
 instructor?: string;
 certificateUrl?: string;
 modules: number;
}

// Mock courses
const mockCourses: Course[] = [
 {
 id: '1',
 title: 'Elderly Care Fundamentals',
 description: 'Essential skills for providing quality care to elderly patients including mobility, hygiene, and nutrition.',
 category: 'Elderly Care',
 duration: '4 hours',
 type: 'mandatory',
 status: 'completed',
 progress: 100,
 instructor: 'Dr. Sarah Ahmed',
 certificateUrl: '/certificates/elderly-care.pdf',
 modules: 8,
 },
 {
 id: '2',
 title: 'First Aid & Emergency Response',
 description: 'Life-saving techniques including CPR, choking response, and emergency protocols.',
 category: 'Safety',
 duration: '3 hours',
 type: 'mandatory',
 status: 'in-progress',
 progress: 60,
 dueDate: '2024-12-30',
 instructor: 'Emergency Services UAE',
 modules: 6,
 },
 {
 id: '3',
 title: 'Medication Management',
 description: 'Proper handling, administration, and documentation of patient medications.',
 category: 'Clinical',
 duration: '2 hours',
 type: 'mandatory',
 status: 'not-started',
 progress: 0,
 dueDate: '2025-01-15',
 modules: 4,
 },
 {
 id: '4',
 title: 'Dementia Care Specialist',
 description: 'Advanced training for caring for patients with dementia and Alzheimer\'s disease.',
 category: 'Specialization',
 duration: '6 hours',
 type: 'certification',
 status: 'not-started',
 progress: 0,
 modules: 10,
 },
 {
 id: '5',
 title: 'Disability Support Training',
 description: 'Learn best practices for supporting individuals with physical and intellectual disabilities.',
 category: 'Specialization',
 duration: '5 hours',
 type: 'optional',
 status: 'completed',
 progress: 100,
 certificateUrl: '/certificates/disability-support.pdf',
 modules: 8,
 },
 {
 id: '6',
 title: 'Communication & Cultural Sensitivity',
 description: 'Effective communication skills and cultural awareness for diverse patient populations.',
 category: 'Soft Skills',
 duration: '2 hours',
 type: 'optional',
 status: 'locked',
 progress: 0,
 modules: 4,
 },
];

export default function TrainingPage() {
 const [courses] = useState<Course[]>(mockCourses);
 const [filter, setFilter] = useState<'all' | 'mandatory' | 'optional' | 'certification'>('all');
 const [statusFilter, setStatusFilter] = useState<string>('all');

 const filteredCourses = courses.filter(c => {
 const matchesType = filter === 'all' || c.type === filter;
 const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
 return matchesType && matchesStatus;
 });

 const stats = {
 completed: courses.filter(c => c.status === 'completed').length,
 inProgress: courses.filter(c => c.status === 'in-progress').length,
 totalHours: courses.filter(c => c.status === 'completed').reduce((acc, c) => acc + parseInt(c.duration), 0),
 certifications: courses.filter(c => c.type === 'certification' && c.status === 'completed').length,
 };

 const mandatoryPending = courses.filter(c => c.type === 'mandatory' && c.status !== 'completed');

 const getStatusConfig = (status: string) => {
 switch (status) {
 case 'completed': return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle };
 case 'in-progress': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: Play };
 case 'not-started': return { bg: 'bg-stone-100', text: 'text-stone-700', icon: Clock };
 case 'locked': return { bg: 'bg-stone-100', text: 'text-stone-500', icon: Lock };
 default: return { bg: 'bg-stone-100', text: 'text-stone-700', icon: Clock };
 }
 };

 const getTypeColor = (type: string) => {
 switch (type) {
 case 'mandatory': return 'bg-red-100 text-red-700';
 case 'certification': return 'bg-purple-100 text-purple-700';
 default: return 'bg-teal-100 text-teal-700';
 }
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div>
 <h2 className="text-2xl font-semibold text-stone-900">Training & Education</h2>
 <p className="text-stone-600">Complete courses to improve your skills and stay compliant</p>
 </div>

 {/* Mandatory Training Alert */}
 {mandatoryPending.length > 0 && (
 <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4">
 <div className="p-2 bg-amber-100 rounded-lg">
 <AlertTriangle className="size-5 text-amber-600" />
 </div>
 <div className="flex-1">
 <h3 className="font-semibold text-amber-900">Mandatory Training Required</h3>
 <p className="text-sm text-amber-700">
 You have {mandatoryPending.length} mandatory course(s) to complete. Complete these to maintain your active status.
 </p>
 </div>
 <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
 Start Now
 </Button>
 </div>
 )}

 {/* Stats */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-white/20 rounded-lg">
 <CheckCircle className="size-5" />
 </div>
 <span className="text-green-100 text-sm">Completed</span>
 </div>
 <p className="text-3xl font-bold">{stats.completed}</p>
 <p className="text-green-100 text-sm mt-1">Courses finished</p>
 </div>
 <div className="bg-white rounded-xl p-5 border border-stone-200">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-blue-100 rounded-lg">
 <Play className="size-5 text-blue-600" />
 </div>
 <span className="text-stone-600 text-sm">In Progress</span>
 </div>
 <p className="text-2xl font-bold text-stone-900">{stats.inProgress}</p>
 <p className="text-stone-500 text-sm mt-1">Continue learning</p>
 </div>
 <div className="bg-white rounded-xl p-5 border border-stone-200">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-teal-100 rounded-lg">
 <Clock className="size-5 text-teal-600" />
 </div>
 <span className="text-stone-600 text-sm">Hours Learned</span>
 </div>
 <p className="text-2xl font-bold text-stone-900">{stats.totalHours}h</p>
 <p className="text-stone-500 text-sm mt-1">Total training time</p>
 </div>
 <div className="bg-white rounded-xl p-5 border border-stone-200">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-purple-100 rounded-lg">
 <Medal className="size-5 text-purple-600" />
 </div>
 <span className="text-stone-600 text-sm">Certifications</span>
 </div>
 <p className="text-2xl font-bold text-stone-900">{stats.certifications}</p>
 <p className="text-stone-500 text-sm mt-1">Earned certificates</p>
 </div>
 </div>

 {/* Filters */}
 <div className="bg-white rounded-xl p-4 border border-stone-200">
 <div className="flex flex-col sm:flex-row gap-4">
 <div className="flex gap-2 flex-wrap">
 {[
 { id: 'all', label: 'All Courses' },
 { id: 'mandatory', label: 'Mandatory' },
 { id: 'optional', label: 'Optional' },
 { id: 'certification', label: 'Certifications' },
 ].map((f) => (
 <button
 key={f.id}
 onClick={() => setFilter(f.id as typeof filter)}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.id ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200' }`}
 >
 {f.label}
 </button>
 ))}
 </div>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
 >
 <option value="all">All Statuses</option>
 <option value="completed">Completed</option>
 <option value="in-progress">In Progress</option>
 <option value="not-started">Not Started</option>
 </select>
 </div>
 </div>

 {/* Course List */}
 <div className="space-y-4">
 {filteredCourses.map((course) => {
 const statusConfig = getStatusConfig(course.status);
 const StatusIcon = statusConfig.icon;

 return (
 <div
 key={course.id}
 className={`bg-white rounded-xl p-6 border shadow-sm transition-all ${course.status === 'locked' ? 'border-stone-200 opacity-60' : 'border-stone-200 hover:border-teal-200 hover:shadow-md' }`}
 >
 <div className="flex flex-col lg:flex-row lg:items-start gap-6">
 <div className="flex-1">
 <div className="flex items-start gap-3 mb-3">
 <div className={`p-3 rounded-xl ${course.category === 'Safety' ? 'bg-red-100' : course.category === 'Clinical' ? 'bg-blue-100' : course.category === 'Specialization' ? 'bg-purple-100' : 'bg-teal-100' }`}>
 {course.category === 'Safety' ? <AlertTriangle className="size-5 text-red-600" /> :
 course.category === 'Clinical' ? <FileText className="size-5 text-blue-600" /> :
 <BookOpen className="size-5 text-teal-600" />}
 </div>
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <h3 className="text-lg font-semibold text-stone-900">{course.title}</h3>
 <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getTypeColor(course.type)}`}>
 {course.type}
 </span>
 </div>
 <p className="text-sm text-stone-600">{course.description}</p>
 </div>
 </div>

 <div className="flex flex-wrap gap-4 text-sm text-stone-600">
 <div className="flex items-center gap-1">
 <Clock className="size-4 text-stone-400" />
 <span>{course.duration}</span>
 </div>
 <div className="flex items-center gap-1">
 <Video className="size-4 text-stone-400" />
 <span>{course.modules} modules</span>
 </div>
 {course.instructor && (
 <div className="flex items-center gap-1">
 <GraduationCap className="size-4 text-stone-400" />
 <span>{course.instructor}</span>
 </div>
 )}
 {course.dueDate && (
 <div className="flex items-center gap-1 text-amber-600">
 <Calendar className="size-4" />
 <span>Due: {new Date(course.dueDate).toLocaleDateString()}</span>
 </div>
 )}
 </div>

 {/* Progress Bar */}
 {course.status !== 'locked' && (
 <div className="mt-4">
 <div className="flex items-center justify-between text-sm mb-1">
 <span className="text-stone-600">Progress</span>
 <span className="font-medium text-stone-900">{course.progress}%</span>
 </div>
 <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full transition-all ${course.progress === 100 ? 'bg-green-500' : 'bg-teal-500' }`}
 style={{ width: `${course.progress}%` }}
 />
 </div>
 </div>
 )}
 </div>

 {/* Status & Actions */}
 <div className="lg:w-40 flex lg:flex-col items-center gap-3">
 <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
 <StatusIcon className="size-4" />
 <span className="capitalize">{course.status.replace('-', ' ')}</span>
 </span>

 {course.status === 'completed' && course.certificateUrl && (
 <Button variant="outline" size="sm" className="w-full lg:w-auto">
 <Download className="size-4 mr-1" />
 Certificate
 </Button>
 )}

 {course.status === 'in-progress' && (
 <Button size="sm" className="w-full lg:w-auto">
 <Play className="size-4 mr-1" />
 Continue
 </Button>
 )}

 {course.status === 'not-started' && (
 <Button size="sm" className="w-full lg:w-auto">
 Start Course
 </Button>
 )}

 {course.status === 'locked' && (
 <span className="text-xs text-stone-500 text-center">Complete prerequisites first</span>
 )}
 </div>
 </div>
 </div>
 );
 })}
 </div>

 {/* Achievements */}
 <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-xl p-6 text-white">
 <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
 <Award className="size-5 text-amber-400" />
 Your Achievements
 </h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {[
 { icon: Star, label: 'First Course', achieved: true },
 { icon: Medal, label: '5 Courses', achieved: true },
 { icon: Award, label: 'Certified', achieved: true },
 { icon: Target, label: 'All Mandatory', achieved: false },
 ].map((achievement) => (
 <div
 key={achievement.label}
 className={`p-4 rounded-xl text-center ${achievement.achieved ? 'bg-white/10' : 'bg-white/5 opacity-50' }`}
 >
 <achievement.icon className={`size-8 mx-auto mb-2 ${achievement.achieved ? 'text-amber-400' : 'text-stone-500' }`} />
 <p className="text-sm font-medium">{achievement.label}</p>
 {achievement.achieved && <CheckCircle className="size-4 text-green-400 mx-auto mt-1" />}
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
