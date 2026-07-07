/**
 * api/_lib/intent-classifier.js — Intent Classification
 *
 * Ported from backend/core/llm_router.py.
 * Keyword-based intent classification with Gemini LLM fallback.
 * Supports Hindi (romanized + Devanagari), Kannada (romanized + script), English.
 */

import { callGemini } from './gemini-pool.js';

// ── Intent Keyword Maps (multilingual) ─────────────────────────

const INTENT_KEYWORDS = {
  banking: [
    // English
    'balance', 'account', 'bank', 'statement', 'passbook', 'withdraw',
    'deposit', 'transfer', 'savings', 'current account', 'fixed deposit', 'fd', 'invest',
    'installment', 'emi', 'reminder', 'loan', 'outstanding', 'spending',
    'budget', 'kharcha', 'spent',
    // Hindi (romanized)
    'khata', 'bachat', 'jama', 'nikalna', 'paisa',
    'baaki', 'rashi', 'kist', 'kisto', 'karz', 'udhar', 'rin', 'nivesh',
    // Hindi (Devanagari)
    'बैलेंस', 'खाता', 'बैंक', 'बचत', 'जमा', 'निकालना', 'पैसा',
    'बाकी', 'राशि', 'शेष', 'किस्त', 'ईएमआई', 'कर्ज', 'लोन',
    'खर्चा', 'बजट', 'फिक्स्ड डिपॉजिट', 'एफडी', 'निवेश',
    // Kannada (romanized)
    'ulitaaya',
    // Kannada (script)
    'ಬ್ಯಾಲೆನ್ಸ್', 'ಖಾತೆ', 'ಬ್ಯಾಂಕ್', 'ಉಳಿತಾಯ', 'ಹಣ',
    'ಕಂತು', 'ಇಎಂಐ', 'ಸಾಲ', 'ಲೋನ್', 'ಖರ್ಚು', 'ಬಜೆಟ್',
    'ಫಿಕ್ಸೆಡ್ ಡೆಪಾಸಿಟ್', 'ಎಫ್\u200cಡಿ', 'ಹೂಡಿಕೆ',
  ],
  schemes: [
    // English
    'scheme', 'yojana', 'government', 'subsidy', 'pension', 'eligib',
    'apply', 'benefit', 'ration', 'card', 'insurance',
    // Hindi (romanized)
    'sarkari', 'labh', 'bima',
    'kisan', 'awas', 'mudra', 'ujjwala', 'jan dhan',
    // Hindi (Devanagari)
    'योजना', 'सरकारी', 'पेंशन', 'लाभ', 'राशन', 'बीमा',
    'किसान', 'आवास', 'मुद्रा', 'उज्ज्वला', 'जन धन',
    // Kannada (romanized)
    'yojane',
    // Kannada (script)
    'ಯೋಜನೆ', 'ಸರ್ಕಾರಿ', 'ಪಿಂಚಣಿ', 'ಲಾಭ',
    // Scheme names (universal)
    'PM-KISAN', 'PMJDY', 'PMSBY', 'PMJJBY', 'MGNREGA',
    'PM Awas', 'Ujjwala', 'Mudra', 'Jan Dhan',
  ],
  payments: [
    // English
    'pay', 'send money', 'UPI', 'recharge', 'bill', 'electricity',
    'mobile recharge', 'DTH', 'EMI', 'loan',
    // Hindi (romanized)
    'bhejo', 'bhejdo', 'payment', 'bijli',
    'karo',
    // Hindi (Devanagari)
    'भेजो', 'भुगतान', 'रिचार्ज', 'बिजली', 'बिल', 'किस्त',
    // Kannada (romanized)
    'kalisi',
    // Kannada (script)
    'ಕಳಿಸಿ', 'ಪಾವತಿ', 'ರೀಚಾರ್ಜ್', 'ಬಿಲ್',
  ],
  fraud: [
    // English
    'fraud', 'scam', 'cheat', 'fake', 'stolen', 'hack', 'phishing',
    'suspicious', 'unauthorized',
    // Hindi (romanized)
    'dhokha', 'thug', 'chori', 'loot', 'OTP',
    'jhooth',
    // Hindi (Devanagari)
    'धोखा', 'ठग', 'चोरी', 'लूट', 'फ्रॉड', 'स्कैम',
    // Kannada (romanized)
    'vanchane', 'mosadi',
    // Kannada (script)
    'ವಂಚನೆ', 'ಮೋಸ', 'ಕಳ್ಳತನ',
  ],
  literacy: [
    // English
    'what is', 'how to', 'explain', 'teach', 'learn', 'meaning',
    'help me understand', 'what does',
    // Hindi (romanized)
    'kya hai', 'kaise', 'samjhao', 'batao', 'sikhao', 'matlab',
    // Hindi (Devanagari)
    'क्या है', 'कैसे', 'समझाओ', 'बताओ', 'सिखाओ', 'मतलब',
    // Kannada (romanized)
    'enu', 'hege', 'helkodi', 'artham',
    // Kannada (script)
    'ಏನು', 'ಹೇಗೆ', 'ಹೇಳ್ಕೊಡಿ', 'ಅರ್ಥ',
  ],
  greeting: [
    // English
    'hello', 'hi', 'hey', 'good morning', 'good evening',
    'thank', 'thanks', 'bye', 'goodbye',
    // Hindi (romanized)
    'namaste', 'namaskar', 'dhanyavaad', 'shukriya', 'alvida',
    // Hindi (Devanagari)
    'नमस्ते', 'नमस्कार', 'धन्यवाद', 'शुक्रिया', 'अलविदा',
    // Kannada (romanized)
    'namaskara', 'dhanyavaada', 'hogi bartini',
    // Kannada (script)
    'ನಮಸ್ಕಾರ', 'ಧನ್ಯವಾದ',
  ],
};

const VALID_INTENTS = Object.keys(INTENT_KEYWORDS);

// Tie-breaking priority order (fraud highest, greeting lowest)
const PRIORITY_ORDER = ['fraud', 'banking', 'schemes', 'payments', 'literacy', 'greeting'];

// ── Keyword-Based Classification ───────────────────────────────

/**
 * Score text against keyword lists for each intent.
 *
 * @param {string} text - User message
 * @returns {{ intent, confidence, scores }}
 */
function classifyByKeywords(text) {
  const textLower = text.toLowerCase().trim();
  const scores = {};

  for (const intent of VALID_INTENTS) {
    scores[intent] = 0;
  }

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        scores[intent]++;
      }
    }
  }

  const maxScore = Math.max(...Object.values(scores));

  if (maxScore === 0) {
    return { intent: 'greeting', confidence: 'low', scores };
  }

  // Find all intents with the max score
  const topIntents = Object.keys(scores).filter((k) => scores[k] === maxScore);

  if (topIntents.length === 1) {
    const confidence = maxScore >= 2 ? 'high' : 'medium';
    return { intent: topIntents[0], confidence, scores };
  }

  // Tie-breaking by priority order
  for (const priority of PRIORITY_ORDER) {
    if (topIntents.includes(priority)) {
      return { intent: priority, confidence: 'medium', scores };
    }
  }

  return { intent: topIntents[0], confidence: 'low', scores };
}

// ── LLM-Based Classification (Fallback) ────────────────────────

/**
 * Use Gemini to classify intent when keyword matching is ambiguous.
 */
async function classifyByLLM(supabase, text) {
  const systemPrompt =
    'You are an intent classifier for an Indian rural financial assistant.\n' +
    'Classify the user message into EXACTLY ONE of these categories:\n' +
    '  banking, schemes, payments, fraud, literacy, greeting\n\n' +
    'Rules:\n' +
    "- 'banking' = balance checks, account info, statements, deposits, withdrawals\n" +
    "- 'schemes' = government schemes, yojana, eligibility, applications\n" +
    "- 'payments' = sending money, UPI, recharge, bills, EMI\n" +
    "- 'fraud' = scam reports, suspicious activity, OTP/PIN requests\n" +
    "- 'literacy' = financial education, explanations, 'what is X'\n" +
    "- 'greeting' = hello, thanks, bye, general conversation\n\n" +
    'Respond with ONLY the category name, nothing else.';

  try {
    const result = await callGemini(
      supabase,
      systemPrompt,
      `User message: "${text}"`,
      [],
      10
    );

    let classified = result.text.toLowerCase().trim();

    if (VALID_INTENTS.includes(classified)) return classified;

    // Partial match
    for (const intent of VALID_INTENTS) {
      if (classified.includes(intent)) return intent;
    }

    return 'greeting';
  } catch (e) {
    console.warn('[intent-classifier] LLM fallback failed:', e.message);
    return 'greeting';
  }
}

// ── Main Classifier ────────────────────────────────────────────

/**
 * Classify the user's intent from their message.
 *
 * Strategy:
 *   1. Keyword-based classification first (fast, offline)
 *   2. If ambiguous and Gemini available, use LLM
 *   3. Default fallback → "greeting"
 *
 * @param {string} text - User message
 * @param {object|null} supabase - Supabase client (for LLM fallback)
 * @returns {Promise<string>} Intent label
 */
export async function classifyIntent(text, supabase = null) {
  const keywordResult = classifyByKeywords(text);

  if (keywordResult.confidence === 'high') {
    return keywordResult.intent;
  }

  // If low confidence and supabase is available, try LLM
  if (keywordResult.confidence === 'low' && supabase) {
    try {
      const llmIntent = await classifyByLLM(supabase, text);
      if (VALID_INTENTS.includes(llmIntent)) {
        return llmIntent;
      }
    } catch (e) {
      // Fall through to keyword result
    }
  }

  return keywordResult.intent;
}

export { VALID_INTENTS, INTENT_KEYWORDS };
