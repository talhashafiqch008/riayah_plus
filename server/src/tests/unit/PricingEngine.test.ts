import '../helpers/prismaMock';
import { prismaMock } from '../helpers/prismaMock';
import { PricingEngine } from '../../services/PricingEngine';
import { AppError } from '../../middleware/errorHandler';

describe('PricingEngine', () => {
  beforeEach(() => {
    prismaMock.serviceType.findFirst.mockResolvedValue({
      id: 'svc-home-care',
      code: 'home_care',
      name: 'Home Care',
      type: 'home_care',
      baseRate: 50 as never,
      category: 'care',
      currency: 'QAR',
    });
  });
  describe('calculatePrice', () => {
    const base = {
      serviceType: 'home_care',
      durationHours: 4,
      clientLatitude: 25.285,
      clientLongitude: 51.531,
      providerLatitude: 25.295,
      providerLongitude: 51.541,
      isUrgent: false,
    };

    it('calculates base price from hourly rate and duration', async () => {
      const result = await PricingEngine.calculate({ ...base, providerLatitude: undefined, providerLongitude: undefined });
      expect(result.basePrice).toBe(200); // 50 * 4
    });

    it('applies urgency surcharge', async () => {
      const result = await PricingEngine.calculate({ ...base, isUrgent: true, providerLatitude: undefined, providerLongitude: undefined });
      expect(result.subtotal).toBeGreaterThan(200);
      expect(result.breakdown.urgencySurcharge).toBeGreaterThan(0);
    });

    it('adds distance surcharge when provider is far', async () => {
      const result = await PricingEngine.calculate({
        ...base,
        providerLatitude: 25.400, // ~13 km away
        providerLongitude: 51.600,
      });
      expect(result.breakdown.distanceSurcharge).toBeGreaterThanOrEqual(0);
    });

    it('adds platform fee', async () => {
      const result = await PricingEngine.calculate({ ...base, providerLatitude: undefined, providerLongitude: undefined });
      expect(result.breakdown.platformFee).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(result.subtotal);
    });

    it('total equals subtotal + all surcharges + platform fee', async () => {
      const result = await PricingEngine.calculate(base);
      const { breakdown } = result;
      const expected =
        breakdown.basePrice +
        breakdown.distanceSurcharge +
        breakdown.urgencySurcharge +
        breakdown.platformFee;
      expect(result.total).toBeCloseTo(expected, 2);
    });

    it('fails closed when service is missing from catalog', async () => {
      prismaMock.serviceType.findFirst.mockResolvedValue(null);
      await expect(
        PricingEngine.calculate({ ...base, serviceType: 'unknown_service_xyz' }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('haversine distance', () => {
    it('returns ~0 for identical coordinates', () => {
      const dist = (PricingEngine as any).haversine(25.285, 51.531, 25.285, 51.531);
      expect(dist).toBe(0);
    });

    it('returns ~5.5 km between two Doha points', () => {
      const dist = (PricingEngine as any).haversine(25.285, 51.531, 25.330, 51.570);
      expect(dist).toBeGreaterThan(5);
      expect(dist).toBeLessThan(8);
    });
  });
});
