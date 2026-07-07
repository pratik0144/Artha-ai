/**
 * api/credits.js — GET /api/credits?session_id=...
 * Returns credit usage and API key stats for the frontend CreditDisplay
 */

import { getSupabase } from './_lib/supabase.js';
import { getCreditsRemaining } from './_lib/rate-limiter.js';
import { getKeyUsageStats, getActiveKeyIndex, getTotalKeys } from './_lib/gemini-pool.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ status: 'error', message: 'Method not allowed' });

  try {
    const sessionId = req.query?.session_id || req.headers['x-session-id'];
    if (!sessionId) return res.status(400).json({ status: 'error', message: 'session_id query param required' });

    const supabase = getSupabase();
    const credits = await getCreditsRemaining(supabase, sessionId);
    const keyStats = await getKeyUsageStats(supabase);

    return res.status(200).json({
      status: 'success',
      credits_remaining: credits.remaining_credits,
      credits_used: credits.used_credits,
      credits_total: credits.total_credits,
      active_key_index: getActiveKeyIndex(),
      total_keys: getTotalKeys(),
      key_stats: keyStats,
    });
  } catch (error) {
    console.error('[credits] Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
