/**
 * api/_lib/agents/loans.js — Loans & EMI Advisor Agent
 */

import { callGemini } from '../gemini-pool.js';
import { getSystemPromptLanguageInstruction } from '../language-layer.js';
import nlp from 'compromise';

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

export async function runLoansAgent(supabase, context, userMessage, history) {
  const lang = context.language || 'hi';
  
  // Try local calculator logic first (accurate calculations without Gemini)
  const localResponse = await calculateLocalLoanResponse(supabase, context.account_id, userMessage, lang);
  if (localResponse) {
    return {
      response: appendSafetySuffix(localResponse, lang),
      model_used: 'local-logic',
      agent: 'loans',
      key_index: -1
    };
  }

  const langInstruction = getSystemPromptLanguageInstruction(lang);
  const systemPrompt = `You are an expert Loan Specialist Agent assisting rural Indian farmers and micro-business owners.
Your role is to provide clear, trustworthy, and supportive loan advisory.
${langInstruction}

Core Guidelines:
1. Emphasize safe borrowing limits: always advise that EMIs should not exceed 30-50% of monthly income.
2. Explain key terms simply (e.g., Interest = cost of borrowing, EMI = monthly share, Collateral = security).
3. Keep responses concise (maximum 3 sentences) for users with limited literacy.
4. Warn against high-interest informal lenders (moneylenders) and encourage formal bank loans (KCC, Mudra).

Few-Shot Examples:
User: "मुझे खेती के लिए 1 लाख का लोन चाहिए, क्या करूँ?"
Assistant: "आप बैंक से किसान क्रेडिट कार्ड (KCC) लोन के लिए आवेदन करें, जिसका ब्याज दर सिर्फ 7% सालाना है। ध्यान रखें कि आपकी मासिक किस्त (EMI) आपकी मासिक आय के आधे से कम होनी चाहिए ताकि चुकाने में कोई परेशानी न हो। अपनी स्थानीय सरकारी बैंक शाखा में संपर्क करें।"

User: "ಸಣ್ಣ ಅಂಗಡಿ ಇಡಲು ಲೋನ್ ಸಿಗುತ್ತಾ?"
Assistant: "ಹೌದು, ನೀವು ಪ್ರಧಾನ ಮಂತ್ರಿ ಮುದ್ರಾ ಯೋಜನೆಯಡಿ ಶೂನ್ಯ ಗ್ಯಾರಂಟಿಯೊಂದಿಗೆ ಸಾಲ ಪಡೆಯಬಹುದು. ಸಾಲ ಪಡೆಯುವ ಮೊದಲು ಮಾಸಿಕ ಕಂತು (EMI) ನಿಮ್ಮ ಆದಾಯದ 30% ಮೀರದಂತೆ ನೋಡಿಕೊಳ್ಳಿ, ಇದು ಸುರಕ್ಷಿತ ಮಿತಿಯಾಗಿದೆ. ಹತ್ತಿರದ ರಾಷ್ಟ್ರೀಕೃತ ಬ್ಯಾಂಕ್‌ಗೆ ಭೇಟಿ ನೀಡಿ."

User: "I want a tractor loan of 5 lakhs. Is it safe?"
Assistant: "Tractor loans usually have interest rates between 10-14% for 3-5 years. It is safe only if the monthly EMI is within 30% of your farm income to ensure comfortable repayment. Check the processing fees at your bank before proceeding."`;

  const messages = [...(history || []).slice(-6), { role: 'user', content: userMessage }];
  const result = await callGemini(supabase, systemPrompt, userMessage, messages.slice(0, -1), 1000);

  return {
    response: appendSafetySuffix(result.text, lang),
    model_used: result.model_used,
    agent: 'loans',
    key_index: result.key_index
  };
}

async function calculateLocalLoanResponse(supabase, accountId, userMessage, lang) {
  const textLower = userMessage.toLowerCase();
  const isHi = lang === 'hi';
  const isKn = lang === 'kn';

  // Check if they are asking about their own loans
  const isMyLoansQuery = ['my loan', 'show loan', 'check loan', 'outstanding', 'active loan', 'rin details', 'mera loan', 'karz', 'ಸಾಲ ಚೆಕ್', 'ನನ್ನ ಸಾಲ'].some(k => textLower.includes(k));
  if (isMyLoansQuery) {
    const { data: activeLoans } = await supabase.from('loans').select('*').eq('account_id', accountId).eq('status', 'active');
    
    if (!activeLoans || activeLoans.length === 0) {
      if (isHi) return 'आपका कोई सक्रिय लोन नहीं है।';
      if (isKn) return 'ನಿಮ್ಮ ಯಾವುದೇ ಸಕ್ರಿಯ ಸಾಲಗಳಿಲ್ಲ.';
      return 'You have no active loans.';
    }

    const lines = activeLoans.map(l => {
      if (isHi) {
        return `• **${l.loan_type}** (${l.bank_name}):\n` +
               `  - मूलधन: ₹${formatINR(l.principal)}\n` +
               `  - बकाया राशि: ₹${formatINR(l.outstanding)}\n` +
               `  - ब्याज दर: ${l.interest_rate}%\n` +
               `  - मासिक किस्त (EMI): ₹${formatINR(l.emi_amount)}\n` +
               `  - बची हुई किस्तें: ${l.remaining_emis}`;
      }
      if (isKn) {
        return `• **${l.loan_type}** (${l.bank_name}):\n` +
               `  - ಅಸಲು ಮೊತ್ತ: ₹${formatINR(l.principal)}\n` +
               `  - ಬಾಕಿ ಮೊತ್ತ: ₹${formatINR(l.outstanding)}\n` +
               `  - ಬಡ್ಡಿದರ: ${l.interest_rate}%\n` +
               `  - ಮಾಸಿಕ ಕಂತು (EMI): ₹${formatINR(l.emi_amount)}\n` +
               `  - ಬಾಕಿ ಇರುವ ಕಂತುಗಳು: ${l.remaining_emis}`;
      }
      return `• **${l.loan_type}** (${l.bank_name}):\n` +
             `  - Principal: ₹${formatINR(l.principal)}\n` +
             `  - Outstanding: ₹${formatINR(l.outstanding)}\n` +
             `  - Interest Rate: ${l.interest_rate}%\n` +
             `  - Monthly EMI: ₹${formatINR(l.emi_amount)}\n` +
             `  - Remaining EMIs: ${l.remaining_emis}`;
    });

    if (isHi) {
      return `📊 **आपके सक्रिय ऋण (Active Loans)**:\n\n${lines.join('\n\n')}`;
    }
    if (isKn) {
      return `📊 **ನಿಮ್ಮ ಸಕ್ರಿಯ ಸಾಲಗಳು (Active Loans)**:\n\n${lines.join('\n\n')}`;
    }
    return `📊 **Your Active Loans**:\n\n${lines.join('\n\n')}`;
  }

  // 1. EMI Calculation request
  // e.g. "EMI for 200000 at 7% for 3 years"
  // Look for amount, rate, years/months
  const doc = nlp(userMessage);
  const numJson = doc.values().toNumber().json()[0];
  let principal = numJson?.number?.num || null;

  if (principal === null) {
    const amtMatch = textLower.match(/(\d+000+)/);
    if (amtMatch) principal = parseFloat(amtMatch[1]);
  }

  // Ensure amortization calculator handles edge cases and uses proper financial terminology
  if (principal && principal > 0) {
    // Default values if unspecified
    let rate = 7; // standard KCC rate
    if (textLower.includes('tractor')) rate = 12; // standard tractor loan rate
    else if (textLower.includes('mudra')) rate = 10; // standard Mudra rate
    
    const rateMatch = textLower.match(/(\d+(?:\.\d+)?)\s*%/);
    if (rateMatch) rate = parseFloat(rateMatch[1]);

    let durationYears = 3;
    const durationMatch = textLower.match(/(\d+)\s*(year|saal|varsha|ವರ್ಷ)/);
    if (durationMatch) durationYears = parseInt(durationMatch[1]);

    // Handle edge cases
    if (durationYears <= 0) durationYears = 3; // Fallback to 3 years
    rate = Math.max(0, rate); // Interest rate cannot be negative

    let emi = 0;
    const totalMonths = durationYears * 12;
    if (rate === 0) {
      emi = Math.round(principal / totalMonths);
    } else {
      // EMI Calculation formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
      const monthlyRate = (rate / 100) / 12;
      emi = Math.round((principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1));
    }
    const totalRepay = emi * totalMonths;
    const totalInterest = Math.max(0, totalRepay - principal);

    if (isHi) {
      return `📊 **ऋण विवरण और मासिक किस्त (EMI) गणना**:\n` +
             `* **मूलधन (Principal Amount)**: ₹${formatINR(principal)}\n` +
             `* **वार्षिक ब्याज दर (Annual Interest Rate)**: ${rate}%\n` +
             `* **ऋण की अवधि (Tenure)**: ${durationYears} वर्ष\n` +
             `* **मासिक किस्त (Monthly EMI)**: ₹${formatINR(emi)}\n` +
             `* **कुल देय ब्याज (Total Interest Payable)**: ₹${formatINR(totalInterest)}\n` +
             `* **कुल देय राशि (Total Amount Repayable)**: ₹${formatINR(totalRepay)}`;
    }
    if (isKn) {
      return `📊 **ಸಾಲದ ವಿವರಗಳು ಮತ್ತು ಮಾಸಿಕ ಕಂತು (EMI) ಲೆಕ್ಕಾಚಾರ**:\n` +
             `* **ಅಸಲು ಮೊತ್ತ (Principal Amount)**: ₹${formatINR(principal)}\n` +
             `* **ವಾರ್ಷಿಕ ಬಡ್ಡಿ ದರ (Annual Interest Rate)**: ${rate}%\n` +
             `* **ಸಾಲದ ಅವಧಿ (Tenure)**: ${durationYears} ವರ್ಷಗಳು\n` +
             `* **ಮಾಸಿಕ ಕಂತು (Monthly EMI)**: ₹${formatINR(emi)}\n` +
             `* **ಒಟ್ಟು ಪಾವತಿಸಬೇಕಾದ ಬಡ್ಡಿ (Total Interest Payable)**: ₹${formatINR(totalInterest)}\n` +
             `* **ಒಟ್ಟು ಮರುಪಾವತಿ ಮೊತ್ತ (Total Amount Repayable)**: ₹${formatINR(totalRepay)}`;
    }
    return `📊 **Loan Details & Monthly EMI Calculation**:\n` +
           `* **Principal Amount**: ₹${formatINR(principal)}\n` +
           `* **Annual Interest Rate**: ${rate}%\n` +
           `* **Loan Tenure**: ${durationYears} years\n` +
           `* **Monthly EMI**: ₹${formatINR(emi)}\n` +
           `* **Total Interest Payable**: ₹${formatINR(totalInterest)}\n` +
           `* **Total Amount Repayable**: ₹${formatINR(totalRepay)}`;
  }

  // 2. Interest rate queries for specific loans
  if (textLower.includes('kcc') || textLower.includes('kisan credit')) {
    if (isHi) return "🌾 किसान क्रेडिट कार्ड (KCC) ऋण पर ब्याज दर आम तौर पर 7% सालाना होती है। यदि आप समय पर भुगतान करते हैं, तो सरकार 3% की अतिरिक्त छूट देती है, जिससे प्रभावी ब्याज दर केवल 4% रह जाती है।";
    if (isKn) return "🌾 ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ (KCC) ಸಾಲದ ಬಡ್ಡಿದರ ಸಾಮಾನ್ಯವಾಗಿ ವರ್ಷಕ್ಕೆ 7% ಇರುತ್ತದೆ. ನೀವು ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಸಾಲ ಮರುಪಾವತಿಸಿದರೆ ಸರ್ಕಾರ 3% ಬಡ್ಡಿ ರಿಯಾಯಿತಿ ನೀಡುತ್ತದೆ, ಆಗ ಬಡ್ಡಿ ದರ ಕೇವಲ 4% ಆಗುತ್ತದೆ.";
    return "🌾 Kisan Credit Card (KCC) interest rate is generally 7% per annum. With timely repayment, the government offers a 3% subvention, making the effective interest rate only 4% per year.";
  }

  if (textLower.includes('tractor')) {
    if (isHi) return "🚜 ट्रैक्टर ऋण पर ब्याज दर विभिन्न बैंकों में 10% से 14% सालाना के बीच होती है। पुनर्भुगतान की अवधि आमतौर पर 3 से 5 वर्ष होती है। ऋण लेने से पहले प्रसंस्करण शुल्क (processing fee) अवश्य जांच लें।";
    if (isKn) return "🚜 ಟ್ರಾಕ್ಟರ್ ಸಾಲದ ಬಡ್ಡಿದರಗಳು ಬ್ಯಾಂಕ್‌ಗಳ ಪ್ರಕಾರ ವರ್ಷಕ್ಕೆ 10% ರಿಂದ 14% ವರೆಗೆ ಇರುತ್ತದೆ. ಸಾಲದ ಮರುಪಾವತಿ ಅವಧಿ ಸಾಮಾನ್ಯವಾಗಿ 3 ರಿಂದ 5 ವರ್ಷಗಳು. ಸಾಲ ಪಡೆಯುವ ಮುನ್ನ ಪ್ರೊಸೆಸಿಂಗ್ ಶುಲ್ಕ ಪರಿಶೀಲಿಸಿ.";
    return "🚜 Tractor loan interest rates usually range between 10% to 14% per annum depending on the bank. The repayment period is typically 3 to 5 years. Always check processing fees before applying.";
  }

  if (textLower.includes('mudra')) {
    if (isHi) return "💼 प्रधानमंत्री मुद्रा योजना (Mudra Loan) के तहत छोटे व्यवसायों के लिए तीन प्रकार के लोन मिलते हैं: शिशु (₹50,000 तक), किशोर (₹5 लाख तक), और तरुण (₹10 लाख तक)। ब्याज दरें 9% से 12% के बीच होती हैं। कोई गारंटी आवश्यक नहीं है।";
    if (isKn) return "💼 ಪ್ರಧಾನ ಮಂತ್ರಿ ಮುದ್ರಾ ಯೋಜನೆಯಡಿ ಸಣ್ಣ ಉದ್ಯಮಗಳಿಗೆ ಮೂರು ರೀತಿಯ ಸಾಲ ನೀಡಲಾಗುತ್ತದೆ: ಶಿಶು (₹50,000 ವರೆಗೆ), ಕಿಶೋರ್ (₹5 ಲಕ್ಷದವರೆಗೆ), ತರುಣ್ (₹10 ಲಕ್ಷದವರೆಗೆ). ಬಡ್ಡಿದರ 9% ರಿಂದ 12% ಇರುತ್ತದೆ. ಯಾವುದೇ ಗ್ಯಾರಂಟಿ ಬೇಕಾಗಿಲ್ಲ.";
    return "💼 PM Mudra Yojana offers business loans up to ₹10 Lakh in three categories: Shishu (up to ₹50,000), Kishor (up to ₹5 Lakh), and Tarun (up to ₹10 Lakh). Interest rates range from 9% to 12%. No collateral is required.";
  }

  return null;
}
