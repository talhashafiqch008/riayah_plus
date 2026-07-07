import { Link } from 'react-router-dom';


export default function StaffDashboardPage() {
 return (
 <div className="min-h-screen bg-[#FDFBF7] py-16 px-4">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="text-3xl font-semibold text-stone-900 mb-4">Staff Dashboard</h1>
 <p className="text-stone-600 mb-8">
 The staff management portal is currently under development.
 </p>
 <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
 <h2 className="text-xl font-semibold text-stone-900 mb-4">Coming Soon</h2>
 <p className="text-stone-600 mb-6">
 Staff members will be able to manage assignments, review applications, 
 and coordinate care operations from this dashboard.
 </p>
 <div className="flex justify-center gap-4">
 <Link
 to="/"
 className="px-6 py-2.5 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors"
 >
 Go Home
 </Link>
 </div>
 </div>
 </div>
 </div>
 );
}
