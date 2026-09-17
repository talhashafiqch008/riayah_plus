/**
 * Country Configuration
 * Multi-market support for GCC countries
 * ME-ready with country-specific rules
 */

// ============================================================================
// COUNTRY CODES
// ============================================================================

export enum CountryCode {
    AE = 'AE', // United Arab Emirates
    SA = 'SA', // Saudi Arabia
    KW = 'KW', // Kuwait
    QA = 'QA', // Qatar
    BH = 'BH', // Bahrain
    OM = 'OM', // Oman
    PK = 'PK', // Pakistan (testing / SMS)
}

// ============================================================================
// ID TYPES
// ============================================================================

export interface IDType {
    code: string;
    name: { en: string; ar: string };
    format: string; // Regex pattern
    length: number;
    example: string;
}

// ============================================================================
// COUNTRY CONFIGURATION
// ============================================================================

export interface CountryConfig {
    // Basic info
    code: CountryCode;
    name: { en: string; ar: string };
    flag: string; // Emoji or URL
    currency: string;

    // Contact
    phone_code: string;
    phone_format: string; // Regex pattern
    phone_example: string;

    // Identity
    id_types: IDType[];
    primary_id_type: string;

    // Compliance & Regulations
    data_residency_required: boolean;
    medical_license_required: boolean;
    background_check_required: boolean;
    insurance_required: boolean;

    // Healthcare specific
    max_working_hours_per_week: number;
    min_provider_age: number;
    max_provider_age?: number;

    // Features
    payment_gateways: string[];
    supported_languages: string[];
    default_language: string;

    // Business rules
    tax_rate?: number;
    platform_fee_percentage: number;

    // Operational
    timezone: string;
    business_hours: {
        start: string; // HH:mm
        end: string; // HH:mm
    };
    support_phone: string;
    support_email: string;
}

// ============================================================================
// COUNTRY CONFIGURATIONS
// ============================================================================

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
    [CountryCode.AE]: {
        code: CountryCode.AE,
        name: { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة' },
        flag: '🇦🇪',
        currency: 'AED',

        phone_code: '+971',
        phone_format: '^(50|52|54|55|56|58)\\d{7}$',
        phone_example: '50 123 4567',

        id_types: [
            {
                code: 'EMIRATES_ID',
                name: { en: 'Emirates ID', ar: 'الهوية الإماراتية' },
                format: '^784-\\d{4}-\\d{7}-\\d$',
                length: 18,
                example: '784-1234-1234567-1'
            },
            {
                code: 'PASSPORT',
                name: { en: 'Passport', ar: 'جواز السفر' },
                format: '^[A-Z]{1,2}\\d{6,9}$',
                length: 9,
                example: 'A1234567'
            }
        ],
        primary_id_type: 'EMIRATES_ID',

        data_residency_required: true,
        medical_license_required: true,
        background_check_required: true,
        insurance_required: true,

        max_working_hours_per_week: 48,
        min_provider_age: 21,

        payment_gateways: ['STRIPE', 'PAYFORT', 'NETWORK_INTERNATIONAL'],
        supported_languages: ['en', 'ar'],
        default_language: 'ar',

        tax_rate: 0, // No VAT on healthcare
        platform_fee_percentage: 15,

        timezone: 'Asia/Dubai',
        business_hours: { start: '08:00', end: '18:00' },
        support_phone: '+971 4 123 4567',
        support_email: 'support.ae@raiyahplus.com'
    },

    [CountryCode.SA]: {
        code: CountryCode.SA,
        name: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' },
        flag: '🇸🇦',
        currency: 'SAR',

        phone_code: '+966',
        phone_format: '^(50|53|54|55|56|58|59)\\d{7}$',
        phone_example: '50 123 4567',

        id_types: [
            {
                code: 'NATIONAL_ID',
                name: { en: 'National ID', ar: 'الهوية الوطنية' },
                format: '^[12]\\d{9}$',
                length: 10,
                example: '1234567890'
            },
            {
                code: 'IQAMA',
                name: { en: 'Iqama (Resident ID)', ar: 'الإقامة' },
                format: '^[12]\\d{9}$',
                length: 10,
                example: '2234567890'
            },
            {
                code: 'PASSPORT',
                name: { en: 'Passport', ar: 'جواز السفر' },
                format: '^[A-Z]\\d{8}$',
                length: 9,
                example: 'A12345678'
            }
        ],
        primary_id_type: 'NATIONAL_ID',

        data_residency_required: true,
        medical_license_required: true,
        background_check_required: true,
        insurance_required: true,

        max_working_hours_per_week: 48,
        min_provider_age: 21,

        payment_gateways: ['STRIPE', 'HYPERPAY', 'MOYASAR'],
        supported_languages: ['ar', 'en'],
        default_language: 'ar',

        tax_rate: 15, // VAT
        platform_fee_percentage: 15,

        timezone: 'Asia/Riyadh',
        business_hours: { start: '08:00', end: '17:00' },
        support_phone: '+966 11 123 4567',
        support_email: 'support.sa@raiyahplus.com'
    },

    [CountryCode.KW]: {
        code: CountryCode.KW,
        name: { en: 'Kuwait', ar: 'الكويت' },
        flag: '🇰🇼',
        currency: 'KWD',

        phone_code: '+965',
        phone_format: '^(5|6|9)\\d{7}$',
        phone_example: '5 123 4567',

        id_types: [
            {
                code: 'CIVIL_ID',
                name: { en: 'Civil ID', ar: 'البطاقة المدنية' },
                format: '^[12]\\d{11}$',
                length: 12,
                example: '123456789012'
            },
            {
                code: 'PASSPORT',
                name: { en: 'Passport', ar: 'جواز السفر' },
                format: '^[A-Z]\\d{8}$',
                length: 9,
                example: 'K12345678'
            }
        ],
        primary_id_type: 'CIVIL_ID',

        data_residency_required: true,
        medical_license_required: true,
        background_check_required: true,
        insurance_required: true,

        max_working_hours_per_week: 48,
        min_provider_age: 21,

        payment_gateways: ['KNET', 'STRIPE', 'MYFATOORAH'],
        supported_languages: ['ar', 'en'],
        default_language: 'ar',

        tax_rate: 0,
        platform_fee_percentage: 15,

        timezone: 'Asia/Kuwait',
        business_hours: { start: '08:00', end: '17:00' },
        support_phone: '+965 2 123 4567',
        support_email: 'support.kw@raiyahplus.com'
    },

    [CountryCode.QA]: {
        code: CountryCode.QA,
        name: { en: 'Qatar', ar: 'قطر' },
        flag: '🇶🇦',
        currency: 'QAR',

        phone_code: '+974',
        phone_format: '^(3|5|6|7)\\d{7}$',
        phone_example: '3 123 4567',

        id_types: [
            {
                code: 'QID',
                name: { en: 'Qatar ID', ar: 'الهوية القطرية' },
                format: '^[12]\\d{10}$',
                length: 11,
                example: '12345678901'
            },
            {
                code: 'PASSPORT',
                name: { en: 'Passport', ar: 'جواز السفر' },
                format: '^[A-Z]\\d{8}$',
                length: 9,
                example: 'Q12345678'
            }
        ],
        primary_id_type: 'QID',

        data_residency_required: true,
        medical_license_required: true,
        background_check_required: true,
        insurance_required: true,

        max_working_hours_per_week: 48,
        min_provider_age: 21,

        payment_gateways: ['STRIPE', 'QPAY', 'NAPS'],
        supported_languages: ['ar', 'en'],
        default_language: 'ar',

        tax_rate: 0,
        platform_fee_percentage: 15,

        timezone: 'Asia/Qatar',
        business_hours: { start: '08:00', end: '17:00' },
        support_phone: '+974 4 123 4567',
        support_email: 'support.qa@raiyahplus.com'
    },

    [CountryCode.BH]: {
        code: CountryCode.BH,
        name: { en: 'Bahrain', ar: 'البحرين' },
        flag: '🇧🇭',
        currency: 'BHD',

        phone_code: '+973',
        phone_format: '^(3|6|7)\\d{7}$',
        phone_example: '3 123 4567',

        id_types: [
            {
                code: 'CPR',
                name: { en: 'CPR Number', ar: 'رقم السجل السكاني' },
                format: '^[12]\\d{8}$',
                length: 9,
                example: '123456789'
            },
            {
                code: 'PASSPORT',
                name: { en: 'Passport', ar: 'جواز السفر' },
                format: '^[A-Z]\\d{7}$',
                length: 8,
                example: 'B1234567'
            }
        ],
        primary_id_type: 'CPR',

        data_residency_required: false,
        medical_license_required: true,
        background_check_required: true,
        insurance_required: true,

        max_working_hours_per_week: 48,
        min_provider_age: 21,

        payment_gateways: ['BENEFIT', 'STRIPE', 'CREDIMAX'],
        supported_languages: ['ar', 'en'],
        default_language: 'ar',

        tax_rate: 0,
        platform_fee_percentage: 15,

        timezone: 'Asia/Bahrain',
        business_hours: { start: '08:00', end: '17:00' },
        support_phone: '+973 17 123 456',
        support_email: 'support.bh@raiyahplus.com'
    },

    [CountryCode.OM]: {
        code: CountryCode.OM,
        name: { en: 'Oman', ar: 'عُمان' },
        flag: '🇴🇲',
        currency: 'OMR',

        phone_code: '+968',
        phone_format: '^(7|9)\\d{7}$',
        phone_example: '7 123 4567',

        id_types: [
            {
                code: 'CIVIL_ID',
                name: { en: 'Civil ID', ar: 'البطاقة المدنية' },
                format: '^\\d{8}$',
                length: 8,
                example: '12345678'
            },
            {
                code: 'PASSPORT',
                name: { en: 'Passport', ar: 'جواز السفر' },
                format: '^[A-Z]\\d{7}$',
                length: 8,
                example: 'O1234567'
            }
        ],
        primary_id_type: 'CIVIL_ID',

        data_residency_required: false,
        medical_license_required: true,
        background_check_required: true,
        insurance_required: true,

        max_working_hours_per_week: 45,
        min_provider_age: 21,

        payment_gateways: ['STRIPE', 'THAWANI', 'OMANNET'],
        supported_languages: ['ar', 'en'],
        default_language: 'ar',

        tax_rate: 0,
        platform_fee_percentage: 15,

        timezone: 'Asia/Muscat',
        business_hours: { start: '08:00', end: '17:00' },
        support_phone: '+968 24 123 456',
        support_email: 'support.om@raiyahplus.com'
    },

    [CountryCode.PK]: {
        code: CountryCode.PK,
        name: { en: 'Pakistan', ar: 'باكستان' },
        flag: '🇵🇰',
        currency: 'PKR',

        phone_code: '+92',
        // Mobile: 3XX XXXXXXX (10 digits, often entered without leading 0)
        phone_format: '^(3)\\d{9}$',
        phone_example: '300 1234567',

        id_types: [
            {
                code: 'CNIC',
                name: { en: 'CNIC', ar: 'بطاقة الهوية' },
                format: '^\\d{5}-\\d{7}-\\d$',
                length: 15,
                example: '42101-1234567-1'
            },
            {
                code: 'PASSPORT',
                name: { en: 'Passport', ar: 'جواز السفر' },
                format: '^[A-Z]{2}\\d{7}$',
                length: 9,
                example: 'AB1234567'
            }
        ],
        primary_id_type: 'CNIC',

        data_residency_required: false,
        medical_license_required: false,
        background_check_required: false,
        insurance_required: false,

        max_working_hours_per_week: 48,
        min_provider_age: 18,

        payment_gateways: ['STRIPE'],
        supported_languages: ['en', 'ur'],
        default_language: 'en',

        tax_rate: 0,
        platform_fee_percentage: 15,

        timezone: 'Asia/Karachi',
        business_hours: { start: '09:00', end: '18:00' },
        support_phone: '+92 300 0000000',
        support_email: 'support.pk@raiyahplus.com'
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// export function getCountryByCode(code: string): CountryConfig | undefined {
//     return COUNTRIES[code as CountryCode];
// }

function getAllCountries(): CountryConfig[] {
    return Object.values(COUNTRIES);
}

export function getCountryPhoneCode(code: CountryCode): string {
    return COUNTRIES[code].phone_code;
}

export function validatePhoneNumber(phone: string, countryCode: CountryCode): boolean {
    const config = COUNTRIES[countryCode];
    const regex = new RegExp(config.phone_format);
    return regex.test(phone);
}

function validateIDNumber(id: string, idType: string, countryCode: CountryCode): boolean {
    const config = COUNTRIES[countryCode];
    const idTypeConfig = config.id_types.find(t => t.code === idType);
    if (!idTypeConfig) return false;

    const regex = new RegExp(idTypeConfig.format);
    return regex.test(id);
}

function getCountryIDTypes(countryCode: CountryCode): IDType[] {
    return COUNTRIES[countryCode].id_types;
}
