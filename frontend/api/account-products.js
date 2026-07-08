/**
 * api/account-products.js — GET /api/account-products?account_id=...&type=loans|installments|fixed_deposits
 * Consolidated route for loans, installments, and fixed deposits (previously 3 separate files/functions).
 */
import { getSupabase } from './_lib/supabase.js';

const TABLE_CONFIG = {
  loans:           { table: 'loans',          orderBy: null,        responseKey: 'loans' },
  installments:    { table: 'installments',   orderBy: 'due_date',  responseKey: 'installments' },
  fixed_deposits:  { table: 'fixed_deposits', orderBy: null,        responseKey: 'fixed_deposits' },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ status: 'error', message: 'Method not allowed' });

  try {
    const accountId = req.query.account_id || req.headers['x-session-id'];
    const type = req.query.type;
    if (!accountId) return res.status(400).json({ status: 'error', message: 'account_id is required' });
    if (!type || !TABLE_CONFIG[type]) {
      return res.status(400).json({ status: 'error', message: `type must be one of: ${Object.keys(TABLE_CONFIG).join(', ')}` });
    }

    const config = TABLE_CONFIG[type];
    const supabase = getSupabase();
    let query = supabase.from(config.table).select('*').eq('account_id', accountId);
    if (config.orderBy) query = query.order(config.orderBy, { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    return res.status(200).json({ status: 'success', [config.responseKey]: data || [] });
  } catch (error) {
    console.error('[account-products] Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
