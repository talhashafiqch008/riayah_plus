/**
 * Match Filters Component
 * Filter controls for provider matching
 */

import { useState, useCallback } from 'react';
import { MapPin, DollarSign, Calendar, Filter } from 'lucide-react';

interface MatchFiltersProps {
 onFilterChange: (filters: FilterValues) => void;
 initialFilters?: FilterValues;
}

export interface FilterValues {
 maxDistance: number;
 budgetMin?: number;
 budgetMax?: number;
 urgency: string;
 genderPreference: string;
 languages: string[];
}

export default function MatchFilters({ onFilterChange, initialFilters }: MatchFiltersProps) {
 const [filters, setFilters] = useState<FilterValues>(initialFilters || {
 maxDistance: 20,
 budgetMin: undefined,
 budgetMax: undefined,
 urgency: 'FLEXIBLE',
 genderPreference: 'NO_PREFERENCE',
 languages: []
 });

 const [showFilters, setShowFilters] = useState(false);

 const handleChange = (key: keyof FilterValues, value: FilterValues[keyof FilterValues]) => {
 const newFilters = { ...filters, [key]: value };
 setFilters(newFilters);
 onFilterChange(newFilters);
 };

 const handleToggleFilters = useCallback(() => {
 setShowFilters(prev => !prev);
 }, []);

 const handleResetFilters = useCallback(() => {
 const defaultFilters: FilterValues = {
 maxDistance: 20,
 budgetMin: undefined,
 budgetMax: undefined,
 urgency: 'FLEXIBLE',
 genderPreference: 'NO_PREFERENCE',
 languages: []
 };
 setFilters(defaultFilters);
 onFilterChange(defaultFilters);
 }, [onFilterChange]);

 return (
 <div className="bg-white rounded-xl border border-stone-200 p-4">
 {/* Filter Toggle */}
 <button
 onClick={handleToggleFilters}
 className="w-full flex items-center justify-between text-left"
 >
 <div className="flex items-center gap-2">
 <Filter className="size-5 text-stone-600" />
 <span className="font-semibold text-stone-900">Filters</span>
 </div>
 <span className="text-sm text-teal-600">
 {showFilters ? 'Hide' : 'Show'}
 </span>
 </button>

 {/* Filter Content */}
 {showFilters && (
 <div className="mt-4 space-y-6 pt-4 border-t border-stone-200">
 {/* Distance Filter */}
 <div>
 <span className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-3">
 <MapPin className="size-4" />
 Maximum Distance: {filters.maxDistance}km
 </span>
 <input
 type="range"
 min="5"
 max="50"
 step="5"
 value={filters.maxDistance}
 onChange={(e) => handleChange('maxDistance', parseInt(e.target.value))}
 className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
 />
 <div className="flex justify-between text-xs text-stone-500 mt-1">
 <span>5km</span>
 <span>50km</span>
 </div>
 </div>

 {/* Budget Range */}
 <div>
 <span className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-3">
 <DollarSign className="size-4" />
 Budget Range (Optional)
 </span>
 <div className="flex items-center gap-3">
 <input
 type="number"
 placeholder="Min"
 value={filters.budgetMin || ''}
 onChange={(e) => handleChange('budgetMin', e.target.value ? parseInt(e.target.value) : undefined)}
 className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 <span className="text-stone-400">to</span>
 <input
 type="number"
 placeholder="Max"
 value={filters.budgetMax || ''}
 onChange={(e) => handleChange('budgetMax', e.target.value ? parseInt(e.target.value) : undefined)}
 className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 <span className="text-sm text-stone-600">AED/hr</span>
 </div>
 </div>

 {/* Urgency */}
 <div>
 <label htmlFor="input-src-components-MatchFilters-tsx-126-129" className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-3">
 <Calendar className="size-4" />
 When do you need care?
 </label>
 <select
 value={filters.urgency}
 onChange={(e) => handleChange('urgency', e.target.value)}
 className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
 >
 <option value="IMMEDIATE">Immediately (within 24hrs)</option>
 <option value="WITHIN_WEEK">Within a week</option>
 <option value="WITHIN_MONTH">Within a month</option>
 <option value="FLEXIBLE">Flexible timing</option>
 </select>
 </div>

 {/* Gender Preference */}
 <div>
 <span className="text-sm font-medium text-stone-700 mb-3 block">
 Provider Gender Preference
 </span>
 <div className="space-y-2">
 {[
 { value: 'NO_PREFERENCE', label: 'No Preference' },
 { value: 'FEMALE', label: 'Female Only' },
 { value: 'MALE', label: 'Male Only' }
 ].map((option) => (
 <label key={option.value} className="flex items-center gap-2 cursor-pointer">
 <input
 type="radio"
 name="gender"
 value={option.value}
 checked={filters.genderPreference === option.value}
 onChange={(e) => handleChange('genderPreference', e.target.value)}
 className="size-4 text-teal-600 focus:ring-teal-500"
 />
 <span className="text-sm text-stone-700">{option.label}</span>
 </label>
 ))}
 </div>
 </div>

 {/* Language Preference */}
 <div>
 <span className="text-sm font-medium text-stone-700 mb-3 block">
 Languages
 </span>
 <div className="flex flex-wrap gap-2">
 {['English', 'Arabic', 'Hindi', 'Urdu', 'Tagalog'].map((lang) => (
 <button
 key={lang}
 onClick={() => {
 const newLangs = filters.languages.includes(lang)
 ? filters.languages.filter(l => l !== lang)
 : [...filters.languages, lang];
 handleChange('languages', newLangs);
 }}
 className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filters.languages.includes(lang) ? 'bg-teal-100 text-teal-700 border border-teal-200' : 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200' }`}
 >
 {lang}
 </button>
 ))}
 </div>
 </div>

 {/* Reset Button */}
 <button
 onClick={handleResetFilters}
 className="w-full py-2 text-sm text-stone-600 hover:text-stone-900 font-medium"
 >
 Reset Filters
 </button>
 </div>
 )}
 </div>
 );
}
