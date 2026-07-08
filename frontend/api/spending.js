/**
 * api/spending.js — Consolidated spending operations.
 * GET  /api/spending?account_id=...         → returns monthly spending details and budget limit (was spending.js)
 * POST /api/spending (body: account_id, limit) → updates the monthly budget limit (was spending/limit.js)
 */
import { getSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();

  if (req.method === 'GET') {
    try {
      const accountId = req.query.account_id || req.headers['x-session-id'];
      if (!accountId) return res.status(400).json({ status: 'error', message: 'account_id is required' });

      // 1. Get limit & balance
      const { data: acct, error: accError } = await supabase
        .from('accounts')
        .select('balance, monthly_limit')
        .eq('account_id', accountId)
        .single();

      if (accError) throw accError;

      // 2. Compute spending of the current month
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      const { data: txns, error: txnError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('account_id', accountId)
        .eq('type', 'debit')
        .gte('date', monthStart);

      if (txnError) throw txnError;

      const totalSpent = (txns || []).reduce((s, t) => s + Number(t.amount), 0);
      const limit = Number(acct?.monthly_limit || 0);
      const percentage = limit > 0 ? Math.round((totalSpent / limit) * 100) : 0;
      const overBudget = limit > 0 && totalSpent > limit;
      const remaining = limit > 0 ? Math.max(0, limit - totalSpent) : 0;

      return res.status(200).json({
        status: 'success',
        total_spent: totalSpent,
        monthly_limit: limit,
        percentage,
        over_budget: overBudget,
        remaining,
        balance: Number(acct?.balance || 0),
        month: monthStart
      });
    } catch (error) {
      console.error('[spending] Error:', error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { account_id, limit } = req.body || {};
      const accountId = account_id || req.headers['x-session-id'];
      const limitVal = parseFloat(limit);

      if (!accountId) return res.status(400).json({ status: 'error', message: 'account_id is required' });
      if (isNaN(limitVal) || limitVal < 0) return res.status(400).json({ status: 'error', message: 'Valid limit is required' });

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
      console.error('[spending-limit] Error:', error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
