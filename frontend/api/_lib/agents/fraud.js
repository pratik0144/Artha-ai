/**
 * api/_lib/agents/fraud.js — Fraud Guard Agent
 * Ported from backend/agents/specialist_agents.py FraudGuardAgent
 */

import { callGemini } from '../gemini-pool.js';
import { getSystemPromptLanguageInstruction, checkFraudLanguage } from '../language-layer.js';

const safetySuffix = {
  en: ' Never share your OTP or PIN.',
  hi: ' अपना ओटीपी या पिन कभी किसी के साथ साझा न करें।',
  kn: ' ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.'
};

export async function runFraudAgent(supabase, context, userMessage, history) {
  const lang = context.language || 'hi';
  const fraudResult = checkFraudLanguage(userMessage, lang, { requestRisk: true });

  // Log fraud event if detected
  if (fraudResult.is_fraud) {
    try {
      await supabase.from('fraud_logs').insert({
        account_id: context.account_id || 'unknown',
        message: userMessage.slice(0, 500),
        matched_patterns: fraudResult.matched,
        severity: fraudResult.risk_score || (fraudResult.matched.length > 1 ? 'HIGH' : 'MEDIUM'),
      });
    } catch (e) {
      console.warn('[fraud-agent] Failed to log fraud:', e.message);
    }
  }

  // Try to generate local hardcoded response to bypass Gemini
  let localResponse = formatLocalizedFraud(userMessage, lang);
  if (localResponse) {
    const suffix = safetySuffix[lang] || safetySuffix.en;
    if (!localResponse.includes(suffix.trim())) {
      localResponse += suffix;
    }
    return {
      response: localResponse,
      model_used: 'local-logic',
      agent: 'fraud',
      key_index: -1,
      fraud_detected: false,
    };
  }

  const langInstruction = getSystemPromptLanguageInstruction(lang);
  const systemPrompt = `You are a fraud protection specialist for rural India.
${langInstruction}

Fraud scan results: ${JSON.stringify(fraudResult)}

If a fraud/scam is detected or suspected, explain the scam calmly and instruct the user to hang up or block the contact immediately.

Here are few-shot examples of how you should respond:

Example 1 (English):
User: "A caller saying they are from electricity department is asking me to download AnyDesk to update my bill or my power will be cut."
Response: "⚠️ SCAM ALERT! This is a scam because government departments never ask you to install screen-sharing apps like AnyDesk. Please hang up the call immediately and do not download any apps."

Example 2 (Hindi):
User: "बैंक मैनेजर का फोन आया था, बोल रहे हैं कि आधार कार्ड लिंक नहीं है तो खाता बंद हो जाएगा। उन्होंने ओटीपी मांगा है।"
Response: "⚠️ यह एक धोखाधड़ी (SCAM) है! बैंक अधिकारी कभी भी फोन पर आपसे ओटीपी नहीं मांगते हैं। आप तुरंत फोन काट दें और उस नंबर को ब्लॉक करें।"

Example 3 (Kannada):
User: "ನನಗೆ ಫೋನ್ ಮಾಡಿ ಬ್ಯಾಂಕ್ ಮ್ಯಾನೇಜರ್ ಅಂತ ಹೇಳ್ತಿದ್ದಾರೆ. ನನ್ನ ಎಟಿಎಂ ಪಿನ್ ಕೇಳುತ್ತಿದ್ದಾರೆ. ನಾನು ಕೊಡಬೇಕಾ?"
Response: "⚠️ ಇದು ವಂಚನೆ (SCAM)! ಬ್ಯಾಂಕ್ ಸಿಬ್ಬಂದಿ ಫೋನ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಪಿನ್ ಕೇಳುವುದಿಲ್ಲ. ದಯವಿಟ್ಟು ತಕ್ಷಣ ಫೋನ್ ಕಟ್ ಮಾಡಿ ಮತ್ತು ಆ ನಂಬರ್ ಬ್ಲಾಕ್ ಮಾಡಿ."

Rules:
1. If fraud detected, say SCAM clearly (or localized equivalent like 'धोखाधड़ी (SCAM)' / 'ವಂಚನೆ (SCAM)').
2. Explain the scam calmly and reassuringly in exactly 2 sentences.
3. Explicitly instruct the user to hang up or block the contact immediately.
4. Banks and government agencies NEVER ask for OTP, PIN, or password.`;

  const messages = [...(history || []).slice(-6), { role: 'user', content: userMessage }];
  const result = await callGemini(supabase, systemPrompt, userMessage, messages.slice(0, -1), 1000);

  const suffix = safetySuffix[lang] || safetySuffix.en;
  let responseText = result.text;
  if (responseText && !responseText.includes(suffix.trim())) {
    responseText += suffix;
  }

  return {
    response: responseText,
    model_used: result.model_used,
    agent: 'fraud',
    key_index: result.key_index,
    fraud_detected: fraudResult.is_fraud,
  };
}

// ── Local Fraud Formatter ──────────────────────────────────────

function formatLocalizedFraud(userMessage, lang) {
  const textLower = userMessage.toLowerCase();
  const isHi = lang === 'hi';
  const isKn = lang === 'kn';

  // 1. Sharing OTP/PIN safety
  if (['otp', 'pin', 'password', 'पिन', 'ओटीपी', 'पासवर्ड'].some(k => textLower.includes(k)) && 
      ['safe', 'share', 'give', 'साझा', 'भेजें', 'ಕೊಡ', 'ಹಂಚ'].some(k => textLower.includes(k))) {
    if (isHi) {
      return "⚠️ कभी भी अपना ओटीपी (OTP), यूपीआई पिन (UPI PIN) या पासवर्ड किसी के साथ साझा न करें। बैंक या सरकारी अधिकारी कभी भी ये विवरण नहीं मांगते हैं। यदि कोई इन्हें मांगता है, तो वह एक धोखाधड़ी है।";
    }
    if (isKn) {
      return "⚠️ ನಿಮ್ಮ ಒಟಿಪಿ (OTP), ಯುಪಿಐ ಪಿನ್ (UPI PIN) ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ. ಬ್ಯಾಂಕ್ ಸಿಬ್ಬಂದಿಯಾಗಲಿ ಅಥವಾ ಸರ್ಕಾರಿ ಅಧಿಕಾರಿಗಳಾಗಲಿ ಇವುಗಳನ್ನು ಎಂದಿಗೂ ಕೇಳುವುದಿಲ್ಲ. ಇವುಗಳನ್ನು ಕೇಳುವವರೆಲ್ಲ ವಂಚಕರು.";
    }
    return "⚠️ NEVER share your OTP, UPI PIN, or password with anyone. Banks and government officials will never ask for these details. If someone asks for them, it is a scam.";
  }

  // 2. Fraud call explanation
  if (['fraud call', 'scam', 'spam', 'धोखा', 'फर्जी कॉल', 'ವಂಚನೆ', 'ಸ್ಪ್ಯಾಮ್'].some(k => textLower.includes(k))) {
    if (isHi) {
      return "⚠️ धोखाधड़ी वाले कॉल (Scam Calls) ऐसे कॉल होते हैं जहां जालसाज खुद को बैंक अधिकारी, सरकारी कर्मचारी या लॉटरी एजेंट बताते हैं। वे आपके पैसे चुराने के लिए आपका ओटीपी या पिन मांगते हैं। ऐसे कॉल तुरंत काट दें।";
    }
    if (isKn) {
      return "⚠️ ವಂಚನೆ ಕರೆಗಳು (Scam Calls) ಎಂದರೆ ವಂಚಕರು ತಮ್ಮನ್ನು ಬ್ಯಾಂಕ್ ಅಧಿಕಾರಿಗಳು ಅಥವಾ ಸರ್ಕಾರಿ ನೌಕರರು ಎಂದು ಹೇಳಿಕೊಂಡು ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಕೇಳುವ ಕರೆಗಳಾಗಿವೆ. ಇಂತಹ ಕರೆಗಳನ್ನು ತಕ್ಷಣವೇ ಕಡಿತಗೊಳಿಸಿ.";
    }
    return "⚠️ Scam calls are fraudulent phone calls where scammers pretend to be bank employees or government staff to steal your money by asking for your OTP or PIN. Hang up immediately.";
  }

  return null;
}
