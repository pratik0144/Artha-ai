/**
 * api/transactions.js — GET /api/transactions?account_id=...&last_n=...
 * Fetch transaction list and live available balance from Supabase
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
    const lastN = parseInt(req.query.last_n) || 10;

    if (!accountId) {
      return res.status(400).json({ status: 'error', message: 'account_id is required' });
    }

    const supabase = getSupabase();

    // 1. Fetch live balance from accounts
    const { data: account, error: accError } = await supabase
      .from('accounts')
      .select('balance')
      .eq('account_id', accountId)
      .single();

    if (accError) throw accError;

    // 2. Fetch recent transactions
    const { data: transactions, error: txnError } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
      .limit(lastN);

    if (txnError) throw txnError;

    return res.status(200).json({
      status: 'success',
      balance: account?.balance || 0,
      transactions: transactions || []
    });
  } catch (error) {
    console.error('[transactions] Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
