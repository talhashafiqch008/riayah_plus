import dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  APP_URL: process.env.APP_URL || 'http://localhost:5000',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  OPEN_EXCHANGE_RATES_KEY: process.env.OPEN_EXCHANGE_RATES_KEY || '',
  ADMIN_SECRET: process.env.ADMIN_SECRET || '',

  DATABASE_URL: process.env.DATABASE_URL || '',

  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'change-me-access-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret',
  /** Previous secrets accepted during rotation window (verify only; never used to sign). */
  JWT_ACCESS_SECRET_PREVIOUS: process.env.JWT_ACCESS_SECRET_PREVIOUS || '',
  JWT_REFRESH_SECRET_PREVIOUS: process.env.JWT_REFRESH_SECRET_PREVIOUS || '',
  // A-3: validated below
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  /** AUTH-24: JWT issuer / audience */
  JWT_ISSUER: process.env.JWT_ISSUER || 'riayah-plus',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'riayah-plus-api',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  /** AUTH-15: when break-glass is enabled, bind to this admin user id (not client-supplied email) */
  ADMIN_BREAK_GLASS_USER_ID: process.env.ADMIN_BREAK_GLASS_USER_ID || '',
  ALLOW_ADMIN_SECRET_LOGIN: process.env.ALLOW_ADMIN_SECRET_LOGIN === 'true',

  /** Reverse-proxy IP trust (D-02). Prod defaults on; set TRUST_PROXY=false to disable. */
  TRUST_PROXY:
    process.env.TRUST_PROXY === 'true' ||
    (process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY !== 'false'),
  TRUST_PROXY_HOPS: parseInt(process.env.TRUST_PROXY_HOPS || '1', 10),

  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION || 'me-south-1',
  AWS_BUCKET: process.env.AWS_BUCKET || '',
  /** Default KMS key for PHI S3 uploads (purpose-specific keys override). */
  AWS_KMS_KEY_ID: process.env.AWS_KMS_KEY_ID || '',
  TELEHEALTH_RECORDING_KMS_KEY: process.env.TELEHEALTH_RECORDING_KMS_KEY || '',
  CHAT_ATTACHMENT_KMS_KEY: process.env.CHAT_ATTACHMENT_KMS_KEY || '',
  INVOICE_PDF_KMS_KEY: process.env.INVOICE_PDF_KMS_KEY || '',

  MAIL_HOST: process.env.MAIL_HOST || 'smtp.gmail.com',
  MAIL_PORT: parseInt(process.env.MAIL_PORT || '587', 10),
  MAIL_USERNAME: process.env.MAIL_USERNAME || '',
  MAIL_PASSWORD: process.env.MAIL_PASSWORD || '',
  MAIL_FROM_ADDRESS: process.env.MAIL_FROM_ADDRESS || 'noreply@riayahplus.com',
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || 'Riayah Plus',

  STRIPE_KEY: process.env.STRIPE_KEY || '',
  STRIPE_SECRET: process.env.STRIPE_SECRET || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  QATAR_PAYMENT_GATEWAY: process.env.QATAR_PAYMENT_GATEWAY || 'paytabs',
  PAYTABS_PROFILE_ID: process.env.PAYTABS_PROFILE_ID || '',
  PAYTABS_SERVER_KEY: process.env.PAYTABS_SERVER_KEY || '',
  PAYTABS_BASE_URL:
    process.env.PAYTABS_BASE_URL || 'https://secure-doha.paytabs.com/payment/request',
  PAYTABS_WEBHOOK_SECRET: process.env.PAYTABS_WEBHOOK_SECRET || '',

  SKIPCASH_CLIENT_ID: process.env.SKIPCASH_CLIENT_ID || '',
  SKIPCASH_KEY_ID: process.env.SKIPCASH_KEY_ID || '',
  SKIPCASH_SECRET_KEY: process.env.SKIPCASH_SECRET_KEY || '',
  SKIPCASH_WEBHOOK_KEY: process.env.SKIPCASH_WEBHOOK_KEY || '',
  SKIPCASH_BASE_URL:
    process.env.SKIPCASH_BASE_URL || 'https://skipcashtest.azurewebsites.net',

  PUSHER_APP_ID: process.env.PUSHER_APP_ID || '',
  PUSHER_APP_KEY: process.env.PUSHER_APP_KEY || '',
  PUSHER_APP_SECRET: process.env.PUSHER_APP_SECRET || '',
  PUSHER_APP_CLUSTER: process.env.PUSHER_APP_CLUSTER || 'ap2',

  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || '',
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || '',
  LIVEKIT_URL: process.env.LIVEKIT_URL || '',

  DAILY_API_KEY: process.env.DAILY_API_KEY || '',

  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID || '',

  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  GPS_CHECKIN_RADIUS_METERS: parseInt(process.env.GPS_CHECKIN_RADIUS_METERS || '300', 10),

  WHATSAPP_BASE_URL: process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com/v18.0',
  WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID || '',
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || '',
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || '',
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET || '',

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',

  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8001',
  AI_SERVICE_API_KEY: process.env.AI_SERVICE_API_KEY || '',

  SENTRY_DSN: process.env.SENTRY_DSN || '',
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || 'development',

  /** AES key material for GDPR data-export files at rest (required in production). */
  DATA_EXPORT_ENCRYPTION_KEY: process.env.DATA_EXPORT_ENCRYPTION_KEY || '',
  /** AES key material for telehealth recording transcripts at rest (required in production). */
  RECORDING_TRANSCRIPT_ENCRYPTION_KEY: process.env.RECORDING_TRANSCRIPT_ENCRYPTION_KEY || '',
  /** How long an encrypted export remains downloadable (hours). */
  DATA_EXPORT_TTL_HOURS: parseInt(process.env.DATA_EXPORT_TTL_HOURS || '24', 10),

  /** Recording Intelligence pipeline (artifact analysis); false-safe when unset. */
  RECORDING_INTELLIGENCE_ENABLED: process.env.RECORDING_INTELLIGENCE_ENABLED === 'true',
  RECORDING_INTELLIGENCE_PIPELINE_VERSION:
    process.env.RECORDING_INTELLIGENCE_PIPELINE_VERSION || '2026-09-recording-v1',
  RECORDING_INTELLIGENCE_MEDIA_URL_TTL_SECONDS: parseInt(
    process.env.RECORDING_INTELLIGENCE_MEDIA_URL_TTL_SECONDS || '7200',
    10,
  ),

  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',
};

// A-3: refuse to start in deployed environments with default JWT secrets (M11)
const DEFAULT_JWT_SECRETS = [
  'change-me-access-secret',
  'change-me-refresh-secret',
  'your-access-secret-min-32-chars',
  'your-refresh-secret-min-32-chars',
];
const WEAK_ADMIN_SECRETS = ['', 'your-admin-secret-here', 'change-me', 'admin', 'secret'];
const isLocalDev = (process.env.NODE_ENV || 'development') === 'development';
const MIN_JWT_SECRET_LEN = 32;

if (!isLocalDev) {
  if (
    DEFAULT_JWT_SECRETS.includes(env.JWT_ACCESS_SECRET) ||
    DEFAULT_JWT_SECRETS.includes(env.JWT_REFRESH_SECRET)
  ) {
    throw new Error(
      'FATAL: JWT_ACCESS_SECRET or JWT_REFRESH_SECRET is still set to its default placeholder. ' +
        'Generate secure random secrets and set them in your environment before running outside local development.',
    );
  }
  if (
    env.JWT_ACCESS_SECRET.length < MIN_JWT_SECRET_LEN ||
    env.JWT_REFRESH_SECRET.length < MIN_JWT_SECRET_LEN
  ) {
    throw new Error(
      `FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be at least ${MIN_JWT_SECRET_LEN} characters outside local development.`,
    );
  }
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error('FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct.');
  }
}

// Production-only encryption / KMS / break-glass guards
if (process.env.NODE_ENV === 'production') {
  if (env.ALLOW_ADMIN_SECRET_LOGIN) {
    if (
      WEAK_ADMIN_SECRETS.includes(env.ADMIN_SECRET.trim()) ||
      env.ADMIN_SECRET.trim().length < MIN_JWT_SECRET_LEN
    ) {
      throw new Error(
        'FATAL: ALLOW_ADMIN_SECRET_LOGIN is enabled but ADMIN_SECRET is missing/weak. ' +
          'Use a ≥32-char secret or disable break-glass login.',
      );
    }
    if (!env.ADMIN_BREAK_GLASS_USER_ID.trim()) {
      throw new Error(
        'FATAL: ALLOW_ADMIN_SECRET_LOGIN requires ADMIN_BREAK_GLASS_USER_ID.',
      );
    }
  }

  if (!env.DATA_EXPORT_ENCRYPTION_KEY?.trim()) {
    throw new Error(
      'FATAL: DATA_EXPORT_ENCRYPTION_KEY must be set in production. ' +
        'Do not reuse JWT secrets for encrypted GDPR exports.',
    );
  }

  if (!env.RECORDING_TRANSCRIPT_ENCRYPTION_KEY?.trim()) {
    throw new Error(
      'FATAL: RECORDING_TRANSCRIPT_ENCRYPTION_KEY must be set in production for encrypted telehealth transcripts at rest.',
    );
  }

  if (!env.TELEHEALTH_RECORDING_KMS_KEY?.trim()) {
    throw new Error(
      'FATAL: TELEHEALTH_RECORDING_KMS_KEY must be set in production for encrypted telehealth recordings at rest.',
    );
  }

  if (!env.CHAT_ATTACHMENT_KMS_KEY?.trim()) {
    throw new Error(
      'FATAL: CHAT_ATTACHMENT_KMS_KEY must be set in production for encrypted chat attachments at rest.',
    );
  }
}
