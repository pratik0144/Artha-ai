/**
 * api/spending/limit.js — POST /api/spending/limit
 * Set/update the monthly budget limit for an account
 */

import { getSupabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Method not allowed' });

  try {
    const { account_id, limit } = req.body || {};
    const accountId = account_id || req.headers['x-session-id'];
    const limitVal = parseFloat(limit);

    if (!accountId) return res.status(400).json({ status: 'error', message: 'account_id is required' });
    if (isNaN(limitVal) || limitVal < 0) return res.status(400).json({ status: 'error', message: 'Valid limit is required' });

    const supabase = getSupabase();
    const { error } = await supabase
      .from('accounts')
      .update({ monthly_limit: limitVal })
      .eq('account_id', accountId);

    if (error) throw error;

    return res.status(200).json({
      status: 'success',
      message: 'Monthly limit updated successfully',
      monthly_limit: limitVal
    });
  } catch (error) {
    console.error('[spending/limit] Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
