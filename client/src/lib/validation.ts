import { z } from 'zod';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const nameRegex = /^[\p{L}\s'-]+$/u;

const accountFieldsSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name must be less than 50 characters').regex(nameRegex, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name must be less than 50 characters').regex(nameRegex, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
    email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
    password: z.string().min(8, 'Password must be at least 8 characters').regex(passwordRegex, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    confirmPassword: z.string()
});

export const accountSchema = accountFieldsSchema.refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});

const careNeedsSchema = z.object({
    careTypes: z.array(z.string()).min(1, 'Please select at least one care type'),
    supportAreas: z.array(z.string()).optional(),
    clinicalNeeds: z.array(z.string()).optional(),
    alliedHealth: z.array(z.string()).optional()
});

const personalDetailsSchema = z.object({
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional()
});

const onboardingSchema = accountFieldsSchema.merge(careNeedsSchema).merge(personalDetailsSchema).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});

export const bookingSchema = z.object({
    providerId: z.string().min(1, 'Provider is required'),
    scheduledAt: z.string().min(1, 'Date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    bookingType: z.enum(['one-off', 'recurring']),
    serviceType: z.enum(['visit', 'online', 'clinic']),
    consultationMethod: z.enum(['video', 'audio', 'chat']).optional()
});

export const loginSchema = z.object({
    email: z.string().min(1, 'Please enter your email address').email('Please enter a valid email address'),
    password: z.string().min(1, 'Please enter your password')
});

export const registerSchema = accountFieldsSchema.extend({
    phone: z.string().min(1, 'Please enter your phone number'),
    terms: z.boolean().refine((val) => val === true, {
        message: 'Please agree to the terms and conditions'
    })
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});

const providerIdentitySchema = z.object({
    nationalId: z.string().min(5, 'ID number must be at least 5 characters')
});

type AccountFormData = z.infer<typeof accountSchema>;
type CareNeedsFormData = z.infer<typeof careNeedsSchema>;
type OnboardingFormData = z.infer<typeof onboardingSchema>;
type BookingFormData = z.infer<typeof bookingSchema>;
type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ProviderIdentityFormData = z.infer<typeof providerIdentitySchema>;

export const validators = {
  email: (value: string): string | null => {
    if (!value.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  password: (value: string): string | null => {
    if (!value.trim()) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    return null;
  },

  required: (value: string | number | null | undefined, fieldName: string): string | null => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`;
    }
    return null;
  },

  amount: (value: string | number, min = 1, max = 10000): string | null => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num <= 0) return 'Please enter a valid amount';
    if (num < min) return `Minimum amount is ${min}`;
    if (num > max) return `Maximum amount is ${max}`;
    return null;
  },

  phone: (value: string): string | null => {
    if (!value.trim()) return 'Phone number is required';
    if (!/^\+?[\d\s-]{8,}$/.test(value)) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  iban: (value: string): string | null => {
    if (!value.trim()) return 'IBAN is required';
    if (!/^[A-Z]{2}\d{2}[A-Z\d]{4}\d{7}([A-Z\d]?){0,16}$/.test(value.replace(/\s/g, ''))) {
      return 'Please enter a valid IBAN';
    }
    return null;
  },
};

export function formatCurrencyInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  if (parts[1] && parts[1].length > 2) {
    return parts[0] + '.' + parts[1].slice(0, 2);
  }
  return cleaned;
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function validateForm<T extends Record<string, unknown>>(
  data: T,
  rules: Record<keyof T, (value: unknown) => string | null>
): Record<string, string> {
  const errors: Record<string, string> = {};
  
  for (const [field, validator] of Object.entries(rules)) {
    const error = validator(data[field]);
    if (error) {
      errors[field] = error;
    }
  }
  
  return errors;
}
