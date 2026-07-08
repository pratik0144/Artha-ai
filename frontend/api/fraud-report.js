/**
 * api/fraud-report.js — POST /api/fraud-report
 * Saves a real user-submitted suspicious activity report.
 */
import { getSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    const { account_id, contact_info, details } = req.body || {};

    if (!account_id || !contact_info?.trim() || !details?.trim()) {
      return res.status(400).json({ status: 'error', message: 'account_id, contact_info, and details are all required' });
    }
    if (details.length > 1000) {
      return res.status(400).json({ status: 'error', message: 'Details too long (max 1000 characters)' });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('fraud_reports')
      .insert({
        account_id,
        contact_info: contact_info.trim(),
        details: details.trim(),
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ status: 'success', report: data });
  } catch (error) {
    console.error('[fraud-report] Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
