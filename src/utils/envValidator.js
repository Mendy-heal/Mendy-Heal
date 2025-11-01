import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ISS: z.string().default('healing.api'),
  JWT_AUD: z.string().default('healing.webapp'),
  TOKEN_TTL: z.string().default('1h'),
  REFRESH_TTL: z.string().default('30d'),
  
  // Email configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.string().default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  
  // MoMo configuration
  MOMO_PARTNER_CODE: z.string().optional(),
  MOMO_ACCESS_KEY: z.string().optional(),
  MOMO_SECRET_KEY: z.string().optional(),
  MOMO_ENDPOINT_CREATE: z.string().optional(),
  MOMO_ENDPOINT_CONFIRM: z.string().optional(),
  MOMO_REDIRECT_URL: z.string().optional(),
  MOMO_IPN_URL: z.string().optional(),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

export const env = envSchema.parse(process.env);

export function validateEnv() {
  try {
    const result = envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
    return result;
  } catch (error) {
    console.error('❌ Environment validation failed:', error.errors);
    process.exit(1);
  }
}