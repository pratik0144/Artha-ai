/**
 * api/_lib/agents/banking.js — Banking Agent
 * Ported from backend/agents/specialist_agents.py BankingAgent
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

// ── Sub-action keyword maps (multilingual) ─────────────────────

const ACTION_KEYWORDS = {
  balance: [
    'balance', 'bakiye', 'kitna paisa', 'shesh', 'baaki',
    'बैलेंस', 'बाकी', 'शेष', 'पैसा कितना',
    'ಬ್ಯಾಲೆನ್ಸ್', 'ಎಷ್ಟು ಹಣ',
  ],
  transactions: [
    'transaction', 'history', 'statement', 'passbook', 'lenden',
    'len den', 'विवरण', 'लेनदेन', 'स्टेटमेंट',
    'ವಹಿವಾಟು', 'ಹಿಸ್ಟರಿ',
  ],
  transfer: [
    'transfer', 'bhejo', 'send', 'bhejdo', 'paisa do',
    'भेजो', 'ट्रांसफर', 'ಕಳಿಸಿ', 'ಟ್ರಾನ್ಸ್ಫರ್',
  ],
  bill: [
    'bill', 'recharge', 'bijli', 'electricity', 'mobile',
    'DTH', 'gas', 'pani', 'water',
    'बिल', 'बिजली', 'रिचार्ज', 'ಬಿಲ್', 'ರೀಚಾರ್ಜ್',
  ],
  installments: [
    'installment', 'emi', 'reminder', 'due', 'kist', 'kisto',
    'payment due', 'upcoming payment', 'overdue',
    'किस्त', 'ईएमआई', 'बकाया', 'याद दिलाना',
    'ಕಂತು', 'ಇಎಂಐ', 'ಬಾಕಿ',
  ],
  loans: [
    'loan', 'karz', 'rin', 'udhar', 'outstanding',
    'ऋण', 'कर्ज', 'उधार', 'लोन', 'ಸಾಲ', 'ಲೋನ್',
  ],
  spending: [
    'spending', 'budget', 'kharcha', 'limit', 'spent', 'spend', 'breakdown', 'analysis',
    'how much spent', 'kitna kharch', 'monthly spending',
    'खर्चा', 'बजट', 'खर्च', 'ಖರ್ಚು', 'ಬಜೆಟ್',
  ],
  fixed_deposits: [
    'fixed deposit', 'fd', 'invest', 'nivesh', 'jama karna',
    'फिक्स्ड डिपॉजिट', 'एफडी', 'निवेश', 'जमा',
    'ಫಿಕ್ಸೆಡ್ ಡೆಪಾಸಿಟ್', 'ಎಫ್‌ಡಿ', 'ಹೂಡಿಕೆ',
  ],
};

// Detection priority order
const ACTION_PRIORITY = [
  'transfer', 'fixed_deposits', 'loans', 'installments',
  'spending', 'bill', 'transactions', 'balance',
];

function detectBankingAction(text) {
  const textLower = text.toLowerCase();
  for (const action of ACTION_PRIORITY) {
    for (const kw of ACTION_KEYWORDS[action]) {
      if (textLower.includes(kw.toLowerCase())) return action;
    }
  }
  return 'balance';
}

// ── Supabase Data Fetchers ─────────────────────────────────────

async function getBalance(supabase, accountId) {
  const { data } = await supabase
    .from('accounts').select('name, balance').eq('account_id', accountId).single();
  return data ? { name: data.name, balance: `₹${formatINR(data.balance)}`, balance_raw: data.balance } : { error: 'Account not found' };
}

async function getTransactions(supabase, accountId, lastN = 5) {
  const { data } = await supabase
    .from('transactions').select('*').eq('account_id', accountId).order('date', { ascending: false }).limit(lastN);
  return data || [];
}

async function getInstallments(supabase, accountId) {
  const { data } = await supabase.from('installments').select('*').eq('account_id', accountId);
  return data || [];
}

async function getLoans(supabase, accountId) {
  const { data } = await supabase.from('loans').select('*').eq('account_id', accountId);
  return data || [];
}

async function getSpending(supabase, accountId) {
  const { data: acct } = await supabase.from('accounts').select('balance, monthly_limit').eq('account_id', accountId).single();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const { data: txns } = await supabase
    .from('transactions').select('amount').eq('account_id', accountId).eq('type', 'debit').gte('date', monthStart);
  const spent = (txns || []).reduce((s, t) => s + Number(t.amount), 0);
  const limit = acct?.monthly_limit || 0;
  const rem = Math.max(0, limit - spent);
  return {
    total_spent: `₹${formatINR(spent)}`,
    total_spent_raw: spent,
    balance: `₹${formatINR(acct?.balance || 0)}`,
    balance_raw: acct?.balance || 0,
    monthly_limit: `₹${formatINR(limit)}`,
    monthly_limit_raw: limit,
    remaining: `₹${formatINR(rem)}`,
    remaining_raw: rem,
    month: monthStart
  };
}

async function getFixedDeposits(supabase, accountId) {
  const { data } = await supabase.from('fixed_deposits').select('*').eq('account_id', accountId);
  return data || [];
}

// ── Main Agent Run ─────────────────────────────────────────────

export async function runBankingAgent(supabase, context, userMessage, history) {
  const accountId = context.account_id || 'UNKNOWN';
  const action = detectBankingAction(userMessage);
  let toolResult;

  switch (action) {
    case 'balance':
      toolResult = await getBalance(supabase, accountId); break;
    case 'transactions':
      toolResult = await getTransactions(supabase, accountId); break;
    case 'installments':
      toolResult = await getInstallments(supabase, accountId); break;
    case 'loans': {
      const isPayLoan = ['pay', 'repay', 'clear', 'bharna', 'de do', 'chukao', 'kattiri', 'ಪಾವತಿಸಿ', 'ಕಟ್ಟು'].some(k => userMessage.toLowerCase().includes(k));
      if (isPayLoan) {
        // 1. Fetch active loans
        const { data: activeLoans, error: fetchError } = await supabase
          .from('loans')
          .select('*')
          .eq('account_id', accountId)
          .eq('status', 'active');

        if (fetchError) {
          toolResult = { error: fetchError.message };
          break;
        }

        if (!activeLoans || activeLoans.length === 0) {
          toolResult = { message: "No active loans found to pay." };
          break;
        }

        // 2. Fetch current balance
        const { data: account, error: balError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('account_id', accountId)
          .single();

        if (balError) {
          toolResult = { error: balError.message };
          break;
        }

        let currentBalance = Number(account.balance);
        let totalEmiNeeded = activeLoans.reduce((sum, loan) => sum + Number(loan.emi_amount), 0);

        if (currentBalance < totalEmiNeeded) {
          toolResult = { error: `Insufficient balance to pay all EMIs. Total needed: ₹${formatINR(totalEmiNeeded)}, Available: ₹${formatINR(currentBalance)}` };
          break;
        }

        // 3. Process each loan payment
        const paymentResults = [];
        for (const loan of activeLoans) {
          const emi = Number(loan.emi_amount);
          const newOutstanding = Math.max(0, Number(loan.outstanding) - emi);
          const newRemainingEmis = Math.max(0, loan.remaining_emis - 1);
          const newStatus = newRemainingEmis === 0 ? 'closed' : 'active';

          // Update loan
          await supabase
            .from('loans')
            .update({
              outstanding: newOutstanding,
              remaining_emis: newRemainingEmis,
              status: newStatus
            })
            .eq('loan_id', loan.loan_id);

          // Update account balance
          currentBalance -= emi;
          await supabase
            .from('accounts')
            .update({ balance: currentBalance })
            .eq('account_id', accountId);

          // Insert transaction log
          await supabase
            .from('transactions')
            .insert({
              account_id: accountId,
              date: new Date().toISOString().split('T')[0],
              type: 'debit',
              amount: emi,
              description: `${loan.loan_type} EMI Payment`
            });

          // Update matching installments to 'paid'
          try {
            await supabase
              .from('installments')
              .update({ status: 'paid' })
              .eq('account_id', accountId)
              .eq('amount', emi)
              .in('status', ['upcoming', 'overdue'])
              .ilike('type', `%${loan.loan_type.split(' ')[0]}%`); // matches e.g. Tractor
          } catch (e) {
            console.warn('[loans] Failed to update matching installment:', e.message);
          }

          paymentResults.push({
            loan_type: loan.loan_type,
            emi_paid: emi,
            remaining_emis: newRemainingEmis,
            outstanding: newOutstanding,
            status: newStatus
          });
        }

        toolResult = {
          success: true,
          payments: paymentResults,
          remaining_balance: currentBalance
        };
      } else {
        toolResult = await getLoans(supabase, accountId);
      }
      break;
    }
    case 'spending':
      toolResult = await getSpending(supabase, accountId); break;
    case 'fixed_deposits': {
      const isCreateFD = ['add', 'invest', 'create', 'banao', 'madu', 'jama', 'make', 'open', 'start', 'setup'].some(k => userMessage.toLowerCase().includes(k));
      if (isCreateFD) {
        const amtMatch = userMessage.match(/(\d+)/);
        const amount = amtMatch ? parseFloat(amtMatch[1]) : null;
        
        let durationMonths = 12; // Default 1 year
        const durationMatch = userMessage.toLowerCase().match(/(\d+)\s*(month|mahina|mahine|year|saal|varsha|ತಿಂಗಳು|ವರ್ಷ)/);
        if (durationMatch) {
          const val = parseInt(durationMatch[1]);
          const unit = durationMatch[2];
          durationMonths = ['year', 'saal', 'varsha', 'ವರ್ಷ'].includes(unit) ? val * 12 : val;
        }

        if (amount) {
          const { data, error } = await supabase.rpc('create_fixed_deposit', {
            p_account_id: accountId,
            p_amount: amount,
            p_duration_months: durationMonths
          });
          toolResult = error ? { error: error.message } : data;
        } else {
          toolResult = { status: 'awaiting_details', message: 'Need amount and duration to create a fixed deposit.' };
        }
      } else {
        toolResult = await getFixedDeposits(supabase, accountId);
      }
      break;
    }
    case 'transfer': {
      const amtMatch = userMessage.match(/(\d+)/);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : null;
      const textLower = userMessage.toLowerCase();
      let toId = null;

      if (textLower.includes('arjun') || textLower.includes('अर्जुन') || textLower.includes('ಅರ್ಜುನ್')) toId = 'SB-3001';
      else if (textLower.includes('ramesh') || textLower.includes('रमेश') || textLower.includes('ರಮೇಶ್')) toId = 'JD-1001';
      else if (textLower.includes('savitha') || textLower.includes('सविता') || textLower.includes('ಸವಿತಾ')) toId = 'SB-2001';
      else if (textLower.includes('meera') || textLower.includes('मीरा') || textLower.includes('ಮೀರಾ')) toId = 'SB-2002';
      else if (textLower.includes('fatima') || textLower.includes('फातिमा') || textLower.includes('ಫಾತಿಮಾ')) toId = 'JD-1002';

      if (amount && toId) {
        if (accountId === toId) {
          toolResult = { error: "Cannot transfer money to your own account." };
        } else {
          const { data, error } = await supabase.rpc('transfer_funds', {
            p_from_id: accountId,
            p_to_id: toId,
            p_amount: amount
          });
          toolResult = error ? { error: error.message } : data;
        }
      } else {
        toolResult = { status: 'awaiting_details', message: 'Need recipient name and amount to proceed.' };
      }
      break;
    }
    case 'bill': {
      const amtMatch2 = userMessage.match(/(\d+)/);
      const amount = amtMatch2 ? parseFloat(amtMatch2[1]) : null;
      const textLower = userMessage.toLowerCase();
      let billType = null;

      if (textLower.includes('electricity') || textLower.includes('bijli') || textLower.includes('बिजली') || textLower.includes('ಬಿಲ್')) billType = 'electricity';
      else if (textLower.includes('mobile') || textLower.includes('recharge') || textLower.includes('रिचार्ज') || textLower.includes('ರೀಚಾರ್ಜ್')) billType = 'mobile_recharge';
      else if (textLower.includes('ration') || textLower.includes('राशन') || textLower.includes('ರೇಷನ್')) billType = 'ration';
      else if (textLower.includes('insurance') || textLower.includes('bima') || textLower.includes('बीमा') || textLower.includes('ವಿಮೆ')) billType = 'insurance_premium';

      if (amount && billType) {
        const { data, error } = await supabase.rpc('pay_bill', {
          p_account_id: accountId,
          p_bill_type: billType,
          p_amount: amount
        });
        
        if (!error && data && data.success) {
          // If successful, also update status of corresponding installment
          let typePattern = '%';
          if (billType === 'electricity') typePattern = '%Electricity%';
          else if (billType === 'mobile_recharge') typePattern = '%Mobile%';
          else if (billType === 'ration') typePattern = '%Ration%';
          else if (billType === 'insurance_premium') typePattern = '%Insurance%';

          try {
            await supabase
              .from('installments')
              .update({ status: 'paid' })
              .eq('account_id', accountId)
              .eq('amount', amount)
              .in('status', ['upcoming', 'overdue'])
              .ilike('type', typePattern);
          } catch (e) {
            console.warn('[banking-agent] Failed to auto-clear matching installment status:', e.message);
          }
        }
        toolResult = error ? { error: error.message } : data;
      } else {
        toolResult = { status: 'awaiting_details', message: 'Need bill type (electricity, mobile, ration, insurance) and amount to proceed.' };
      }
      break;
    }
    default:
      toolResult = await getBalance(supabase, accountId);
  }

  const lang = context.language || 'hi';
  const langInstruction = getSystemPromptLanguageInstruction(lang);
  const systemPrompt = `You are a banking assistant for rural India.
${langInstruction}
User: ${context.name || 'User'}, Account: ${accountId}
BANK DATA: ${JSON.stringify(toolResult)}

[TASK]
Generate a user response based on the BANK DATA. Keep it extremely concise, clear, and reassuring.

[FEW-SHOT EXAMPLES]
---
Example 1: Money Transfer Success
- English (en): Your money transfer of ₹5,000.00 to Arjun was completed successfully. Never share your OTP or PIN.
- Hindi (hi): आपका ₹5,000.00 का अर्जुन को मनी ट्रांसफर सफलतापूर्वक पूरा हो गया है। अपना ओटीपी या पिन कभी किसी के साथ साझा न करें।
- Kannada (kn): ನಿಮ್ಮ ₹5,000.00 ಹಣ ವರ್ಗಾವಣೆ ಅರ್ಜುನ್ ಗೆ ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಂಡಿದೆ. ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.

Example 2: Bill Payment Success
- English (en): Your electricity bill payment of ₹1,200.00 was successful. Receipt ID: REC9876. Never share your OTP or PIN.
- Hindi (hi): आपका ₹1,200.00 का बिजली बिल भुगतान सफल रहा। रसीद संख्या: REC9876 है। अपना ओटीपी या पिन कभी किसी के साथ साझा न करें।
- Kannada (kn): ನಿಮ್ಮ ₹1,200.00 ನ ವಿದ್ಯುತ್ ಬಿಲ್ ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ. ರಸೀದಿ ಸಂಖ್ಯೆ: REC9876. ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.

Example 3: Fixed Deposit Creation Success
- English (en): Your Fixed Deposit of ₹10,000.00 for 12 months has been created successfully. Never share your OTP or PIN.
- Hindi (hi): आपका ₹10,000.00 का फिक्स्ड डिपॉजिट 12 महीनों के लिए बन गया है। अपना ओटीपी या पिन कभी किसी के साथ साझा न करें।
- Kannada (kn): ನಿಮ್ಮ ₹10,000.00 ನ ಫಿಕ್ಸೆಡ್ ಡೆಪಾಸಿಟ್ 12 ತಿಂಗಳುಗಳಿಗೆ ರಚನೆಯಾಗಿದೆ. ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.
---

[CRITICAL RULES]
1. State the transaction or query status clearly in 1 or 2 short sentences.
2. Use numbers and names directly from the BANK DATA.
3. Ensure currency values are formatted in Indian Style (thousands, Lakhs, Crores) with a ₹ prefix (e.g. ₹1,50,000.00).
4. Safety Warning: You MUST end your response with the language-specific safety warning suffix exactly as follows:
   - English: Never share your OTP or PIN.
   - Hindi: अपना ओटीपी या पिन कभी किसी के साथ साझा न करें।
   - Kannada: ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.`;

  // Try to generate a local hardcoded response to bypass Gemini for standard tasks
  const localResponse = formatLocalizedResponse(action, toolResult, lang, userMessage);
  if (localResponse) {
    return {
      response: localResponse,
      model_used: 'local-logic',
      agent: 'banking',
      key_index: -1,
      tool_called: action,
    };
  }

  const messages = [...(history || []).slice(-6), { role: 'user', content: userMessage }];
  const result = await callGemini(supabase, systemPrompt, userMessage, messages.slice(0, -1), 1000);

  return {
    response: result.text,
    model_used: result.model_used,
    agent: 'banking',
    key_index: result.key_index,
    tool_called: action,
  };
}

// ── Local Response Formatter ───────────────────────────────────

function formatLocalizedResponse(action, toolResult, lang, userMessage) {
  if (!toolResult || toolResult.error) return null;
  if (toolResult.status === 'awaiting_details') return null;

  const isHi = lang === 'hi';
  const isKn = lang === 'kn';

  const suffix = isHi 
    ? ' अपना ओटीपी या पिन कभी किसी के साथ साझा न करें।' 
    : isKn 
      ? ' ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.' 
      : ' Never share your OTP or PIN.';

  switch (action) {
    case 'balance': {
      if (isHi) {
        return `नमस्ते ${toolResult.name || 'उपयोगकर्ता'}, आपका उपलब्ध बैलेंस ${toolResult.balance} है।` + suffix;
      }
      if (isKn) {
        return `ನಮಸ್ಕಾರ ${toolResult.name || 'ಬಳಕೆದಾರರೇ'}, ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ${toolResult.balance} ಬ್ಯಾಲೆನ್ಸ್ ಇದೆ.` + suffix;
      }
      return `Hello ${toolResult.name || 'User'}, your available balance is ${toolResult.balance}.` + suffix;
    }

    case 'transactions': {
      const txns = toolResult || [];
      if (txns.length === 0) {
        return isHi 
          ? 'कोई हालिया लेनदेन नहीं मिला।' + suffix 
          : isKn 
            ? 'ಯಾವುದೇ ಇತ್ತೀಚಿನ ವಹಿವಾಟುಗಳು ಕಂಡುಬಂದಿಲ್ಲ.' + suffix 
            : 'No recent transactions found.' + suffix;
      }
      
      const listStr = txns.slice(0, 3).map(t => {
        const typeStr = t.type === 'credit' 
          ? (isHi ? 'जमा' : isKn ? 'ಜಮಾ' : 'received') 
          : (isHi ? 'निकासी' : isKn ? 'ಖರ್ಚು' : 'spent');
        return `₹${formatINR(t.amount)} ${typeStr} (${t.description || t.date})`;
      }).join(', ');

      if (isHi) {
        return `आपके हालिया लेनदेन: ${listStr} हैं।` + suffix;
      }
      if (isKn) {
        return `ನಿಮ್ಮ ಇತ್ತೀಚಿನ ವಹಿವಾಟುಗಳು: ${listStr} ಆಗಿದೆ.` + suffix;
      }
      return `Your recent transactions: ${listStr}.` + suffix;
    }

    case 'installments': {
      const insts = (toolResult || []).filter(i => i.status !== 'paid');
      if (insts.length === 0) {
        return isHi 
          ? 'आपकी कोई बकाया किस्त नहीं है।' + suffix 
          : isKn 
            ? 'ನಿಮ್ಮ ಯಾವುದೇ ಬಾಕಿ ಕಂತುಗಳಿಲ್ಲ.' + suffix 
            : 'You have no outstanding installments.' + suffix;
      }

      const listStr = insts.slice(0, 3).map(i => `${i.type}: ₹${formatINR(i.amount)} (${i.due_date})`).join(', ');

      if (isHi) {
        return `आपकी बकाया किस्तें: ${listStr} हैं।` + suffix;
      }
      if (isKn) {
        return `ನಿಮ್ಮ ಬಾಕಿ ಕಂತುಗಳು: ${listStr} ಆಗಿದೆ.` + suffix;
      }
      return `Your outstanding installments: ${listStr}.` + suffix;
    }

    case 'loans': {
      if (toolResult.success && toolResult.payments) {
        const p = toolResult.payments[0];
        if (isHi) {
          return `आपका ${p.loan_type} का ₹${formatINR(p.emi_paid)} का ईएमआई भुगतान सफल रहा। शेष बकाया: ₹${formatINR(p.outstanding)} है।` + suffix;
        }
        if (isKn) {
          return `ನಿಮ್ಮ ${p.loan_type} ನ ₹${formatINR(p.emi_paid)} ಇಎಂಐ ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ. ಬಾಕಿ ಇರುವ ಮೊತ್ತ: ₹${formatINR(p.outstanding)}.` + suffix;
        }
        return `Your ${p.loan_type} EMI payment of ₹${formatINR(p.emi_paid)} was successful. Remaining outstanding: ₹${formatINR(p.outstanding)}.` + suffix;
      }

      const activeLoans = (toolResult || []).filter(l => l.status === 'active');
      if (activeLoans.length === 0) {
        return isHi 
          ? 'आपका कोई सक्रिय लोन नहीं है।' + suffix 
          : isKn 
            ? 'ನಿಮ್ಮದೇ ಸಕ್ರಿಯ ಸಾಲಗಳಿಲ್ಲ.' + suffix 
            : 'You have no active loans.' + suffix;
      }

      if (isHi) {
        const listStrHi = activeLoans.map(l => `${l.loan_type} (बकाया: ₹${formatINR(l.outstanding)}, ईएमआई: ₹${formatINR(l.emi_amount)})`).join(', ');
        return `आपके सक्रिय लोन: ${listStrHi} हैं।` + suffix;
      }
      if (isKn) {
        const listStrKn = activeLoans.map(l => `${l.loan_type} (ಬಾಕಿ: ₹${formatINR(l.outstanding)}, ಇಎಂಐ: ₹${formatINR(l.emi_amount)})`).join(', ');
        return `ನಿಮ್ಮ ಸಕ್ರಿಯ ಸಾಲಗಳು: ${listStrKn} ಆಗಿದೆ.` + suffix;
      }
      const listStrEn = activeLoans.map(l => `${l.loan_type} (Outstanding: ₹${formatINR(l.outstanding)}, EMI: ₹${formatINR(l.emi_amount)})`).join(', ');
      return `Your active loans: ${listStrEn}.` + suffix;
    }

    case 'bill': {
      if (toolResult.success && toolResult.receipt) {
        const r = toolResult.receipt;
        const billNames = {
          electricity: { en: 'electricity', hi: 'बिजली', kn: 'ವಿದ್ಯುತ್‌' },
          mobile_recharge: { en: 'mobile recharge', hi: 'मोबाइल रिचार्ज', kn: 'ಮೊಬೈಲ್ ರೀಚಾರ್ಜ್' },
          ration: { en: 'ration shop', hi: 'राशन दुकान', kn: 'ರೇಷನ್ ಅಂಗಡಿ' },
          insurance_premium: { en: 'insurance premium', hi: 'बीमा प्रीमियम', kn: 'ವಿಮಾ ಪ್ರೀಮಿಯಂ' }
        };
        const name = billNames[r.bill_type]?.[lang] || r.bill_type;

        if (isHi) {
          return `आपका ₹${formatINR(r.amount_paid)} का ${name} बिल भुगतान सफल रहा। रसीद संख्या: ${r.receipt_id} है।` + suffix;
        }
        if (isKn) {
          return `ನಿಮ್ಮ ₹${formatINR(r.amount_paid)} ನ ${name} ಬಿಲ್ ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ. ರಸೀದಿ ಸಂಖ್ಯೆ: ${r.receipt_id}.` + suffix;
        }
        return `Your ${name} bill payment of ₹${formatINR(r.amount_paid)} was successful. Receipt ID: ${r.receipt_id}.` + suffix;
      }
      return null;
    }

    case 'spending': {
      const limitRaw = toolResult.monthly_limit_raw !== undefined ? toolResult.monthly_limit_raw : toolResult.monthly_limit;
      const spentRaw = toolResult.total_spent_raw !== undefined ? toolResult.total_spent_raw : toolResult.total_spent;
      const remRaw = toolResult.remaining_raw !== undefined ? toolResult.remaining_raw : toolResult.remaining;
      
      const limitStr = `₹${formatINR(limitRaw)}`;
      const spentStr = `₹${formatINR(spentRaw)}`;
      const remStr = `₹${formatINR(remRaw)}`;

      if (limitRaw === 0) {
        if (isHi) return `आपने इस महीने ${spentStr} खर्च किए हैं। मासिक बजट सीमा सेट नहीं है।` + suffix;
        if (isKn) return `ಈ ತಿಂಗಳು ನೀವು ${spentStr} ಖರ್ಚು ಮಾಡಿದ್ದೀರಿ. ಮಾಸಿಕ ಬಜೆಟ್ ಮಿತಿ ಹೊಂದಿಸಿಲ್ಲ.` + suffix;
        return `You have spent ${spentStr} this month. No monthly budget limit is set.` + suffix;
      }

      if (isHi) {
        return `मासिक बजट: ${limitStr}, कुल खर्च: ${spentStr}, शेष सीमा: ${remStr} है।` + suffix;
      }
      if (isKn) {
        return `ಮಾಸಿಕ ಬಜೆಟ್: ${limitStr}, ಒಟ್ಟು ಖರ್ಚು: ${spentStr}, ಬಾಕಿ ಮಿತಿ: ${remStr} ಆಗಿದೆ.` + suffix;
      }
      return `Monthly budget: ${limitStr}, total spent: ${spentStr}, remaining limit: ${remStr}.` + suffix;
    }

    case 'fixed_deposits': {
      if (toolResult.success) {
        const amt = toolResult.principal || toolResult.amount || '';
        const dur = toolResult.duration_months || '';
        if (isHi) {
          return `आपका ₹${formatINR(amt)} का फिक्स्ड डिपॉजिट ${dur} महीनों के लिए बन गया है।` + suffix;
        }
        if (isKn) {
          return `ನಿಮ್ಮ ₹${formatINR(amt)} ನ ಫಿಕ್ಸೆಡ್ ಡೆಪಾಸಿಟ್ ${dur} ತಿಂಗಳುಗಳಿಗೆ ರಚನೆಯಾಗಿದೆ.` + suffix;
        }
        return `Your Fixed Deposit of ₹${formatINR(amt)} for ${dur} months has been created successfully.` + suffix;
      }
      
      const fds = toolResult || [];
      if (fds.length === 0) {
        return isHi 
          ? 'आपका कोई सक्रिय फिक्स्ड डिपॉजिट नहीं है।' + suffix 
          : isKn 
            ? 'ನಿಮ್ಮದೇ ಸಕ್ರಿಯ ಸಾಲಗಳಿಲ್ಲ.' + suffix 
            : 'You have no active Fixed Deposits.' + suffix;
      }

      const listStr = fds.map(f => `₹${formatINR(f.principal)} (${f.duration_months}m, maturity amount: ₹${formatINR(f.maturity_amount)} on ${f.maturity_date})`).join(', ');

      if (isHi) {
        return `आपके फिक्स्ड डिपॉजिट: ${listStr} हैं।` + suffix;
      }
      if (isKn) {
        return `ನಿಮ್ಮ फಿಕ್ಸೆಡ್ ಡೆಪಾಸಿಟ್‌ಗಳು: ${listStr} ಆಗಿದೆ.` + suffix;
      }
      return `Your Fixed Deposits: ${listStr}.` + suffix;
    }

    case 'transfer': {
      if (toolResult.success) {
        const amt = toolResult.amount || toolResult.receipt?.amount_paid || '';
        if (isHi) {
          return `आपका ₹${formatINR(amt)} का मनी ट्रांसफर सफलतापूर्वक पूरा हो गया है।` + suffix;
        }
        if (isKn) {
          return `ನಿಮ್ಮ ₹${formatINR(amt)} ಹಣ ವರ್ಗಾವಣೆ ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಂಡಿದೆ.` + suffix;
        }
        return `Your money transfer of ₹${formatINR(amt)} was completed successfully.` + suffix;
      }
      return null;
    }
  }

  return null;
}
