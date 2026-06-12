import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env from backend/ regardless of process.cwd (e.g. monorepo root)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(backendRoot, '.env') });

export const config = {
  database: {
    /** PostgreSQL connection string, e.g. postgresql://user:pass@host:5432/db */
    url: process.env.DATABASE_URL || '',
    /** Enable SSL (required by most managed Postgres providers like Render). */
    ssl: (process.env.DATABASE_SSL ?? 'true').toLowerCase() !== 'false',
    /** Maximum number of clients in the connection pool. */
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  },
  server: {
    port: parseInt(process.env.PORT || '10000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiry: process.env.JWT_EXPIRY || '1h',
  },
  /** Shared secret for internal cron/sync endpoints (e.g. X-Cron-Secret header). */
  cronSecret: process.env.CRON_SECRET || '',
  /** Public frontend base URL for password-reset links (no trailing slash). */
  appPublicUrl: (process.env.APP_PUBLIC_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').replace(
    /\/$/,
    ''
  ),
  email: {
    /** Resend API key; if unset, reset links are logged in development only. */
    resendApiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'noreply@example.com',
  },
  ching: {
    /** CHING secret API key (ck_test_* / ck_live_*). Server-side only. */
    apiKey: process.env.CHING_API_KEY || '',
    /** HMAC secret (whsec_*) for verifying incoming webhooks. */
    webhookSecret: process.env.CHING_WEBHOOK_SECRET || '',
    apiBase: process.env.CHING_API_BASE || 'https://api.ching.co.il',
    /** Recurring price id (price_*) of the monthly subscription plan. */
    monthlyPriceId: process.env.CHING_MONTHLY_PRICE_ID || '',
  },
};

// Validate required environment variables
if (!config.database.url) {
  throw new Error('DATABASE_URL is required');
}

if (!config.jwt.secret || config.jwt.secret.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters');
}