import React from 'react';

interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  locale?: string;
  showSymbol?: boolean;
  className?: string;
  unit?: 'cents' | 'major';
}

const CURRENCY_LOCALES: Record<string, string> = {
  'QAR': 'ar-QA',
  'SAR': 'ar-SA',
  'EGP': 'ar-EG',
  'USD': 'en-US',
  'EUR': 'en-EU',
};

/**
 * CurrencyDisplay - Formats monetary amounts with proper localization
 * 
 * Features:
 * - Supports QAR, SAR, EGP, USD with Arabic locale formatting
 * - Handles cents-to-major conversion (amount is in cents)
 * - Thousands separators
 * - Proper decimal places
 * 
 * Usage:
 * <CurrencyDisplay amount={123456} currency="QAR" /> // "QAR 1,234.56"
 */
export function CurrencyDisplay({
  amount,
  currency = 'USD',
  locale,
  showSymbol = true,
  className = '',
  unit = 'cents'
}: CurrencyDisplayProps) {
  const effectiveLocale = locale || CURRENCY_LOCALES[currency] || 'en-US';
  
  const majorAmount = unit === 'cents' ? amount / 100 : amount;
  
  const formatted = new Intl.NumberFormat(effectiveLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(majorAmount);

  if (!showSymbol) {
    const numericValue = new Intl.NumberFormat(effectiveLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(majorAmount);
    return <span className={className}>{numericValue}</span>;
  }

  return <span className={className}>{formatted}</span>;
}

/**
 * Format credits display (for wallet balances)
 * Shows amount with "Credits" label
 */
export function CreditsDisplay({
  amount,
  className = '',
  unit = 'cents'
}: {
  amount: number;
  className?: string;
  unit?: 'cents' | 'major';
}) {
  const majorAmount = unit === 'cents' ? amount / 100 : amount;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(majorAmount);

  return (
    <span className={className}>
      {formatted} <span className="text-stone-400 text-sm">Credits</span>
    </span>
  );
}
