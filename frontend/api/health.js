/**
 * api/health.js — GET /api/health
 * System health check
 */

import { getSupabase } from './_lib/supabase.js';
import { getActiveKeyIndex, getTotalKeys, getKeyUsageStats } from './_lib/gemini-pool.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = getSupabase();

    // Check Supabase connectivity
    let dbStatus = 'down';
    try {
      const { data } = await supabase.from('accounts').select('account_id').limit(1);
      dbStatus = data ? 'up' : 'down';
    } catch (e) { dbStatus = 'error'; }

    const keyStats = await getKeyUsageStats(supabase);

    return res.status(200).json({
      status: 'ok',
      database: dbStatus,
      gemini: {
        total_keys: getTotalKeys(),
        active_key: getActiveKeyIndex(),
        key_stats: keyStats,
      },
      primary_languages: ['Hindi (hi)', 'Kannada (kn)'],
      stt_engine: 'Gemini 2.0 Flash (multimodal)',
      version: '2.0-supabase',
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
