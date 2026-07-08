/**
 * api/_lib/agents/schemes.js — Government Schemes Agent
 * Ported from backend/agents/specialist_agents.py SchemesAgent
 */

import { callGemini } from '../gemini-pool.js';
import { getSystemPromptLanguageInstruction } from '../language-layer.js';

// Format values to Indian Currency format (Lakh/Crore system)
function formatINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
  return Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

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
    .from('accounts').select('linked_schemes, occupation, bpl_card, land_acres, age, gender').eq('account_id', accountId).single();
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

  // ── Explainable Eligibility Reasoning (B3) ──────────────────
  // Query the government_schemes table for structured eligibility_criteria
  const { data: govSchemes } = await supabase
    .from('government_schemes').select('name, eligibility_criteria, benefit_amount, frequency');

  let eligibilityReasoning = '';
  if (govSchemes && acct) {
    const reasoningLines = [];
    for (const scheme of govSchemes) {
      const criteria = scheme.eligibility_criteria || {};
      const checks = [];
      let eligible = true;

      // Occupation check
      if (criteria.occupation && !criteria.occupation.includes('any')) {
        const match = criteria.occupation.includes(acct.occupation);
        checks.push(match
          ? `  ✅ Occupation: ${acct.occupation} (required: ${criteria.occupation.join('/')})`
          : `  ❌ Occupation: ${acct.occupation || 'unknown'} (required: ${criteria.occupation.join('/')})`);
        if (!match) eligible = false;
      } else {
        checks.push(`  ✅ Occupation: Any (no restriction)`);
      }

      // BPL check
      if (criteria.bpl_required) {
        const match = !!acct.bpl_card;
        checks.push(match ? `  ✅ BPL Card: Yes` : `  ❌ BPL Card: No (required)`);
        if (!match) eligible = false;
      }

      // Land check
      if (criteria.land_required) {
        const match = acct.land_acres > 0;
        checks.push(match ? `  ✅ Land ownership: ${acct.land_acres} acres` : `  ❌ Land ownership: None (required)`);
        if (!match) eligible = false;
      }

      // Age check
      if (criteria.age_range) {
        const [minAge, maxAge] = criteria.age_range;
        const userAge = acct.age || 0;
        const match = userAge >= minAge && userAge <= maxAge;
        checks.push(match
          ? `  ✅ Age: ${userAge} years (range: ${minAge}-${maxAge})`
          : `  ❌ Age: ${userAge} years (required: ${minAge}-${maxAge})`);
        if (!match) eligible = false;
      }

      // Gender check
      if (criteria.gender && criteria.gender !== 'any') {
        const match = acct.gender === criteria.gender;
        checks.push(match
          ? `  ✅ Gender: ${acct.gender}`
          : `  ❌ Gender: ${acct.gender || 'unknown'} (required: ${criteria.gender})`);
        if (!match) eligible = false;
      }

      // Max income check
      if (criteria.max_income) {
        checks.push(`  ℹ️ Max income limit: ₹${formatINR(criteria.max_income)}/year`);
      }

      const status = enrolledSchemes.some(e => scheme.name.toLowerCase().includes(e.toLowerCase()) || e.toLowerCase().includes(scheme.name.toLowerCase()))
        ? '🟢 ENROLLED'
        : eligible ? '🟡 ELIGIBLE (not enrolled)' : '🔴 NOT ELIGIBLE';

      reasoningLines.push(`${scheme.name} [${status}] — Benefit: ₹${scheme.benefit_amount || 'N/A'} ${scheme.frequency || ''}\n${checks.join('\n')}`);
    }
    eligibilityReasoning = `\n[ELIGIBILITY REASONING — per-criterion breakdown for user]\n${reasoningLines.join('\n\n')}\n`;
  }

  const lang = context.language || 'hi';
  
  // Try to generate local hardcoded response to bypass Gemini
  const localResponse = formatLocalizedSchemes(userMessage, enrolledSchemes, recommendations, lang);
  if (localResponse) {
    return {
      response: localResponse,
      model_used: 'local-logic',
      agent: 'schemes',
      key_index: -1,
    };
  }

  const langInstruction = getSystemPromptLanguageInstruction(lang);

  const systemPrompt = `You are a government schemes advisor for rural India.
${langInstruction}
User: ${context.name || 'User'}, Occupation: ${context.occupation || 'unknown'}
Enrolled schemes: ${JSON.stringify(enrolledSchemes)}
${searchBlock}
Top recommendations:
${recommendations}
${enrollmentBlock}
${eligibilityReasoning}

[TASK]
Guide the user regarding government schemes. Keep responses simple and reassuring for rural users.
IMPORTANT: When explaining eligibility, use the per-criterion breakdown above to show WHY the user qualifies or doesn't qualify. Use ✅/❌ symbols for clarity. For schemes the user is NOT eligible for, explain exactly which criteria failed and what would need to change.

[FEW-SHOT EXAMPLES]
---
Example 1: Eligibility check
- Hindi (hi):
  Query: "क्या मैं पीएम-किसान के लिए पात्र हूँ?"
  Response: आपकी प्रोफाइल के अनुसार, आप पीएम-किसान योजना के लिए पात्र हैं जिसके तहत सालाना ₹${formatINR(6000)} की वित्तीय मदद मिलती है। आवेदन करने के लिए आधार और जमीन के दस्तावेज आवश्यक हैं। अपना ओटीपी या पिन कभी किसी के साथ साझा न करें।
- Kannada (kn):
  Query: "ನಾನು ಪಿಎಂ-ಕಿಸಾನ್ ಯೋಜನೆಗೆ ಅರ್ಹನೇ?"
  Response: ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಪ್ರಕಾರ, ನೀವು ಪಿಎಂ-ಕಿಸಾನ್ ಯೋಜನೆಗೆ ಅರ್ಹರಾಗಿದ್ದೀರಿ ಮತ್ತು ವರ್ಷಕ್ಕೆ ₹${formatINR(6000)} ಆರ್ಥಿಕ ನೆರವು ಪಡೆಯಬಹುದು. ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಆಧಾರ್ ಮತ್ತು ಜಮೀನು ದಾಖಲೆಗಳು ಬೇಕು. ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.
- English (en):
  Query: "Am I eligible for PM-KISAN?"
  Response: Based on your profile, you are eligible for PM-KISAN which provides ₹${formatINR(6000)} per year. You need Aadhaar card and land ownership records to apply. Never share your OTP or PIN.

Example 2: Scheme details request
- Hindi (hi):
  Query: "आयुष्मान भारत योजना क्या है?"
  Response: आयुष्मान भारत योजना के तहत प्रति परिवार को सालाना ₹${formatINR(500000)} तक का मुफ्त इलाज सूचीबद्ध अस्पतालों में मिलता है। इसके लिए आधार कार्ड और राशन कार्ड आवश्यक हैं। अपना ओटीपी या पिन कभी किसी के साथ साझा न करें।
- Kannada (kn):
  Query: "ಆಯುಷ್ಮಾನ್ ಭಾರತ ಯೋಜನೆ ಎಂದರೇನು?"
  Response: ಆಯುಷ್ಮಾನ್ ಭಾರತ ಯೋಜನೆಯು ಕುಟುಂಬಕ್ಕೆ ವರ್ಷಕ್ಕೆ ₹${formatINR(500000)}ವರೆಗೆ ಉಚಿತ ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆ ನೀಡುತ್ತದೆ. ಇದಕ್ಕೆ ಆಧಾರ್ ಮತ್ತು ರೇಷನ್ ಕಾರ್ಡ್ ಅಗತ್ಯವಿದೆ. ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.
- English (en):
  Query: "What is Ayushman Bharat Yojana?"
  Response: Ayushman Bharat provides free medical health cover up to ₹${formatINR(500000)} per family per year at empaneled hospitals. Required documents are Aadhaar card and Ration card. Never share your OTP or PIN.
---

[CRITICAL RULES]
1. Answer from scheme data ONLY. Do not invent schemes.
2. If user asks about a specific scheme, give: name, benefits, and required documents.
3. Keep responses extremely concise (maximum 3-4 sentences) using simple words.
4. Ensure currency values are formatted in Indian Style with ₹ prefix (using Lakhs/Crores where appropriate, e.g. ₹5,00,000.00).
5. Safety Warning: You MUST end your response with the language-specific safety warning suffix exactly as follows:
   - English: Never share your OTP or PIN.
   - Hindi: अपना ओटीपी या पिन कभी किसी के साथ साझा न करें।
   - Kannada: ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.`;

  const messages = [...(history || []).slice(-6), { role: 'user', content: userMessage }];
  const result = await callGemini(supabase, systemPrompt, userMessage, messages.slice(0, -1), 1000);

  return {
    response: result.text,
    model_used: result.model_used,
    agent: 'schemes',
    key_index: result.key_index,
  };
}

// ── Local Schemes Formatter ────────────────────────────────────

function formatLocalizedSchemes(userMessage, enrolled, recommendations, lang) {
  const textLower = userMessage.toLowerCase();
  const isHi = lang === 'hi';
  const isKn = lang === 'kn';

  const suffix = isHi 
    ? ' अपना ओटीपी या पिन कभी किसी के साथ साझा न करें।' 
    : isKn 
      ? ' ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.' 
      : ' Never share your OTP or PIN.';

  // 1. Recommendation queries
  const recKeywords = ['which scheme', 'recommend', 'eligible', 'list scheme', 'yojna', 'योजना', 'ಯೋಜನೆ'];
  if (recKeywords.some(k => textLower.includes(k))) {
    const recList = recommendations || '';
    const enrolledStr = enrolled.length > 0 ? enrolled.join(', ') : (isHi ? 'कोई नहीं' : isKn ? 'ಯಾವುದೂ ಇಲ್ಲ' : 'None');

    if (isHi) {
      return `आपकी प्रोफाइल के आधार पर, आपके लिए अनुशंसित योजनाएं इस प्रकार हैं:\n${recList}\n\nआप पहले से नामांकित हैं: ${enrolledStr}` + suffix;
    }
    if (isKn) {
      return `ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಆಧಾರದ ಮೇಲೆ, ನಿಮಗಾಗಿ ಶಿಫಾರಸು ಮಾಡಲಾದ ಯೋಜನೆಗಳು:\n${recList}\n\nನೀವು ಈಗಾಗಲೇ ನೋಂದಾಯಿಸಿಕೊಂಡಿರುವ ಯೋಜನೆಗಳು: ${enrolledStr}` + suffix;
    }
    return `Based on your profile, here are your top recommended schemes:\n${recList}\n\nYou are already enrolled in: ${enrolledStr}` + suffix;
  }

  // 2. PM-KISAN queries
  if (['pm-kisan', 'pm kisan', 'किसान सम्मान', 'ಕಿಸಾನ್'].some(k => textLower.includes(k))) {
    if (isHi) {
      return `PM-KISAN योजना के तहत पात्र किसानों को सालाना ₹${formatINR(6000)} की वित्तीय मदद 3 किस्तों में मिलती है। जरूरी दस्तावेज: आधार कार्ड और जमीन के दस्तावेज। आप नजदीकी जन सेवा केंद्र पर आवेदन कर सकते हैं।` + suffix;
    }
    if (isKn) {
      return `ಪಿಎಂ-ಕಿಸಾನ್ ಯೋಜನೆಯು ಅರ್ಹ ರೈತರಿಗೆ ವರ್ಷಕ್ಕೆ ₹${formatINR(6000)} ಆರ್ಥಿಕ ನೆರವು ನೀಡುತ್ತದೆ. ಅಗತ್ಯ ದಾಖಲೆಗಳು: ಆಧಾರ ಕಾರ್ಡ್ ಮತ್ತು ಜಮೀನು ದಾಖಲೆಗಳು. ಹತ್ತಿರದ ನಾಗರಿಕ ಸೇವಾ ಕೇಂದ್ರದಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.` + suffix;
    }
    return `PM-KISAN provides ₹${formatINR(6000)}/year to eligible farmers in three installments. Required documents: Aadhaar card and land ownership records. Apply online or at your nearest CSC.` + suffix;
  }

  // 3. Ujjwala queries
  if (['ujjwala', 'gas cylinder', 'उज्ज्वला', 'ಉಜ್ವಲ'].some(k => textLower.includes(k))) {
    if (isHi) {
      return "पीएम उज्ज्वला योजना बीपीएल परिवारों की महिलाओं को मुफ्त एलपीजी गैस कनेक्शन प्रदान करती है। जरूरी दस्तावेज: बीपीएल कार्ड, आधार कार्ड और फोटो। आवेदन के लिए नजदीकी गैस वितरक से संपर्क करें।" + suffix;
    }
    if (isKn) {
      return "ಪಿಎಂ ಉಜ್ವಲ ಯೋಜನೆಯು ಬಿಪಿಎಲ್ ಕುಟುಂಬದ ಮಹಿಳೆಯರಿಗೆ ಉಚಿತ್ ಗ್ಯಾಸ್ ಕನೆಕ್ಷನ್ ನೀಡುತ್ತದೆ. ಅಗತ್ಯ ದಾಖಲೆಗಳು: ಬಿಪಿಎಲ್ ಕಾರ್ಡ್ ಮತ್ತು ಆಧಾರ್ ಕಾರ್ಡ್. ಹತ್ತಿರದ ಗ್ಯಾಸ್ ಏಜೆನ್ಸಿಯಲ್ಲಿ ಸಂಪರ್ಕಿಸಿ." + suffix;
    }
    return "PM Ujjwala Yojana provides a free LPG cylinder connection to women from BPL households. Required documents: BPL card, Aadhaar card, and photo. Apply at your nearest gas distributor." + suffix;
  }

  // 4. Ayushman Bharat queries
  if (['ayushman', 'health card', 'medical insurance', 'आयुष्मान', 'ಆಯುಷ್ಮಾನ್'].some(k => textLower.includes(k))) {
    if (isHi) {
      return `आयुष्मान भारत योजना के तहत प्रति परिवार को सालाना ₹${formatINR(500000)} तक का मुफ्त इलाज सूचीबद्ध अस्पतालों में मिलता है। जरूरी दस्तावेज: आधार कार्ड और राशन कार्ड। pmjay.gov.in पर पात्रता जांचें।` + suffix;
    }
    if (isKn) {
      return `ಆಯುಷ್ಮಾನ್ ಭಾರತ ಯೋಜನೆಯು ಕುಟುಂಬಕ್ಕೆ ವರ್ಷಕ್ಕೆ ₹${formatINR(500000)}ವರೆಗೆ ಉಚಿತ ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆ ನೀಡುತ್ತದೆ. ಅಗತ್ಯ ದಾಖಲೆಗಳು: ಆಧಾರ್ ಕಾರ್ಡ್ ಮತ್ತು ರೇಷನ್ ಕಾರ್ಡ್. pmjay.gov.in ನಲ್ಲಿ ಪರಿಶೀಲಿಸಿ.` + suffix;
    }
    return `Ayushman Bharat provides free medical health cover up to ₹${formatINR(500000)} per family per year at empaneled hospitals. Required documents: Aadhaar card and Ration card. Check eligibility at pmjay.gov.in.` + suffix;
  }

  return null;
}
