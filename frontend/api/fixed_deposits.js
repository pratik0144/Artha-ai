/**
 * api/fixed_deposits.js — GET /api/fixed_deposits?account_id=...
 * Fetch user fixed deposits from Supabase
 */

import { getSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ status: 'error', message: 'Method not allowed' });

  try {
    const accountId = req.query.account_id || req.headers['x-session-id'];
    if (!accountId) return res.status(400).json({ status: 'error', message: 'account_id is required' });

    const supabase = getSupabase();
    const { data: fixedDeposits, error } = await supabase
      .from('fixed_deposits')
      .select('*')
      .eq('account_id', accountId);

    if (error) throw error;

    return res.status(200).json({
      status: 'success',
      fixed_deposits: fixedDeposits || []
    });
  } catch (error) {
    console.error('[fixed_deposits] Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
