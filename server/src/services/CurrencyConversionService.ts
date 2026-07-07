import axios from 'axios';
import { redis } from '../config/redis';
import { logger } from '../config/logger';

// Base currency is QAR (Qatari Riyal)
const BASE_CURRENCY = 'QAR';
const CACHE_TTL_SECONDS = 3600; // 1 hour

// Fallback rates relative to QAR (as of 2026)
const FALLBACK_RATES: Record<string, number> = {
  QAR: 1,
  USD: 0.2747,
  EUR: 0.2531,
  GBP: 0.2163,
  AED: 1.0089,
  SAR: 1.0303,
  KWD: 0.0842,
  BHD: 0.1035,
  OMR: 0.1057,
  EGP: 13.30,
};

export class CurrencyConversionService {
  static async getRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;

    const cacheKey = `fx:${from}:${to}`;
    const cached = await redis.get(cacheKey);
    if (cached) return parseFloat(cached);

    try {
      // Use Open Exchange Rates or similar — fallback to static rates if not configured
      const apiKey = process.env.OPEN_EXCHANGE_RATES_KEY;
      if (apiKey) {
        const response = await axios.get(`https://openexchangerates.org/api/latest.json`, {
          params: { app_id: apiKey, base: 'USD' },
        });
        const rates = response.data.rates;
        // Convert via USD as intermediary
        const fromInUsd = from === 'USD' ? 1 : 1 / (rates[from] ?? 1);
        const toInUsd = to === 'USD' ? 1 : rates[to] ?? 1;
        const rate = fromInUsd * toInUsd;
        await redis.setex(cacheKey, CACHE_TTL_SECONDS, rate.toString());
        return rate;
      }
    } catch (err) {
      logger.warn('Currency API failed, using fallback rates', { err });
    }

    // Fallback: convert via QAR
    const fromToQar = FALLBACK_RATES[from] ? 1 / FALLBACK_RATES[from] : 1;
    const qarToTarget = FALLBACK_RATES[to] ?? 1;
    return fromToQar * qarToTarget;
  }

  static async convert(amount: number, from: string, to: string): Promise<number> {
    const rate = await this.getRate(from, to);
    return Math.round(amount * rate * 100) / 100;
  }

  static async formatAmount(amount: number, currency: string): Promise<string> {
    return new Intl.NumberFormat('en-QA', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  static getSupportedCurrencies(): string[] {
    return Object.keys(FALLBACK_RATES);
  }
}
