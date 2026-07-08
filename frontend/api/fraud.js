/**
 * api/fraud.js — Consolidated fraud operations.
 * GET  /api/fraud?account_id=...                    → returns fraud history & computed risk level (was fraud-history.js)
 * POST /api/fraud (body: account_id, contact_info, details) → submits suspicious activity report (was fraud-report.js)
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
      const { account_id } = req.query;
      const accountId = account_id || req.headers['x-session-id'];

      if (!accountId || !/^[A-Za-z0-9_-]{2,50}$/.test(accountId)) {
        return res.status(400).json({ status: 'error', message: 'Invalid or missing account_id' });
      }

      const { data, error } = await supabase
        .from('fraud_logs')
        .select('id, message, matched_patterns, severity, logged_at')
        .eq('account_id', accountId)
        .order('logged_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Compute a real risk score from actual history, not a static profile field.
      const counts = { critical: 0, high: 0, medium: 0, low: 0 };
      for (const row of data || []) {
        const sev = row.severity || 'medium';
        counts[sev] = (counts[sev] || 0) + 1;
      }

      const recentCount = (data || []).filter(r => {
        const daysAgo = (Date.now() - new Date(r.logged_at).getTime()) / 86400000;
        return daysAgo <= 30;
      }).length;

      let riskLevel = 'low';
      if (counts.critical > 0 || counts.high >= 2) riskLevel = 'high';
      else if (counts.high >= 1 || recentCount >= 3) riskLevel = 'medium';

      return res.status(200).json({
        status: 'success',
        alerts: data || [],
        risk_level: riskLevel,
        severity_counts: counts,
        recent_30d_count: recentCount,
      });
    } catch (error) {
      console.error('[fraud-history] Error:', error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { account_id, contact_info, details } = req.body || {};

      if (!account_id || !contact_info?.trim() || !details?.trim()) {
        return res.status(400).json({ status: 'error', message: 'account_id, contact_info, and details are all required' });
      }
      if (details.length > 1000) {
        return res.status(400).json({ status: 'error', message: 'Details too long (max 1000 characters)' });
      }

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

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
