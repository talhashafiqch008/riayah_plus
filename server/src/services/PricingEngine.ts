import { prisma } from '../config/database';

interface PricingInput {
  serviceType: string;
  durationHours: number;
  providerId?: string;
  clientLatitude?: number;
  clientLongitude?: number;
  providerLatitude?: number;
  providerLongitude?: number;
  isUrgent?: boolean;
  currency?: string;
}

interface PricingResult {
  basePrice: number;
  subtotal: number;
  distanceSurcharge: number;
  urgencySurcharge: number;
  platformFee: number;
  total: number;
  currency: string;
  breakdown: Record<string, number>;
}

const PLATFORM_FEE_RATE = 0.1; // 10%
const URGENCY_PREMIUM = 0.2; // 20% for urgent bookings
const DISTANCE_SURCHARGE_PER_KM = 0.5; // QAR 0.50 per km over 10km

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class PricingEngine {
  static async calculate(input: PricingInput): Promise<PricingResult> {
    const currency = input.currency ?? 'QAR';

    // Fetch service base rate from catalogue
    const service = await prisma.serviceType.findFirst({
      where: { type: input.serviceType },
    });

    // Fetch provider's own hourly rate if set
    let hourlyRate = service?.baseRate ? Number(service.baseRate) : 50; // default QAR 50/hr

    if (input.providerId) {
      const providerProfile = await prisma.providerProfile.findUnique({
        where: { userId: input.providerId },
        select: { hourlyRate: true },
      });
      if (providerProfile?.hourlyRate) hourlyRate = Number(providerProfile.hourlyRate);
    }

    const basePrice = Math.round(hourlyRate * input.durationHours * 100) / 100;

    // Distance surcharge (QAR 0.50 per km over 10 km)
    let distanceSurcharge = 0;
    if (
      input.clientLatitude != null && input.clientLongitude != null &&
      input.providerLatitude != null && input.providerLongitude != null
    ) {
      const distanceKm = haversineDistanceKm(
        input.clientLatitude, input.clientLongitude,
        input.providerLatitude, input.providerLongitude
      );
      if (distanceKm > 10) {
        distanceSurcharge = Math.round((distanceKm - 10) * DISTANCE_SURCHARGE_PER_KM * 100) / 100;
      }
    }

    // Urgency surcharge
    const urgencySurcharge = input.isUrgent ? Math.round(basePrice * URGENCY_PREMIUM * 100) / 100 : 0;

    const subtotal = basePrice + distanceSurcharge + urgencySurcharge;
    const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
    const total = Math.round((subtotal + platformFee) * 100) / 100;

    return {
      basePrice,
      subtotal,
      distanceSurcharge,
      urgencySurcharge,
      platformFee,
      total,
      currency,
      breakdown: {
        hourlyRate,
        durationHours: input.durationHours,
        basePrice,
        subtotal,
        distanceSurcharge,
        urgencySurcharge,
        platformFee,
        total,
      },
    };
  }

  static haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return haversineDistanceKm(lat1, lon1, lat2, lon2);
  }
}
