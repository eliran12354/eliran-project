import { createClient } from '@supabase/supabase-js';
import { config } from './env';

// Create Supabase client with service role key (full access)
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

