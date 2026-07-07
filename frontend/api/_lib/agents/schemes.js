/**
 * api/_lib/agents/schemes.js — Government Schemes Agent
 * Ported from backend/agents/specialist_agents.py SchemesAgent
 */

import { callGemini } from '../gemini-pool.js';
import { getSystemPromptLanguageInstruction } from '../language-layer.js';

// ── Scheme Search ──────────────────────────────────────────────

async function searchSchemes(supabase, query) {
  const textLower = query.toLowerCase();
  const words = textLower.split(/\s+/).filter(w => w.length > 2);

  // Fetch all schemes
  const { data: schemes } = await supabase
    .from('schemes_database').select('*');

  if (!schemes || schemes.length === 0) return [];

  const scored = schemes.map(s => {
    let score = 0;
    const nameL = (s.name || '').toLowerCase();
    const descL = (s.description || '').toLowerCase();
    const tags = (s.tags || []).join(' ').toLowerCase();

    for (const word of words) {
      if (nameL.includes(word)) score += 10;
      if (descL.includes(word)) score += 5;
      if (tags.includes(word)) score += 3;
    }
    return { score, scheme: s };
  }).filter(x => x.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map(x => x.scheme);
}

// ── Recommendation Engine ──────────────────────────────────────

const INCOME_MAP = {
  '₹0 – ₹5,000': 60000, '₹5,000 – ₹15,000': 180000,
  '₹15,000 – ₹30,000': 360000, '₹30,000+': 999999,
  'low': 100000, 'medium': 300000, 'high': 600000, 'unknown': 200000,
};

const OCC_MAP = {
  'farmer': ['farmer'], 'farm_labour': ['labour'], 'shop_owner': ['entrepreneur'],
  'daily_wager': ['labour'], 'homemaker': ['any'], 'unemployed': ['any'],
  'unknown': ['any'],
};

async function getRecommendations(supabase, context) {
  const { data: schemes } = await supabase.from('schemes_database').select('*');
  if (!schemes) return 'No schemes available.';

  const income = INCOME_MAP[context.income_bracket] || 200000;
  const occTags = OCC_MAP[context.occupation] || ['any'];
  const enrolled = context.eligible_schemes || [];

  const scored = schemes.map(s => {
    let score = 0;
    const elig = s.eligibility || {};

    // Occupation match
    if (elig.occupation) {
      const schemeOcc = Array.isArray(elig.occupation) ? elig.occupation : [elig.occupation];
      if (schemeOcc.includes('any') || occTags.some(t => schemeOcc.includes(t))) score += 10;
    } else { score += 5; }

    // Income match
    if (elig.max_income && income <= elig.max_income) score += 5;
    else if (!elig.max_income) score += 3;

    // Not already enrolled
    if (!enrolled.includes(s.name) && !enrolled.includes(s.id)) score += 2;

    return { score, scheme: s };
  }).filter(x => x.score > 5);

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 5);

  if (top.length === 0) return 'No specific recommendations.';
  return top.map(x => `- ${x.scheme.name}: ${x.scheme.benefits}`).join('\n');
}

// ── Enrollment Detection ───────────────────────────────────────

const ENROLL_KEYWORDS = [
  'enroll', 'register', 'apply', 'chahiye', 'karna hai',
  'sign up', 'join', 'lagao',
  'नामांकन', 'रजिस्टर', 'लगाओ', 'चाहिए', 'करना है',
  'ನೋಂದಣಿ', 'ಅಪ್ಲೈ', 'ಮಾಡಿ', 'ಬೇಕು',
];

function wantsEnrollment(text) {
  const lower = text.toLowerCase();
  return ENROLL_KEYWORDS.some(kw => lower.includes(kw));
}

// ── Main Agent Run ─────────────────────────────────────────────

export async function runSchemesAgent(supabase, context, userMessage, history) {
  const accountId = context.account_id || 'UNKNOWN';

  const searchResults = await searchSchemes(supabase, userMessage);
  const recommendations = await getRecommendations(supabase, context);

  // Fetch enrolled schemes
  const { data: acct } = await supabase
    .from('accounts').select('linked_schemes').eq('account_id', accountId).single();
  const enrolledSchemes = acct?.linked_schemes || [];

  let enrollmentBlock = '';
  if (wantsEnrollment(userMessage)) {
    enrollmentBlock = '\nUser wants to enroll in a scheme. Guide them with required documents.\n';
  }

  const searchBlock = searchResults.length > 0
    ? '\nSchemes matching query:\n' + searchResults.map(s =>
        `- ${s.name} (${s.ministry}): ${s.benefits}. Documents: ${(s.documents_required || []).join(', ')}`
      ).join('\n') + '\n'
    : '';

  const lang = context.language || 'hi';
  const langInstruction = getSystemPromptLanguageInstruction(lang);

  const systemPrompt = `You are a government schemes advisor for rural India.
${langInstruction}
User: ${context.name || 'User'}, Occupation: ${context.occupation || 'unknown'}
Enrolled schemes: ${JSON.stringify(enrolledSchemes)}
${searchBlock}
Top recommendations:
${recommendations}
${enrollmentBlock}
Rules:
- Answer from scheme data ONLY. Do not invent schemes.
- If user asks about a specific scheme, give: name, benefits, documents needed.
- If user asks "which schemes for me", list top 3-5 recommendations.
- Max 3-4 sentences. Mention exact amounts. Use simple words.`;

  const messages = [...(history || []).slice(-6), { role: 'user', content: userMessage }];
  const result = await callGemini(supabase, systemPrompt, userMessage, messages.slice(0, -1), 200);

  return {
    response: result.text,
    model_used: result.model_used,
    agent: 'schemes',
    key_index: result.key_index,
  };
}
