/**
 * Phone Input Component
 * International phone number input with country code selection
 */


import { useState, useEffect, useCallback } from 'react';
import { CountryCode, COUNTRIES, getCountryPhoneCode } from '@/config/countries';
import { ChevronDown } from 'lucide-react';

interface PhoneInputProps {
 value: string;
 onChange: (phone: string, countryCode: CountryCode) => void;
 defaultCountry?: CountryCode;
 error?: string;
 required?: boolean;
 disabled?: boolean;
}

export function PhoneInput({
 value,
 onChange,
 defaultCountry = CountryCode.AE,
 error,
 required = false,
 disabled = false
}: PhoneInputProps) {
 const [selectedCountry, setSelectedCountry] = useState<CountryCode>(defaultCountry);
 const [phoneNumber, setPhoneNumber] = useState('');
 const [showCountrySelect, setShowCountrySelect] = useState(false);

 const countries = Object.values(COUNTRIES);
 const currentCountry = COUNTRIES[selectedCountry];

 useEffect(() => {
 // Parse existing value if provided
 if (value && !phoneNumber) {
 // Extract country code and number
 const country = countries.find(c => value.startsWith(c.phone_code));
 if (country) {
 setSelectedCountry(country.code);
 setPhoneNumber(value.replace(country.phone_code, '').trim());
 }
 }
 }, [value]);

 const handleCountryChange = (country: CountryCode) => {
 setSelectedCountry(country);
 setShowCountrySelect(false);
 onChange(`${getCountryPhoneCode(country)} ${phoneNumber}`, country);
 };

 const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const input = e.target.value.replace(/[^\d\s-]/g, ''); // Only digits, spaces, dashes
 setPhoneNumber(input);
 onChange(`${currentCountry.phone_code} ${input}`, selectedCountry);
 };

 const handleCloseCountrySelect = useCallback(() => {
 setShowCountrySelect(false);
 }, []);

 return (
 <div className="space-y-2">
 <div className="flex gap-2">
 {/* Country Selector */}
 <div className="relative">
 <button
 type="button"
 onClick={() => setShowCountrySelect(!showCountrySelect)}
 disabled={disabled}
 className="h-12 px-3 bg-white border border-stone-300 rounded-lg hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <span className="text-2xl">{currentCountry.flag}</span>
 <span className="text-sm font-medium text-stone-700">
 {currentCountry.phone_code}
 </span>
 <ChevronDown className="size-4 text-stone-400" />
 </button>

 {/* Country Dropdown */}
 {showCountrySelect && (
 <>
 <div
 role="button"
 tabIndex={0}
 className="fixed inset-0 z-10"
 onClick={handleCloseCountrySelect}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
 />
 <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-stone-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
 {countries.map((country) => (
 <button
 key={country.code}
 type="button"
 onClick={() => handleCountryChange(country.code)}
 className="w-full px-4 py-3 hover:bg-stone-50 flex items-center gap-3 text-left transition-colors"
 >
 <span className="text-2xl">{country.flag}</span>
 <div className="flex-1">
 <div className="font-medium text-stone-900">
 {country.name.en}
 </div>
 <div className="text-sm text-stone-500">
 {country.phone_code}
 </div>
 </div>
 {selectedCountry === country.code && (
 <div className="size-2 bg-teal-600 rounded-full" />
 )}
 </button>
 ))}
 </div>
 </>
 )}
 </div>

 {/* Phone Number Input */}
 <div className="flex-1">
 <input
 type="tel"
 value={phoneNumber}
 onChange={handlePhoneChange}
 placeholder={currentCountry.phone_example}
 required={required}
 disabled={disabled}
 className={`w-full h-12 px-4 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-red-300 focus:ring-red-500' : 'border-stone-300 focus:ring-teal-500 focus:border-teal-500' }`}
 />
 </div>
 </div>

 {/* Error Message */}
 {error && (
 <p className="text-sm text-red-600">{error}</p>
 )}

 {/* Help Text */}
 {!error && (
 <p className="text-xs text-stone-500">
 Example: {currentCountry.phone_example}
 </p>
 )}
 </div>
 );
}
