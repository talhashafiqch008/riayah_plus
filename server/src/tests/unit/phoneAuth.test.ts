import { normalizePhoneE164, syntheticEmailForPhone } from '../../utils/phoneAuth';

describe('phoneAuth utils', () => {
  it('normalizes Qatar local numbers to E.164', () => {
    expect(normalizePhoneE164('33123456')).toBe('+97433123456');
    expect(normalizePhoneE164('+974 3312 3456')).toBe('+97433123456');
  });

  it('builds a synthetic email for phone-only accounts', () => {
    expect(syntheticEmailForPhone('+97433123456')).toBe('phone.97433123456@phone.riayah.local');
  });
});
