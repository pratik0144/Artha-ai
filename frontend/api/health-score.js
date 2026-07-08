/**
 * api/health-score.js — GET /api/health-score?account_id=...
 * Returns the Financial Health Score (0-100) for a given account.
 * Pure read-only endpoint — no writes.
 */

import { getSupabase } from './_lib/supabase.js';
import { buildFinancialSnapshot, computeHealthScore } from './_lib/relationship-manager.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ status: 'error', message: 'Method not allowed' });

  const accountId = req.query.account_id;
  if (!accountId || !/^[A-Za-z0-9_-]{2,50}$/.test(accountId)) {
    return res.status(400).json({ status: 'error', message: 'Invalid or missing account_id' });
  }

  try {
    const supabase = getSupabase();
    const snapshot = await buildFinancialSnapshot(supabase, accountId);
    if (!snapshot) {
      return res.status(404).json({ status: 'error', message: 'Account not found' });
    }

    const healthScore = computeHealthScore(snapshot);

    return res.status(200).json({
      status: 'success',
      ...healthScore,
    });
  } catch (err) {
    console.error('[health-score] Error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to compute health score' });
  }
}
