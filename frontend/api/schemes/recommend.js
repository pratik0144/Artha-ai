/**
 * api/schemes/recommend.js — POST /api/schemes/recommend
 * Returns personalized scheme recommendations
 */

import { getSupabase } from '../_lib/supabase.js';

const INCOME_MAP = {
  '₹0 – ₹5,000': 60000, '₹5,000 – ₹15,000': 180000,
  '₹15,000 – ₹30,000': 360000, '₹30,000+': 999999,
  'low': 100000, 'medium': 300000, 'high': 600000,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Method not allowed' });

  try {
    const { account_id, occupation, income_bracket, state } = req.body || {};
    const supabase = getSupabase();

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
    console.error('[schemes/recommend] Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
