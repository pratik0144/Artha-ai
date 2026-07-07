/**
 * api/onboard.js — POST /api/onboard
 * User onboarding — creates session, fetches profile from Supabase
 */

import { getSupabase } from './_lib/supabase.js';
import { initializeCredits } from './_lib/rate-limiter.js';
import { GREETINGS } from './_lib/language-layer.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Method not allowed' });

  try {
    const data = req.body || {};
    const accountId = data.account_id;
    if (!accountId) return res.status(400).json({ status: 'error', message: 'account_id is required' });

    const language = data.language || 'hi';
    const supabase = getSupabase();

    // Fetch account from Supabase
    const { data: acct } = await supabase
      .from('accounts').select('*').eq('account_id', accountId).single();

    // Fetch eligible schemes
    let eligibleSchemes = [];
    if (acct) {
      const { data: schemes } = await supabase
        .from('government_schemes').select('name, benefit_amount, description_hindi, description_kannada, how_to_apply');
      eligibleSchemes = schemes || [];
    }

    // Build profile
    const profile = {
      account_id: accountId,
      name: acct?.name || data.name || `User-${accountId}`,
      language,
      occupation: acct?.occupation || data.occupation || 'unknown',
      income_bracket: data.income_bracket || 'unknown',
      has_smartphone: acct?.has_smartphone || data.has_smartphone || false,
      location: acct?.location || data.location || 'unknown',
      fraud_risk: data.fraud_risk || 'medium',
      eligible_schemes: acct?.linked_schemes || [],
      concern: data.concern || '',
      scheme_exp: data.scheme_exp || '',
    };

    // Upsert session
    await supabase.from('sessions').upsert({
      account_id: accountId,
      profile,
      conversation_history: [],
      created_at: new Date().toISOString(),
    }, { onConflict: 'account_id' });

    // Initialize credits
    await initializeCredits(supabase, accountId);

    // Active agents
    const activeAgents = ['banking', 'fraud', 'schemes', 'literacy'];
    const languageNote = ['hi', 'kn'].includes(language) ? 'Full support enabled' : 'Hindi and Kannada are primary supported languages';

    return res.status(200).json({
      status: 'success',
      profile,
      eligible_schemes: eligibleSchemes,
      greeting: GREETINGS[language] || GREETINGS.hi,
      active_agents: activeAgents,
      language_note: languageNote,
    });
  } catch (error) {
    console.error('[onboard] Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error', detail: error.message });
  }
}
