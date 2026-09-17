/**
 * Normalize a phone number to E.164 (+digits).
 * Accepts already-E.164 values or local numbers with an explicit country dial code.
 */
export function normalizePhoneE164(raw: string, defaultCountryDial = '974'): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Phone number is required.');
  }

  const digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    const only = `+${digits.slice(1).replace(/\D/g, '')}`;
    if (only.length < 9) throw new Error('Phone number is too short.');
    return only;
  }

  let local = digits.replace(/\D/g, '');
  if (local.startsWith('00')) local = local.slice(2);
  // Strip leading 0 for local numbers when we append country code
  if (local.startsWith('0')) local = local.slice(1);

  const dial = defaultCountryDial.replace(/\D/g, '');
  if (local.startsWith(dial) && local.length >= dial.length + 7) {
    return `+${local}`;
  }

  const e164 = `+${dial}${local}`;
  if (e164.length < 10) throw new Error('Phone number is too short.');
  return e164;
}

/** Stable synthetic email for phone-only accounts (email column is required/unique). */
export function syntheticEmailForPhone(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  return `phone.${digits}@phone.riayah.local`;
}

export function isSyntheticPhoneEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@phone.riayah.local');
}
