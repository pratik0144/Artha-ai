/**
 * api/eligible_schemes.js — GET /api/eligible_schemes?account_id=...
 * Fetch government schemes the user is eligible for but not yet enrolled in
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

    // 1. Fetch user linked schemes
    const { data: account, error: accError } = await supabase
      .from('accounts')
      .select('linked_schemes')
      .eq('account_id', accountId)
      .single();

    if (accError) throw accError;
    const linked = account?.linked_schemes || [];

    // 2. Fetch all government schemes
    const { data: schemes, error: schemeError } = await supabase
      .from('government_schemes')
      .select('*');

    if (schemeError) throw schemeError;

    // Filter out schemes user is already enrolled in
    const eligible = (schemes || []).filter(s => !linked.includes(s.name));

    return res.status(200).json({
      status: 'success',
      eligible_schemes: eligible
    });
  } catch (error) {
    console.error('[eligible_schemes] Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
