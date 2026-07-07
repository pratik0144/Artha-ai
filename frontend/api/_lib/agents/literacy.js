/**
 * api/_lib/agents/literacy.js — Financial Literacy Agent
 * Ported from backend/agents/specialist_agents.py LiteracyAgent
 */

import { callGemini } from '../gemini-pool.js';
import { getSystemPromptLanguageInstruction } from '../language-layer.js';

// Helper to format values to Indian Currency format (Lakh/Crore system)
function formatINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
  return Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Helper to append security/safety suffix for money-related responses
function appendSafetySuffix(text, lang) {
  const suffixes = {
    en: ' Never share your OTP or PIN.',
    hi: ' अपना ओटीपी या पिन कभी किसी के साथ साझा न करें।',
    kn: ' ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.'
  };
  const suffix = suffixes[lang] || suffixes.en;
  if (text && !text.trim().endsWith(suffix.trim())) {
    return text.trim() + suffix;
  }
  return text;
}

export async function runLiteracyAgent(supabase, context, userMessage, history) {
  const lang = context.language || 'hi';
  // Try to generate local hardcoded response to bypass Gemini
  const localResponse = formatLocalizedLiteracy(userMessage, lang);
  if (localResponse) {
    return {
      response: appendSafetySuffix(localResponse, lang),
      model_used: 'local-logic',
      agent: 'literacy',
      key_index: -1,
    };
  }

  const langInstruction = getSystemPromptLanguageInstruction(lang);

  const systemPrompt = `You are a warm, engaging Financial Literacy Teacher for rural India.
Your mission is to explain complex financial concepts to first-time learners using simple real-world analogies.
${langInstruction}

Core Analogies to Use:
- Interest (ಬಡ್ಡಿ/ब्याज) = Rent for money (पैसे का किराया / ಹಣದ ಬಾಡಿಗೆ).
- EMI (ಕಿಸ್ತು/ಕಂತು) = Monthly share of loan repayment (लोन चुकाने का मासिक हिस्सा / ಸಾಲ ಮರುಪಾವತಿಯ ಮಾಸಿಕ ಪಾಲು).
- Savings (बचत/ಉಳಿತಾಯ) = Security for tomorrow (आने वाले कल के लिए सुरक्षा / ನಾಳೆಯ ಸುರಕ್ಷತೆ).

Guidelines:
1. Explain only one financial concept per response.
2. Limit your answer to maximum 3 sentences.
3. Always end with one simple, concrete action step the user can take today.

Few-Shot Examples:
User: "ब्याज क्या होता है?"
Assistant: "ब्याज पैसे का 'किराया' है। जब आप बैंक में पैसे जमा करते हैं, तो बैंक आपको किराया (ब्याज) देता है; और जब आप बैंक से लोन लेते हैं, तो आपको किराया चुकाना पड़ता है। आज ही अपनी पासबुक देखें और जांचें कि आपको कितना ब्याज मिला है।"

User: "ಇಎಂಐ (EMI) ಅಂದರೆ ಏನು?"
Assistant: "ಇಎಂಐ ಎಂಬುದು ನಿಮ್ಮ ಸಾಲವನ್ನು ತೀರಿಸುವ 'ಮಾಸಿಕ ಪಾಲು' ಆಗಿದೆ. ಪ್ರತಿ ತಿಂಗಳು ನೀವು ಸಾಲ ಮತ್ತು ಅದರ ಬಡ್ಡಿಯನ್ನು ಸಣ್ಣ ಕಂತುಗಳಾಗಿ ಬ್ಯಾಂಕ್‌ಗೆ ಹಿಂತಿರುಗಿಸುತ್ತೀರಿ. ಇಂದು ನಿಮ್ಮ ತಿಂಗಳ ಆದಾಯದ 30% ಗಿಂತ ಕಡಿಮೆ ಇರುವಂತೆ ಇಎಂಐ ಸಾಲವನ್ನು ಯೋಜಿಸಿ."

User: "What is savings?"
Assistant: "Savings is like 'security for tomorrow', a safety net that protects your family during crop failures or emergencies. By keeping even a small sum aside, you build strength for difficult times. Open a savings account or a small RD at your bank today."`;

  const messages = [...(history || []).slice(-6), { role: 'user', content: userMessage }];
  const result = await callGemini(supabase, systemPrompt, userMessage, messages.slice(0, -1), 1000);

  return {
    response: appendSafetySuffix(result.text, lang),
    model_used: result.model_used,
    agent: 'literacy',
    key_index: result.key_index,
  };
}

// ── Local Literacy Formatter ───────────────────────────────────

function formatLocalizedLiteracy(userMessage, lang) {
  const textLower = userMessage.toLowerCase();
  const isHi = lang === 'hi';
  const isKn = lang === 'kn';

  // 1. UPI queries
  if (['upi', 'gpay', 'phonepe', 'paytm', 'online payment', 'ಯುಪಿಐ', 'ऑनलाइन भुगतान'].some(k => textLower.includes(k))) {
    if (isHi) {
      return "📱 यूपीआई (UPI) बिना बैंक जाए आपके मोबाइल से तुरंत पैसे भेजने या प्राप्त करने का एक सुरक्षित और आसान तरीका है। यह एक डिजिटल बटुए की तरह है जो सीधे आपके बैंक खाते से जुड़ा होता है। आज ही अपने फोन पर भीम (BHIM) ऐप डाउनलोड करके शुरू करें।";
    }
    if (isKn) {
      return "📱 ಯುಪಿಐ (UPI) ಎಂಬುದು ನಿಮ್ಮ ಮೊಬೈಲ್‌ನಿಂದ ಬ್ಯಾಂಕ್‌ಗೆ ಹೋಗದೆ ತಕ್ಷಣವೇ ಹಣ ಕಳುಹಿಸುವ ಅಥವಾ ಪಡೆಯುವ ಸುಲಭ ವಿಧಾನವಾಗಿದೆ. ಇದು ನೇರವಾಗಿ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಸಂಪರ್ಕ ಹೊಂದಿದ ಡಿಜಿಟಲ್ ವ್ಯಾಲೆಟ್ ಆಗಿದೆ. ಇಂದೇ ಭೀಮ್ (BHIM) ಆ್ಯಪ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ ಕಲಿಯಿರಿ.";
    }
    return "📱 UPI (Unified Payments Interface) is a secure, instant way to send or receive money directly from your mobile phone without visiting a bank. It is like a digital wallet linked to your bank account. Download the BHIM app to start today.";
  }

  // 2. Open bank account queries
  if (['open bank account', 'khata khol', 'bank account kaise', 'ಖಾತೆ ತೆರೆಯುವುದು', 'खाता खोलना'].some(k => textLower.includes(k))) {
    if (isHi) {
      return "🏦 बैंक खाता खोलना बहुत आसान है। आप अपने नजदीकी बैंक शाखा या डाकघर में अपना आधार कार्ड (Aadhaar Card) और एक फोटो लेकर जा सकते हैं। शून्य बैलेंस वाला 'जन धन खाता' (Jan Dhan Account) खोलना पूरी तरह से मुफ्त है।";
    }
    if (isKn) {
      return "🏦 ಬ್ಯಾಂಕ್ ಖಾತೆ ತೆರೆಯುವುದು ತುಂಬಾ ಸುಲಭ. ನಿಮ್ಮ ಹತ್ತಿರದ ಬ್ಯಾಂಕ್ ಅಥವಾ ಅಂಚೆ ಕಚೇರಿಗೆ ಆಧಾರ್ ಕಾರ್ಡ್ ಮತ್ತು ಭಾವಚಿತ್ರದೊಂದಿಗೆ ಭೇಟಿ ನೀಡಿ. ಯಾವುದೇ ಕನಿಷ್ಠ ಬ್ಯಾಲೆನ್ಸ್ ಇಲ್ಲದ 'ಜನ ಧನ ಖಾತೆ' ಯನ್ನು ಉಚಿತವಾಗಿ ತೆರೆಯಬಹುದು.";
    }
    return "🏦 Opening a bank account is very easy. You can visit any bank branch or post office with your Aadhaar card and a photo. Opening a zero-balance 'Jan Dhan Account' is completely free.";
  }

  // 3. Interest rate queries
  if (['interest rate', 'byaaj', 'interest percent', 'ब्याज', 'ಬಡ್ಡಿ ದರ', 'interest definition', 'ब्याज क्या'].some(k => textLower.includes(k))) {
    if (isHi) {
      return "📈 ब्याज पैसे का किराया है। जब आप बैंक में पैसे जमा करते हैं, तो बैंक आपको किराया (ब्याज) देता है; जब आप बैंक से लोन लेते हैं, तो आपको बैंक को किराया (ब्याज) देना पड़ता है। बैंक में ब्याज दरों की जानकारी लें।";
    }
    if (isKn) {
      return "📈 ಬಡ್ಡಿ ಎಂಬುದು ಹಣಕ್ಕೆ ನೀಡುವ ಬಾಡಿಗೆಯಿದ್ದಂತೆ. ನೀವು ಬ್ಯಾಂಕ್‌ನಲ್ಲಿ ಹಣ ಠೇವಣಿ ಇಟ್ಟಾಗ ಬ್ಯಾಂಕ್ ನಿಮಗೆ ಬಡ್ಡಿ ನೀಡುತ್ತದೆ; ನೀವು ಸಾಲ ಪಡೆದಾಗ ಬ್ಯಾಂಕ್‌ಗೆ ಬಡ್ಡಿ ಪಾವತಿಸಬೇಕಾಗುತ್ತದೆ. ಹತ್ತಿರದ ಬ್ಯಾಂಕ್‌ನ ಬಡ್ಡಿ ದರಗಳನ್ನು ವಿಚಾರಿಸಿ.";
    }
    return "📈 Interest is like rent for money. When you deposit money in a bank, the bank pays you interest; when you take a loan from the bank, you pay interest to the bank. Ask your bank for their current interest rates.";
  }

  // 4. Fixed Deposit queries
  if (['fixed deposit', 'fd क्या', 'fd ಎಂದರೆ', 'एफडी', 'ಫಿಕ್ಸೆಡ್ ಡೆಪಾಸಿಟ್'].some(k => textLower.includes(k))) {
    if (isHi) {
      return "💰 फिक्स्ड डिपॉजिट (FD) बैंक में एक निश्चित अवधि के लिए पैसे बचाने का एक सुरक्षित तरीका है, जिस पर साधारण बचत खाते से अधिक ब्याज मिलता है। इसमें तय समय से पहले पैसे निकालने पर पेनल्टी लग सकती है। बैंक में 1 साल की FD शुरू करें।";
    }
    if (isKn) {
      return "💰 ಫಿಕ್ಸೆಡ್ ಡೆಪಾಸಿಟ್ (FD) ಎಂದರೆ ನಿಮ್ಮ ಹಣವನ್ನು ಬ್ಯಾಂಕ್‌ನಲ್ಲಿ ನಿಗದಿತ ಅವಧಿಗೆ ಸುರಕ್ಷಿತವಾಗಿಡುವುದು, ಇದಕ್ಕೆ ಸಾಮಾನ್ಯ ಉಳಿತಾಯ ಖಾತೆಗಿಂತ ಹೆಚ್ಚಿನ ಬಡ್ಡಿ ಸಿಗುತ್ತದೆ. ಇಂದು ನಿಮ್ಮ ಬ್ಯಾಂಕ್‌ನಲ್ಲಿ 1 ವರ್ಷದ ಎಫ್‌ಡಿ ಬಗ್ಗೆ ತಿಳಿಯಿರಿ.";
    }
    return "💰 A Fixed Deposit (FD) is a secure way to save money for a set duration in a bank, earning higher interest than a regular savings account. Visit your bank to learn about 1-year FDs today.";
  }

  // 5. KCC (Kisan Credit Card) queries
  if (['kcc', 'kisan credit', 'किसान क्रेडिट', 'ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್'].some(k => textLower.includes(k))) {
    if (isHi) {
      return "🌾 किसान क्रेडिट कार्ड (KCC) किसानों के लिए एक बहुत ही सस्ती लोन योजना है। यह खेती के लिए कम ब्याज दर (साधारणतः 4% प्रभावी दर) पर पैसे देती है। आज ही अपने नजदीकी बैंक में जाकर KCC फॉर्म के बारे में पूछें।";
    }
    if (isKn) {
      return "🌾 ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ (KCC) ರೈತರಿಗೆ ಅತ್ಯಂತ ಕಡಿಮೆ ಬಡ್ಡಿದರದಲ್ಲಿ (ಸಾಮಾನ್ಯವಾಗಿ 4% ಪರಿಣಾಮಕಾರಿ ದರ) ಸಾಲ ನೀಡುವ ಯೋಜನೆಯಾಗಿದೆ. ನಿಮ್ಮ ಕೃಷಿ ವೆಚ್ಚಗಳಿಗಾಗಿ ಇದನ್ನು ಬಳಸಬಹುದು. ಇಂದೇ ಬ್ಯಾಂಕ್‌ಗೆ ಭೇಟಿ ನೀಡಿ ಕೆಸಿಸಿ ಬಗ್ಗೆ ಮಾಹಿತಿ ಪಡೆಯಿರಿ.";
    }
    return "🌾 Kisan Credit Card (KCC) is a highly subsidized loan scheme for farmers, offering low interest rates (effectively 4% per year with timely repayment) for crop production. Visit your nearest bank to apply today.";
  }

  // 6. EMI queries
  if (['emi', 'monthly installment', 'किस्त', 'ಕಂತು', 'ಕಿಶು'].some(k => textLower.includes(k))) {
    if (isHi) {
      return "⏳ ईएमआई (EMI) आपके लोन चुकाने का 'मासिक हिस्सा' है। यह हर महीने एक निश्चित तिथि पर आपके बैंक खाते से कटता है। सुनिश्चित करें कि आपका कुल EMI मासिक आय के 30% से अधिक न हो।";
    }
    if (isKn) {
      return "⏳ ಇಎಂಐ (EMI) ಎಂದರೆ ನಿಮ್ಮ ಸಾಲ ಮರುಪಾವತಿಯ 'ಮಾಸಿಕ ಪಾಲು'. ಇದು ಪ್ರತಿ ತಿಂಗಳು ನಿಗದಿತ ದಿನಾಂಕದಂದು ನಿಮ್ಮ ಖಾತೆಯಿಂದ ಕಡಿತವಾಗುತ್ತದೆ. ಸಾಲದ ಇಎಂಐ ನಿಮ್ಮ ಒಟ್ಟು ಆದಾಯದ 30% ಮೀರದಂತೆ ನೋಡಿಕೊಳ್ಳಿ.";
    }
    return "⏳ EMI (Equated Monthly Installment) is the 'monthly share' of your loan repayment. It combines a part of your principal and interest to be paid back every month. Keep your EMIs under 30% of your income.";
  }

  // 7. Savings / RD queries
  if (['savings', 'bachat', 'gullak', 'rd', 'recurring deposit', 'ಬಚತ್', 'ಉಳಿತಾಯ'].some(k => textLower.includes(k))) {
    if (isHi) {
      return "🐖 बचत आने वाले कल के लिए 'सुरक्षा' है। आवर्ती जमा (RD) के जरिए आप हर महीने ₹500 जैसी छोटी राशि बचाकर उस पर अधिक ब्याज पा सकते हैं। आज ही अपने बैंक या डाकघर में एक RD खाता खोलें।";
    }
    if (isKn) {
      return "🐖 ಉಳಿತಾಯ ಎನ್ನುವುದು 'ನಾಳೆಯ ಸುರಕ್ಷತೆ'. ಮರುಕಳಿಸುವ ಠೇವಣಿ (RD) ಮೂಲಕ ನೀವು ಪ್ರತಿ ತಿಂಗಳು ₹500 ನಂತಹ ಸಣ್ಣ ಮೊತ್ತವನ್ನು ಉಳಿಸಿ ಹೆಚ್ಚಿನ ಬಡ್ಡಿ ಪಡೆಯಬಹುದು. ಇಂದು ನಿಮ್ಮ ಬ್ಯಾಂಕ್‌ನಲ್ಲಿ ಆರ್‌ಡಿ ಆರಂಭಿಸಿ.";
    }
    return "🐖 Savings is 'security for tomorrow' to protect your family during difficult times. A Recurring Deposit (RD) lets you save small amounts monthly and earn high interest. Open an RD account at your bank today.";
  }

  // 8. Insurance queries
  if (['insurance', 'bima', 'pmsby', 'pmjjby', 'बीमा', 'ವಿಮೆ'].some(k => textLower.includes(k))) {
    if (isHi) {
      return "🛡️ बीमा (Insurance) संकट के समय आपके परिवार को आर्थिक नुकसान से बचाता है। प्रधानमंत्री सुरक्षा बीमा योजना (PMSBY) सिर्फ ₹20 सालाना में दुर्घटना बीमा देती है। आज ही अपने बैंक में जाकर बीमा योजना से जुड़ें।";
    }
    if (isKn) {
      return "🛡️ ವಿಮೆ (Insurance) ಎನ್ನುವುದು ಕಷ್ಟದ ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ ಕುಟುಂಬಕ್ಕೆ ಆರ್ಥಿಕ ರಕ್ಷಣೆ ನೀಡುತ್ತದೆ. ಪ್ರಧಾನ ಮಂತ್ರಿ ಸುರಕ್ಷಾ ಬಿಮಾ ಯೋಜನೆ (PMSBY) ಕೇವಲ ₹20 ವಾರ್ಷಿಕ ಕಂತಿನಲ್ಲಿ ಅಪಘಾತ ವಿಮೆ ನೀಡುತ್ತದೆ. ಇಂದೇ ಬ್ಯಾಂಕ್‌ನಲ್ಲಿ ಇದರ ಬಗ್ಗೆ ವಿಚಾರಿಸಿ.";
    }
    return "🛡️ Insurance (Bima) protects your family from financial loss during difficult times. PM Suraksha Bima Yojana (PMSBY) provides accident insurance for just ₹20 per year. Register at your bank today.";
  }

  return null;
}
