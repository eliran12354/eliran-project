import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
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
};

// Validate required environment variables
if (!config.supabase.url) {
  throw new Error('SUPABASE_URL is required');
}

if (!config.supabase.serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

if (!config.jwt.secret || config.jwt.secret.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters');
}
