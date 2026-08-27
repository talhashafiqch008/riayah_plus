import {
  requiresTelehealthJoinPayment,
  TELEHEALTH_PAYMENT_REQUIRED,
} from '../../services/TelehealthPaymentService';
import { AppError } from '../../middleware/errorHandler';

describe('requiresTelehealthJoinPayment', () => {
  it('gates family on telehealth only', () => {
    expect(requiresTelehealthJoinPayment('family', 'telehealth')).toBe(true);
    expect(requiresTelehealthJoinPayment('patient', 'telehealth')).toBe(true);
    expect(requiresTelehealthJoinPayment('family', 'in_person')).toBe(false);
    expect(requiresTelehealthJoinPayment('clinical_staff', 'telehealth')).toBe(false);
    expect(requiresTelehealthJoinPayment('care_coordinator', 'telehealth')).toBe(false);
  });
});

describe('TELEHEALTH_PAYMENT_REQUIRED', () => {
  it('matches the UI error code', () => {
    expect(TELEHEALTH_PAYMENT_REQUIRED).toBe('telehealth_payment_required');
    const err = new AppError('Please pay', 403, {
      code: TELEHEALTH_PAYMENT_REQUIRED,
      invoiceId: 'inv_1',
    });
    expect(err.details).toEqual({ code: 'telehealth_payment_required', invoiceId: 'inv_1' });
  });
});
