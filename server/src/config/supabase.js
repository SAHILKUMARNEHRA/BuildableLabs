import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * A single service-role Supabase client for the whole backend.
 *
 * The service role key bypasses row-level security, so this client is only
 * ever used on the server. It does two jobs:
 *   1. Verify the access tokens that browsers send us (auth.getUser).
 *   2. Read/write document metadata, snapshots and storage objects.
 */
export const supabase = createClient(
  env.supabaseUrl,
  env.supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
