'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client (singleton).
 *
 * We deliberately keep a single instance per tab. Creating multiple clients
 * leads to duplicate auth listeners and subtle session bugs. `detectSessionInUrl`
 * lets the Google OAuth redirect complete automatically on the callback page.
 */
let browserClient: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase env vars are missing. Copy web/.env.local.example to web/.env.local and fill them in.'
    );
  }

  browserClient = createClient(url, anonKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
