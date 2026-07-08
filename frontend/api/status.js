/**
 * api/status.js — GET /api/status?type=credits|health|health-score
 * Consolidated route for credit details, system health, and financial health score.
 */
import { getSupabase } from './_lib/supabase.js';
import { getCreditsRemaining } from './_lib/rate-limiter.js';
import { getKeyUsageStats, getActiveKeyIndex, getTotalKeys } from './_lib/gemini-pool.js';
import { buildFinancialSnapshot, computeHealthScore } from './_lib/relationship-manager.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ status: 'error', message: 'Method not allowed' });

  const type = req.query?.type || 'health';

  try {
    const supabase = getSupabase();

    if (type === 'credits') {
      const sessionId = req.query?.session_id || req.query?.account_id || req.headers['x-session-id'];
      if (!sessionId) return res.status(400).json({ status: 'error', message: 'session_id or account_id required' });

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
    }

    if (type === 'health-score') {
      const accountId = req.query.account_id || req.query.session_id || req.headers['x-session-id'];
      if (!accountId || !/^[A-Za-z0-9_-]{2,50}$/.test(accountId)) {
        return res.status(400).json({ status: 'error', message: 'Invalid or missing account_id' });
      }

      const snapshot = await buildFinancialSnapshot(supabase, accountId);
      if (!snapshot) {
        return res.status(404).json({ status: 'error', message: 'Account not found' });
      }

      const healthScore = computeHealthScore(snapshot);
      return res.status(200).json({
        status: 'success',
        ...healthScore,
      });
    }

    if (type === 'health') {
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
        stt_engine: 'Gemini 2.5 Flash (multimodal)',
        version: '2.0-supabase',
      });
    }

    return res.status(400).json({ status: 'error', message: `Unknown type parameter: ${type}` });
  } catch (error) {
    console.error(`[status-${type}] Error:`, error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
