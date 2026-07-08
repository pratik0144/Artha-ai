/**
 * api/_lib/supabase.js — Supabase Admin Client
 *
 * Creates a Supabase admin client using service role key for
 * server-side operations in Vercel serverless functions.
 */

import { createClient } from '@supabase/supabase-js';

let _client = null;

/**
 * Get or create the Supabase admin client singleton.
 * Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */
export function getSupabase() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables (or VITE_ fallbacks)'
    );
  }

  _client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}

export default getSupabase;
