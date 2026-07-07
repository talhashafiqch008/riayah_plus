
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { STORAGE_KEYS } from '@/lib/storage-keys';

// Define supported countries or just use string
export type CountryCode = 'SA' | 'AE' | 'AU' | 'US' | 'GB' | 'EG' | string;

interface CountryContextType {
 country: CountryCode;
 setCountry: (country: CountryCode) => void;
 isAustralia: boolean;
 isGCC: boolean; // Helper for Gulf countries if needed, given the app context
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

const STORAGE_KEY = STORAGE_KEYS.country;

export function CountryProvider({ children }: { children: ReactNode }) {
 // Default to empty string to prevent race condition before detection runs
 const [country, setCountryState] = useState<CountryCode>('');

 useEffect(() => {
 // 1. Try to get from LocalStorage
 const stored = localStorage.getItem(STORAGE_KEY);
 if (stored) {
 setCountryState(stored);
 return;
 }

 // 2. Auto-detect country based on timezone if no stored preference
 const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

 let detectedCountry = 'SA'; // Default fallback

 if (timeZone.includes('Qatar') || timeZone.includes('Manama')) {
 detectedCountry = 'QAT';
 } else if (timeZone.includes('Cairo') || timeZone.includes('Egypt')) {
 detectedCountry = 'EGY';
 } else if (timeZone.includes('Australia') || timeZone.includes('Sydney') || timeZone.includes('Melbourne') || timeZone.includes('Brisbane') || timeZone.includes('Perth') || timeZone.includes('Adelaide') || timeZone.includes('Hobart') || timeZone.includes('Darwin')) {
 detectedCountry = 'AUS'; // Using AUS code for Australia context
 }

 setCountryState(detectedCountry);
 // We don't necessarily save to localStorage yet, wait for user confirmation or interaction.
 // OR save it immediately if you want it sticky. Let's start with state only.
 }, []);

 const setCountry = (code: CountryCode) => {
 setCountryState(code);
 localStorage.setItem(STORAGE_KEY, code);
 };

 const isAustralia = country === 'AU';
 const isGCC = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'].includes(country);

 return (
 <CountryContext.Provider value={{ country, setCountry, isAustralia, isGCC }}>
 {children}
 </CountryContext.Provider>
 );
}

export function useCountry() {
 const context = useContext(CountryContext);
 if (context === undefined) {
 throw new Error('useCountry must be used within a CountryProvider');
 }
 return context;
}
