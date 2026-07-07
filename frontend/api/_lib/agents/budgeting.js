/**
 * api/_lib/agents/budgeting.js — Budgeting & Savings Specialist Agent
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

// Categorize transaction description into standard rural categories
function categorizeTransaction(description) {
  const desc = (description || '').toLowerCase();
  
  if (desc.includes('fertilizer') || desc.includes('seed') || desc.includes('crop') || desc.includes('farm') || desc.includes('kcc') || desc.includes('kisan')) {
    return 'agriculture';
  }
  if (desc.includes('electricity') || desc.includes('bill') || desc.includes('water') || desc.includes('lpg') || desc.includes('gas') || desc.includes('cylinder') || desc.includes('mobile') || desc.includes('recharge')) {
    return 'utilities';
  }
  if (desc.includes('ration') || desc.includes('food') || desc.includes('grocery') || desc.includes('shop') || desc.includes('kirana')) {
    return 'household';
  }
  if (desc.includes('medical') || desc.includes('medicine') || desc.includes('hospital') || desc.includes('doctor') || desc.includes('health')) {
    return 'healthcare';
  }
  if (desc.includes('school') || desc.includes('fees') || desc.includes('education') || desc.includes('college') || desc.includes('book')) {
    return 'education';
  }
  if (desc.includes('wholesale') || desc.includes('stock') || desc.includes('rent') || desc.includes('business')) {
    return 'business';
  }
  return 'other';
}

// Format the spending breakdown
function formatCategoriesBreakdown(totals, isHi, isKn) {
  const labels = {
    agriculture: isHi ? '🌾 खेती (Agriculture)' : isKn ? '🌾 ಕೃಷಿ (Agriculture)' : '🌾 Agriculture',
    utilities: isHi ? '🔌 बिजली/मोबाइल (Utilities)' : isKn ? '🔌 ವಿದ್ಯುತ್/ಮೊಬೈಲ್ (Utilities)' : '🔌 Utilities',
    household: isHi ? '🛒 राशन/घर (Household)' : isKn ? '🛒 ರೇಷನ್/ಮನೆ (Household)' : '🛒 Household/Ration',
    healthcare: isHi ? '💊 दवा/इलाज (Healthcare)' : isKn ? '💊 ವೈದ್ಯಕೀಯ/ಔಷಧಿ (Healthcare)' : '💊 Healthcare',
    education: isHi ? '📚 पढ़ाई (Education)' : isKn ? '📚 ಶಿಕ್ಷಣ (Education)' : '📚 Education',
    business: isHi ? '💼 व्यापार (Business)' : isKn ? '💼 ವ್ಯಾಪಾರ (Business)' : '💼 Business',
    other: isHi ? '📦 अन्य (Others)' : isKn ? '📦 ಇತರೇ (Others)' : '📦 Others'
  };

  const lines = [];
  for (const [cat, amt] of Object.entries(totals)) {
    if (amt > 0) {
      lines.push(`  - ${labels[cat]}: ₹${formatINR(amt)}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : (isHi ? '  - कोई खर्च नहीं' : isKn ? '  - ಯಾವುದೇ ವೆಚ್ಚವಿಲ್ಲ' : '  - No expenses recorded');
}

export async function runBudgetingAgent(supabase, context, userMessage, history) {
  const lang = context.language || 'hi';

  // Run dynamic analysis of user's local Supabase account and transactions
  const localAnalysis = await analyzeUserBudget(supabase, context.account_id, lang);
  if (localAnalysis) {
    return {
      response: appendSafetySuffix(localAnalysis, lang),
      model_used: 'local-logic',
      agent: 'budgeting',
      key_index: -1
    };
  }

  const langInstruction = getSystemPromptLanguageInstruction(lang);
  const systemPrompt = `You are a Budgeting and Savings Expert assisting rural Indian households and farmers.
Your role is to guide users to manage their cash flows, save for emergencies, and build financial security.
${langInstruction}

Core Guidelines:
1. Explain budgeting concepts using simple local references (e.g., Savings = security for tomorrow, emergency fund = crop failure protection).
2. Recommend the 50/30/20 rule simplified: 50% for needs (food, bills), 30% for farming/business inputs, 20% for savings (FD/RD).
3. Keep responses concise (maximum 3 sentences) for rural users with limited literacy.
4. Encourage formal savings options (Fixed Deposits, Recurring Deposits) over keeping cash at home.

Few-Shot Examples:
User: "बचत कैसे शुरू करूँ? पैसे बचते ही नहीं।"
Assistant: "हर महीने कमाई आते ही पहले ₹500 अलग गुल्लक या बैंक खाते में रख दें, फिर बाकी खर्च करें। इसे 'बचत पहले' नियम कहते हैं। आप बैंक में एक छोटी आरडी (Recurring Deposit) शुरू कर सकते हैं जिससे हर महीने पैसे अपने आप बचेंगे।"

User: "ಖರ್ಚು ಜಾಸ್ತಿ ಆಗ್ತಿದೆ, ಏನು ಮಾಡಬೇಕು?"
Assistant: "ನಿಮ್ಮ ಮಾಸಿಕ ಆದಾಯದ ಕನಿಷ್ಠ 20% ಹಣವನ್ನು ಉಳಿತಾಯ ಮಾಡಲು ಮೊದಲೇ ತೆಗೆದಿಡಿ. ಅನಗತ್ಯ ಖರ್ಚುಗಳನ್ನು ಕಡಿಮೆ ಮಾಡಲು ಮೊಬೈಲ್ ರೀಚಾರ್ಜ್ ಮತ್ತು ಗ್ಯಾಸ್ ಬಿಲ್‌ನಂತಹ ಕಡ್ಡಾಯ ವೆಚ್ಚಗಳಿಗೆ ಬಜೆಟ್ ಮಿತಿ ಸೆಟ್ ಮಾಡಿ. ಉಳಿತಾಯದ ಹಣವನ್ನು ಬ್ಯಾಂಕ್ ಎಫ್‌ಡಿ (FD) ಯಲ್ಲಿ ಇಡುವುದು ಒಳ್ಳೆಯದು."

User: "How should I plan my budget for this crop cycle?"
Assistant: "Allocate 50% of your earnings to daily household needs, keep 30% aside for next season's seeds and fertilizer, and save the remaining 20% in a bank fixed deposit. This ensures you do not have to borrow at high interest rates if a crop fails. Start with a small bank deposit today."`;

  const messages = [...(history || []).slice(-6), { role: 'user', content: userMessage }];
  const result = await callGemini(supabase, systemPrompt, userMessage, messages.slice(0, -1), 1000);

  return {
    response: appendSafetySuffix(result.text, lang),
    model_used: result.model_used,
    agent: 'budgeting',
    key_index: result.key_index
  };
}

async function analyzeUserBudget(supabase, accountId, lang) {
  const isHi = lang === 'hi';
  const isKn = lang === 'kn';

  // 1. Fetch user account details
  const { data: acct } = await supabase.from('accounts').select('balance, monthly_limit').eq('account_id', accountId).single();
  if (!acct) return null;

  // 2. Fetch transactions for current month
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const { data: txns } = await supabase.from('transactions').select('amount, type, description').eq('account_id', accountId).gte('date', monthStart);

  const spent = (txns || [])
    .filter(t => t.type === 'debit')
    .reduce((s, t) => s + Number(t.amount), 0);

  const income = (txns || [])
    .filter(t => t.type === 'credit')
    .reduce((s, t) => s + Number(t.amount), 0);

  const limit = acct.monthly_limit || 5000; // default standard reference limit
  const limitReached = spent >= limit;
  const savings = Math.max(0, income - spent);

  // Group debit transactions into categories
  const categoryTotals = {
    agriculture: 0,
    utilities: 0,
    household: 0,
    healthcare: 0,
    education: 0,
    business: 0,
    other: 0
  };

  const debitTxns = (txns || []).filter(t => t.type === 'debit');
  debitTxns.forEach(t => {
    const cat = categorizeTransaction(t.description);
    categoryTotals[cat] += Number(t.amount);
  });

  const breakdownStr = formatCategoriesBreakdown(categoryTotals, isHi, isKn);

  // Generate a customized response based on their current balance and spending
  if (isHi) {
    let advice = `📊 **बजट विश्लेषण (इस महीने)**:\n` +
                 `* कुल जमा (आय): ₹${formatINR(income)}\n` +
                 `* कुल खर्च: ₹${formatINR(spent)}\n` +
                 `* उपलब्ध बचत: ₹${formatINR(savings)}\n` +
                 `* मासिक सीमा: ₹${formatINR(limit)}\n\n` +
                 `📋 **श्रेणी के अनुसार खर्च (Spending Breakdown)**:\n${breakdownStr}`;

    if (limitReached) {
      advice += `\n\n⚠️ **सावधान!** आपका इस महीने का खर्च आपकी सेट की गई सीमा ₹${formatINR(limit)} से अधिक हो चुका है। कृपया केवल आवश्यक चीजों पर ही खर्च करें।`;
    } else if (spent > limit * 0.8) {
      advice += `\n\n💡 **सलाह:** आप अपने मासिक बजट के 80% भाग को खर्च कर चुके हैं। शेष दिनों के लिए अपने खर्च को नियंत्रित करें।`;
    } else {
      advice += `\n\n👍 **शानदार!** आपका बजट नियंत्रण में है। यदि संभव हो, तो ₹2,000 की फिक्स्ड डिपॉजिट (FD) शुरू करें ताकि उस पर अधिक ब्याज मिल सके।`;
    }
    return advice;
  }

  if (isKn) {
    let advice = `📊 **ಬಜೆಟ್ ವಿಶ್ಲೇಷಣೆ (ಈ ತಿಂಗಳು)**:\n` +
                 `* ಒಟ್ಟು ಜಮಾ (ಆದಾಯ): ₹${formatINR(income)}\n` +
                 `* ಒಟ್ಟು ವೆಚ್ಚ (ಖರ್ಚು): ₹${formatINR(spent)}\n` +
                 `* ಉಳಿತಾಯ: ₹${formatINR(savings)}\n` +
                 `* ಮಾಸಿಕ ಮಿತಿ: ₹${formatINR(limit)}\n\n` +
                 `📋 **ವರ್ಗದ ಪ್ರಕಾರ ವೆಚ್ಚದ ವಿವರಗಳು (Spending Breakdown)**:\n${breakdownStr}`;

    if (limitReached) {
      advice += `\n\n⚠️ **ಎಚ್ಚರಿಕೆ!** ನಿಮ್ಮ ಖರ್ಚು ಈಗಾಗಲೇ ನಿಮ್ಮ ಮಾಸಿಕ ಮಿತಿ ₹${formatINR(limit)} ದಾಟಿದೆ. ದಯವಿಟ್ಟು ಅನಗತ್ಯ ವೆಚ್ಚಗಳನ್ನು ನಿಯಂತ್ರಿಸಿ.`;
    } else if (spent > limit * 0.8) {
      advice += `\n\n💡 **ಸಲಹೆ:** ನಿಮ್ಮ ಮಾಸಿಕ ಬಜೆಟ್‌ನ 80% ಖರ್ಚಾಗಿದೆ. ಉಳಿದ ದಿನಗಳಲ್ಲಿ ಖರ್ಚು ನಿಯಂತ್ರಿಸಿ.`;
    } else {
      advice += `\n\n👍 **ಉತ್ತಮ!** ನಿಮ್ಮ ಬಜೆಟ್ ನಿಯಂತ್ರಣದಲ್ಲಿದೆ. ಉಳಿತಾಯದ ಹಣವನ್ನು ಎಫ್‌ಡಿ (FD) ಯಲ್ಲಿ ಹೂಡಿಕೆ ಮಾಡಲು ಯೋಚಿಸಿ.`;
    }
    return advice;
  }

  let advice = `📊 **Budget Analysis (This Month)**:\n` +
               `* Total Credits (Income): ₹${formatINR(income)}\n` +
               `* Total Debits (Expenses): ₹${formatINR(spent)}\n` +
               `* Net Savings: ₹${formatINR(savings)}\n` +
               `* Configured Limit: ₹${formatINR(limit)}\n\n` +
               `📋 **Spending Breakdown**:\n${breakdownStr}`;

  if (limitReached) {
    advice += `\n\n⚠️ **Alert!** You have exceeded your configured limit of ₹${formatINR(limit)}. Avoid non-essential expenses for the rest of the month.`;
  } else if (spent > limit * 0.8) {
    advice += `\n\n💡 **Tip:** You have consumed 80% of your monthly limit. Keep your spending under control.`;
  } else {
    advice += `\n\n👍 **Well done!** Your budget is well within control. Consider putting some money into a Fixed Deposit (FD) to earn higher returns.`;
  }
  return advice;
}
