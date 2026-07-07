/**
 * api/_lib/language-layer.js — Language Intelligence Layer
 *
 * Ported from backend/core/language_layer.py.
 * Handles multilingual support: language detection via Unicode ranges,
 * fraud pattern matching, greetings, and system prompt language instructions.
 *
 * Primary languages: Hindi (hi), Kannada (kn)
 * Secondary languages: Tamil, Telugu, Bengali, Marathi, Odia, Punjabi, Gujarati, English
 */

// ── 1. LANGUAGE_CONFIG ─────────────────────────────────────────

export const LANGUAGE_CONFIG = {
  hi: {
    code: 'hi',
    name_english: 'Hindi',
    name_native: 'हिन्दी',
    bhashini_code: 'hi',
    sarvam_code: 'hi-IN',
    is_primary: true,
  },
  kn: {
    code: 'kn',
    name_english: 'Kannada',
    name_native: 'ಕನ್ನಡ',
    bhashini_code: 'kn',
    sarvam_code: 'kn-IN',
    is_primary: true,
  },
  ta: {
    code: 'ta',
    name_english: 'Tamil',
    name_native: 'தமிழ்',
    bhashini_code: 'ta',
    sarvam_code: 'ta-IN',
    is_primary: false,
  },
  te: {
    code: 'te',
    name_english: 'Telugu',
    name_native: 'తెలుగు',
    bhashini_code: 'te',
    sarvam_code: 'te-IN',
    is_primary: false,
  },
  bn: {
    code: 'bn',
    name_english: 'Bengali',
    name_native: 'বাংলা',
    bhashini_code: 'bn',
    sarvam_code: 'bn-IN',
    is_primary: false,
  },
  mr: {
    code: 'mr',
    name_english: 'Marathi',
    name_native: 'मराठी',
    bhashini_code: 'mr',
    sarvam_code: 'mr-IN',
    is_primary: false,
  },
  or: {
    code: 'or',
    name_english: 'Odia',
    name_native: 'ଓଡ଼ିଆ',
    bhashini_code: 'or',
    sarvam_code: 'or-IN',
    is_primary: false,
  },
  pa: {
    code: 'pa',
    name_english: 'Punjabi',
    name_native: 'ਪੰਜਾਬੀ',
    bhashini_code: 'pa',
    sarvam_code: 'pa-IN',
    is_primary: false,
  },
  gu: {
    code: 'gu',
    name_english: 'Gujarati',
    name_native: 'ગુજરાતી',
    bhashini_code: 'gu',
    sarvam_code: 'gu-IN',
    is_primary: false,
  },
  en: {
    code: 'en',
    name_english: 'English',
    name_native: 'English',
    bhashini_code: 'en',
    sarvam_code: 'en-IN',
    is_primary: false,
  },
};

export const PRIMARY_LANGUAGES = Object.keys(LANGUAGE_CONFIG).filter(
  (code) => LANGUAGE_CONFIG[code].is_primary
);
export const ALL_LANGUAGE_CODES = Object.keys(LANGUAGE_CONFIG);
export const DEFAULT_LANGUAGE = 'hi';

// ── 2. Unicode Script Ranges for Language Detection ────────────

const SCRIPT_RANGES = [
  // [start, end, language_code, script_name]
  [0x0900, 0x097f, 'hi', 'Devanagari'], // Hindi / Marathi / Sanskrit
  [0x0c80, 0x0cff, 'kn', 'Kannada'],
  [0x0b80, 0x0bff, 'ta', 'Tamil'],
  [0x0c00, 0x0c7f, 'te', 'Telugu'],
  [0x0980, 0x09ff, 'bn', 'Bengali'],
  [0x0b00, 0x0b7f, 'or', 'Odia'],
  [0x0a80, 0x0aff, 'gu', 'Gujarati'],
  [0x0a00, 0x0a7f, 'pa', 'Gurmukhi'], // Punjabi
];

/**
 * Detect language from text using Unicode character ranges.
 *
 * Strategy:
 *   1. Count chars belonging to each known Indic script block
 *   2. Script with most chars wins
 *   3. Only ASCII → "en"
 *   4. Fallback → "hi"
 *
 * @param {string} text - Input text
 * @returns {string} ISO 639-1 language code
 */
export function detectLanguage(text) {
  if (!text || !text.trim()) return DEFAULT_LANGUAGE;

  const scriptCounts = {};
  let asciiCount = 0;
  let totalAlpha = 0;

  for (const char of text) {
    const cp = char.codePointAt(0);

    // Skip non-alpha
    if (!/\p{L}/u.test(char)) continue;

    totalAlpha++;

    // ASCII / Latin
    if (cp < 0x0080) {
      asciiCount++;
      continue;
    }

    // Check Indic scripts
    for (const [start, end, langCode] of SCRIPT_RANGES) {
      if (cp >= start && cp <= end) {
        scriptCounts[langCode] = (scriptCounts[langCode] || 0) + 1;
        break;
      }
    }
  }

  if (totalAlpha === 0) return DEFAULT_LANGUAGE;

  // If Indic script characters found, pick dominant
  const scriptKeys = Object.keys(scriptCounts);
  if (scriptKeys.length > 0) {
    return scriptKeys.reduce((a, b) =>
      scriptCounts[a] >= scriptCounts[b] ? a : b
    );
  }

  // All ASCII → English
  if (asciiCount > 0) return 'en';

  return DEFAULT_LANGUAGE;
}

// ── 3. System Prompt Language Instructions ─────────────────────

const LANGUAGE_INSTRUCTIONS = {
  hi:
    'You MUST respond entirely in simple Hindi (Devanagari script). ' +
    'Use short sentences. Avoid English words except for proper nouns ' +
    'like scheme names. This user has low literacy — use the simplest ' +
    'possible Hindi.',
  kn:
    'You MUST respond entirely in simple Kannada (Kannada script). ' +
    'Use short sentences. Avoid English words except for proper nouns ' +
    'like scheme names. This user has low literacy — use the simplest ' +
    'possible Kannada.',
  ta:
    'You MUST respond entirely in simple Tamil (Tamil script). ' +
    'Use short sentences. Avoid English words except for proper nouns. ' +
    'This user has low literacy — use the simplest possible Tamil.',
  te:
    'You MUST respond entirely in simple Telugu (Telugu script). ' +
    'Use short sentences. Avoid English words except for proper nouns. ' +
    'This user has low literacy — use the simplest possible Telugu.',
  bn:
    'You MUST respond entirely in simple Bengali (Bengali script). ' +
    'Use short sentences. Avoid English words except for proper nouns. ' +
    'This user has low literacy — use the simplest possible Bengali.',
  mr:
    'You MUST respond entirely in simple Marathi (Devanagari script). ' +
    'Use short sentences. Avoid English words except for proper nouns. ' +
    'This user has low literacy — use the simplest possible Marathi.',
  or:
    'You MUST respond entirely in simple Odia (Odia script). ' +
    'Use short sentences. Avoid English words except for proper nouns. ' +
    'This user has low literacy — use the simplest possible Odia.',
  pa:
    'You MUST respond entirely in simple Punjabi (Gurmukhi script). ' +
    'Use short sentences. Avoid English words except for proper nouns. ' +
    'This user has low literacy — use the simplest possible Punjabi.',
  gu:
    'You MUST respond entirely in simple Gujarati (Gujarati script). ' +
    'Use short sentences. Avoid English words except for proper nouns. ' +
    'This user has low literacy — use the simplest possible Gujarati.',
  en:
    'You MUST respond in simple, clear English. ' +
    'Use short sentences and avoid jargon. ' +
    'This user may have low literacy — use very simple words.',
};

const SAFETY_SUFFIX =
  '\n\nCRITICAL SAFETY RULES:\n' +
  '- Never ask for OTP, PIN, or password.\n' +
  '- Never ask for bank account credentials.\n' +
  '- Always end responses about money with a fraud safety reminder.\n' +
  '- If the user mentions sharing OTP or PIN, immediately warn them it is a scam.';

/**
 * Get language instruction string for agent system prompts.
 *
 * @param {string} langCode - ISO 639-1 language code
 * @returns {string} System prompt fragment
 */
export function getSystemPromptLanguageInstruction(langCode) {
  const instruction =
    LANGUAGE_INSTRUCTIONS[langCode] || LANGUAGE_INSTRUCTIONS[DEFAULT_LANGUAGE];
  const langName =
    LANGUAGE_CONFIG[langCode]?.name_english || 'Hindi';
  const header = `[LANGUAGE DIRECTIVE — ${langName.toUpperCase()}]\n`;
  return header + instruction + SAFETY_SUFFIX;
}

// ── 4. FRAUD_KEYWORDS ──────────────────────────────────────────

export const FRAUD_KEYWORDS = {
  hi: [
    'OTP batao',
    'OTP bhejo',
    'OTP share karo',
    'account band hoga',
    'account block ho jayega',
    'prize mila hai',
    'lottery lagi hai',
    'KYC karo',
    'KYC update karo turant',
    'bank manager bol raha hoon',
    'paisa double hoga',
    'aadhar link karo abhi',
    'sim band hogi',
    'police case hoga',
    'aapke naam warrant hai',
    'cash back milega',
    'link pe click karo',
    'PIN batao',
    'password batao',
    'verification ke liye paisa bhejo',
    'UPI pin share karo',
    'UPI pin batao',
    'screen share karo',
    'anydesk download karo',
    'teamviewer install karo',
    'electricity bill update',
    'pan card link karo',
    'account suspend ho gaya',
    'loan approved verify karo',
    'processing fee bhejo',
    'KBC lottery mili hai',
    'police arrest karegi',
    'urgent money transfer',
  ],
  kn: [
    'OTP heli',
    'OTP kodi',
    'OTP share maadi',
    'account close aagatte',
    'account block aagatte',
    'prize sigide',
    'lottery bandide',
    'KYC maadi',
    'KYC update maadi turant',
    'bank manager naanu',
    'haana double aagatte',
    'aadhar link maadi eega',
    'sim band aagatte',
    'police case aagatte',
    'nimma hesaralli warrant ide',
    'cash back sigatte',
    'link click maadi',
    'PIN heli',
    'password heli',
    'verification ge haana kalisi',
    'UPI pin share maadi',
    'UPI pin heli',
    'screen share maadi',
    'anydesk download maadi',
    'teamviewer install maadi',
    'account limit exceed aagide',
    'electricity bill outstanding ide',
    'loan approved verify maadi',
    'pan card update maadi',
    'urgent haana kalisi',
    'sim card block aagutte',
    'policera hesaralli warrant ide',
    'account block aagide',
    'verification ge money kalisi',
    'app install maadi',
  ],
};

const FRAUD_WARNINGS = {
  hi:
    '⚠️ सावधान! यह एक धोखाधड़ी (fraud) हो सकती है। ' +
    'कभी भी किसी को OTP, PIN या password न बताएं। ' +
    'कोई भी बैंक या सरकारी अधिकारी फोन पर यह नहीं मांगता। ' +
    'अगर कोई ऐसा कहे, तुरंत फोन काट दें।',
  kn:
    '⚠️ ಎಚ್ಚರಿಕೆ! ಇದು ಒಂದು ವಂಚನೆ (fraud) ಆಗಿರಬಹುದು। ' +
    'ಯಾರಿಗೂ OTP, PIN ಅಥವಾ password ಹೇಳಬೇಡಿ। ' +
    'ಯಾವುದೇ ಬ್ಯಾಂಕ್ ಅಥವಾ ಸರ್ಕಾರಿ ಅಧಿಕಾರಿ ಫೋನ್\u200cನಲ್ಲಿ ಇದನ್ನು ಕೇಳುವುದಿಲ್ಲ। ' +
    'ಯಾರಾದರೂ ಹಾಗೆ ಹೇಳಿದರೆ, ತಕ್ಷಣ ಫೋನ್ ಕಟ್ ಮಾಡಿ.',
};

// Format values to Indian Currency format (Lakh/Crore system)
export function formatINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
  return Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Scan text against known fraud/scam keywords.
 *
 * @param {string} text - User input text
 * @param {string} lang - Language code ("hi" or "kn")
 * @param {object|boolean} options - Request options or boolean flag to include risk assessment
 * @returns {{ is_fraud, matched, warning, risk_score?, velocity_recommendation? }}
 */
export function checkFraudLanguage(text, lang = 'hi', options = {}) {
  const requestRisk = typeof options === 'boolean' ? options : !!(options && options.requestRisk);
  const effectiveLang = FRAUD_KEYWORDS[lang] ? lang : 'hi';
  const keywords = FRAUD_KEYWORDS[effectiveLang];
  const textLower = text.toLowerCase().trim();

  const matched = [];
  for (const phrase of keywords) {
    if (textLower.includes(phrase.toLowerCase())) {
      matched.push(phrase);
    }
  }

  const isFraud = matched.length > 0;
  const warning = isFraud
    ? FRAUD_WARNINGS[effectiveLang] || FRAUD_WARNINGS.hi
    : '';

  const result = { is_fraud: isFraud, matched, warning };

  if (requestRisk) {
    let risk_score = 'LOW';
    let velocity_recommendation = 'Allow normal transactions';

    if (isFraud) {
      const hasCriticalKeyword = matched.some(phrase => {
        const p = phrase.toLowerCase();
        return p.includes('otp') || p.includes('pin') || p.includes('password') ||
               p.includes('credential') || p.includes('ओटीपी') || p.includes('पिन') ||
               p.includes('पासवर्ड') || p.includes('ಒಟಿಪಿ') || p.includes('ಪಿನ್');
      });

      if (matched.length >= 3 || hasCriticalKeyword) {
        risk_score = 'CRITICAL';
        velocity_recommendation = 'Block all transactions immediately. Suspend UPI and net banking transfers.';
      } else if (matched.length === 2) {
        risk_score = 'HIGH';
        velocity_recommendation = `Limit transaction velocity to 1 transaction per 24 hours. Hold transactions above ₹${formatINR(5000)}.`;
      } else {
        risk_score = 'MEDIUM';
        velocity_recommendation = `Limit transaction velocity to 1 transaction per hour, maximum ₹${formatINR(10000)} per transaction.`;
      }
    }

    result.risk_score = risk_score;
    result.velocity_recommendation = velocity_recommendation;
  }

  return result;
}

// ── 5. GREETINGS ───────────────────────────────────────────────

export const GREETINGS = {
  hi: '🙏 नमस्ते! मैं Artha AI हूँ। आपकी कैसे मदद कर सकता हूँ?',
  kn: '🙏 ನಮಸ್ಕಾರ! ನಾನು Artha AI. ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
  ta: '🙏 வணக்கம்! நான் Artha AI. நான் உங்களுக்கு எப்படி உதவ முடியும்?',
  te: '🙏 నమస్కారం! నేను Artha AI. మీకు ఎలా సహాయం చేయగలను?',
  bn: '🙏 নমস্কার! আমি Artha AI। আমি আপনাকে কিভাবে সাহায্য করতে পারি?',
  mr: '🙏 नमस्कार! मी Artha AI आहे. मी तुम्हाला कशी मदत करू शकतो?',
  or: '🙏 ନମସ୍କାର! ମୁଁ Artha AI। ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?',
  pa: '🙏 ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ Artha AI ਹਾਂ। ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?',
  gu: '🙏 નમસ્તે! હું Artha AI છું. હું તમને કેવી રીતે મદદ કરી શકું?',
  en: '🙏 Hello! I am Artha AI. How can I help you today?',
};

/**
 * Get greeting for a language, defaulting to Hindi.
 */
export function getGreeting(langCode) {
  return GREETINGS[langCode] || GREETINGS[DEFAULT_LANGUAGE];
}

/**
 * Check if a language is primary (deep support).
 */
export function isPrimaryLanguage(langCode) {
  return LANGUAGE_CONFIG[langCode]?.is_primary || false;
}
