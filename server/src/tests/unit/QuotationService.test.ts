import { parseServiceQuantity } from '../../services/QuotationService';
import { billableHours } from '../../services/InvoiceService';
import { catalogUnitPrice } from '../../services/ServiceCatalog';

describe('parseServiceQuantity', () => {
  it('defaults to 1 when empty', () => {
    expect(parseServiceQuantity(null, null)).toBe(1);
    expect(parseServiceQuantity(undefined, undefined)).toBe(1);
  });

  it('parses Nx frequency', () => {
    expect(parseServiceQuantity('3x/week', null)).toBe(3);
    expect(parseServiceQuantity('2× daily', null)).toBe(2);
  });

  it('parses sessions / hours language', () => {
    expect(parseServiceQuantity('2 sessions', null)).toBe(2);
    expect(parseServiceQuantity(null, '4 hours')).toBe(4);
  });
});

describe('billableHours', () => {
  it('defaults to 1 when empty', () => {
    expect(billableHours({})).toBe(1);
  });

  it('uses durationHours or minutes', () => {
    expect(billableHours({ durationHours: 2 })).toBe(2);
    expect(billableHours({ durationMinutes: 90 })).toBe(1.5);
  });

  it('uses check-in/out window with 0.25h floor', () => {
    const checkInAt = new Date('2026-08-13T10:00:00Z');
    const checkOutAt = new Date('2026-08-13T10:10:00Z');
    expect(billableHours({ checkInAt, checkOutAt })).toBe(0.25);
    const longOut = new Date('2026-08-13T12:00:00Z');
    expect(billableHours({ checkInAt, checkOutAt: longOut })).toBe(2);
  });
});

describe('catalogUnitPrice', () => {
  it('prefers catalog over a lower submitted cost', () => {
    expect(catalogUnitPrice(80, 1)).toBe(80);
  });

  it('prefers catalog even when submitted is higher', () => {
    expect(catalogUnitPrice(80, 200)).toBe(80);
  });

  it('falls back to submitted when catalog missing', () => {
    expect(catalogUnitPrice(null, 55)).toBe(55);
    expect(catalogUnitPrice(0, 55)).toBe(55);
  });

  it('returns null when neither is usable', () => {
    expect(catalogUnitPrice(null, null)).toBeNull();
    expect(catalogUnitPrice(0, 0)).toBeNull();
  });
});
