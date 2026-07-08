/**
 * api/onboard.js — POST /api/onboard
 * User onboarding — creates session, fetches profile from Supabase
 */

import { getSupabase } from './_lib/supabase.js';
import { initializeCredits } from './_lib/rate-limiter.js';
import { GREETINGS } from './_lib/language-layer.js';
import { buildFinancialSnapshot, generateProactiveNudges } from './_lib/relationship-manager.js';

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
    if (acct && acct.linked_schemes && acct.linked_schemes.length > 0) {
      const { data: schemes } = await supabase
        .from('government_schemes')
        .select('name, benefit_amount, description_hindi, description_kannada, how_to_apply')
        .in('name', acct.linked_schemes);
      eligibleSchemes = schemes || [];
    }

    // Build profile
    const profile = {
      account_id: accountId,
      name: acct?.name || data.name || `User-${accountId}`,
      language,
      occupation: acct?.occupation || data.occupation || 'unknown',
      income_bracket: acct ? (acct.bpl_card ? "low" : "medium") : (data.income_bracket || 'unknown'),
      has_smartphone: acct?.has_smartphone !== undefined ? acct.has_smartphone : (data.has_smartphone || false),
      location: acct?.location || data.location || 'unknown',
      fraud_risk: acct ? (acct.fraud_history ? "high" : "low") : (data.fraud_risk || 'medium'),
      eligible_schemes: acct?.linked_schemes || [],
      concern: data.concern || '',
      scheme_exp: data.scheme_exp || '',
    };

    // ── AI Relationship Manager: build snapshot + proactive nudges ──
    let rmNudges = [];
    try {
      const snapshot = await buildFinancialSnapshot(supabase, accountId);
      if (snapshot) {
        rmNudges = generateProactiveNudges(snapshot, language);
        // Cache snapshot on profile so chat.js can reuse without re-querying
        profile.financial_snapshot = snapshot;
      }
    } catch (rmError) {
      // Non-fatal: RM layer failure should not block onboarding
      console.error('[onboard] RM snapshot error (non-fatal):', rmError.message);
    }

    // Upsert session
    const { error: upsertError } = await supabase.from('sessions').upsert({
      session_id: accountId,
      account_id: accountId,
      profile,
      conversation_history: [],
      created_at: new Date().toISOString(),
    }, { onConflict: 'session_id' });

    if (upsertError) {
      console.error('[onboard] Upsert session error:', upsertError);
      return res.status(500).json({ status: 'error', message: 'Failed to create session', detail: upsertError.message });
    }

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
      rm_nudges: rmNudges,
    });
  } catch (error) {
    console.error('[onboard] Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error', detail: error.message });
  }
}
