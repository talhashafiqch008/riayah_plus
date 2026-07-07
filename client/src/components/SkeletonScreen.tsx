export function SkeletonScreen() {
 return (
 <div className="min-h-screen bg-stone-50 p-4 md:p-8">
 <div className="max-w-7xl mx-auto space-y-6">
 <div className="h-8 bg-stone-200 rounded-lg w-1/3 animate-pulse" />
 <div className="h-4 bg-stone-200 rounded-lg w-1/4 animate-pulse" />
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {[1, 2, 3, 4].map((i) => (
 <div key={`item-${i}`} className="h-32 bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
 <div className="h-4 bg-stone-200 rounded w-2/3 animate-pulse" />
 <div className="h-8 bg-stone-200 rounded w-1/2 animate-pulse" />
 <div className="h-3 bg-stone-200 rounded w-3/4 animate-pulse" />
 </div>
 ))}
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 <div className="lg:col-span-2 h-64 bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
 <div className="h-4 bg-stone-200 rounded w-1/4 animate-pulse" />
 <div className="h-40 bg-stone-200 rounded animate-pulse" />
 </div>
 <div className="h-64 bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
 <div className="h-4 bg-stone-200 rounded w-1/3 animate-pulse" />
 <div className="h-40 bg-stone-200 rounded animate-pulse" />
 </div>
 </div>
 </div>
 </div>
 );
}
