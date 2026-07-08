/**
 * api/schemes.js — Consolidated route for government schemes operations (previously 3 separate files).
 * GET  /api/schemes?type=all              → returns all schemes (was schemes/all.js)
 * GET  /api/schemes?type=eligible&account_id=... → returns eligible schemes (was eligible_schemes.js)
 * POST /api/schemes  (body: profile data) → returns recommendations (was schemes/recommend.js)
 */
import { getSupabase } from './_lib/supabase.js';

const INCOME_MAP = {
  '₹0 – ₹5,000': 60000, '₹5,000 – ₹15,000': 180000,
  '₹15,000 – ₹30,000': 360000, '₹30,000+': 999999,
  'low': 100000, 'medium': 300000, 'high': 600000,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();

  if (req.method === 'GET') {
    const type = req.query.type;

    if (type === 'eligible') {
      try {
        const accountId = req.query.account_id || req.headers['x-session-id'];
        if (!accountId) return res.status(400).json({ status: 'error', message: 'account_id is required' });

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
        console.error('[schemes-eligible] Error:', error);
        return res.status(500).json({ status: 'error', message: error.message });
      }
    } else {
      // Default to returning all schemes (previously schemes/all.js)
      try {
        const { data: schemes, error } = await supabase
          .from('schemes_database').select('*');

        if (error) throw error;

        return res.status(200).json({
          status: 'success',
          count: (schemes || []).length,
          schemes: schemes || [],
        });
      } catch (error) {
        console.error('[schemes-all] Error:', error);
        return res.status(500).json({ status: 'error', message: error.message });
      }
    }
  }

  if (req.method === 'POST') {
    // Recommend schemes (previously schemes/recommend.js)
    try {
      const { account_id, occupation, income_bracket, state } = req.body || {};
      
      const { data: schemes } = await supabase.from('schemes_database').select('*');
      if (!schemes) return res.status(200).json({ status: 'success', recommendations: [] });

      const income = INCOME_MAP[income_bracket] || 200000;

      // Score schemes
      const scored = schemes.map(s => {
        let score = 0;
        const elig = s.eligibility || {};

        if (elig.occupation) {
          const ocs = Array.isArray(elig.occupation) ? elig.occupation : [elig.occupation];
          if (ocs.includes('any') || ocs.includes(occupation)) score += 10;
        } else { score += 5; }

        if (elig.max_income && income <= elig.max_income) score += 5;
        else if (!elig.max_income) score += 3;

        if (elig.state && state && elig.state.includes(state)) score += 3;

        return { score, scheme: s };
      }).filter(x => x.score > 5);

      scored.sort((a, b) => b.score - a.score);

      return res.status(200).json({
        status: 'success',
        recommendations: scored.slice(0, 10).map(x => ({
          id: x.scheme.id,
          name: x.scheme.name,
          benefits: x.scheme.benefits,
          description: x.scheme.description,
          ministry: x.scheme.ministry,
          documents_required: x.scheme.documents_required,
          relevance_score: x.score,
        })),
      });
    } catch (error) {
      console.error('[schemes-recommend] Error:', error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
