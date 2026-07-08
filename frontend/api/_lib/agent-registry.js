import natural from 'natural';
import nlp from 'compromise';

// Format values to Indian Currency format (Lakh/Crore system)
function formatINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
  return Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Suffix for money/security queries
const safetySuffix = {
  en: ' Never share your OTP or PIN.',
  hi: ' अपना ओटीपी या पिन कभी किसी के साथ साझा न करें।',
  kn: ' ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.'
};

// Recipient maps for transfers
const RECIPIENT_MAP = {
  arjun: 'SB-3001',
  savitha: 'SB-2001',
  meera: 'SB-2002',
  fatima: 'JD-1002',
  ramesh: 'JD-1001'
};

// ── Database of Handcoded Agentic & Informational Q&A ────────────────
const AGENTIC_REGISTRY = [
  // ─── GREETINGS (respond in user's language, zero Gemini) ───
  {
    id: 'greeting_hello',
    match: [
      /^hello$/i, /^hi$/i, /^hey$/i, /^namaste$/i, /^namaskar$/i, /^good morning$/i, /^good afternoon$/i, /^good evening$/i,
      /^नमस्ते$/i, /^नमस्कार$/i, /^सुप्रभात$/i, /^शुभ प्रभात$/i, /^शुभ संध्या$/i, /^शुभ रात्रि$/i,
      /^प्रणाम$/i, /^राम राम$/i, /^जय हिन्द$/i, /^भाई$/i,
      /^ನಮಸ್ಕಾರ$/i, /^ಶುಭೋದಯ$/i, /^ಶುಭ ಸಂಜೆ$/i, /^ಹಲೋ$/i, /^ಹಾಯ್$/i,
      /namaste/i, /namaskar/i, /suprabhat/i, /shubh prabhat/i, /ram ram/i, /pranam/i,
      /सुप्रभात/i, /शुभ प्रभात/i, /शुभ संध्या/i, /नमस्ते/i, /नमस्कार/i, /प्रणाम/i, /राम राम/i,
      /ನಮಸ್ಕಾರ/i, /ಶುಭೋದಯ/i, /ಶುಭ ಸಂಜೆ/i, /ಹಲೋ/i
    ],
    execute: async (supabase, accountId, lang) => {
      if (lang === 'hi') return '🙏 नमस्ते! मैं Artha Mitra हूँ, आपका वित्तीय सहायक। आज मैं आपकी क्या मदद कर सकता हूँ? मैं आपका बैलेंस चेक कर सकता हूँ, बिलों का भुगतान कर सकता हूँ, सरकारी योजनाओं के बारे में बता सकता हूँ या वित्तीय सुरक्षा सिखा सकता हूँ।';
      if (lang === 'kn') return '🙏 ನಮಸ್ಕಾರ! ನಾನು Artha Mitra, ನಿಮ್ಮ ಹಣಕಾಸು ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ? ನಾನು ನಿಮ್ಮ ಬ್ಯಾಲೆನ್ಸ್ ಪರಿಶೀಲಿಸಬಹುದು, ಬಿಲ್ ಪಾವತಿಸಬಹುದು, ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ವಿವರಿಸಬಹುದು ಅಥವಾ ಹಣಕಾಸು ಸುರಕ್ಷತೆಯನ್ನು ಕಲಿಸಬಹುದು.';
      return '🙏 Hello! I am Artha Mitra, your financial assistant. How can I help you today? I can check your balance, pay bills, explain government schemes, or teach financial safety.';
    }
  },
  {
    id: 'greeting_thankyou',
    match: [/thank/i, /shukriya/i, /dhanyavaad/i, /धन्यवाद/i, /शुक्रिया/i, /ಧನ್ಯವಾದ/i],
    execute: async (s, a, lang) => {
      if (lang === 'hi') return 'आपका स्वागत है! यदि आपको किसी और चीज़ में सहायता चाहिए तो मुझे बताएं। अपना ओटीपी या पिन कभी साझा न करें।';
      if (lang === 'kn') return 'ನಿಮಗೆ ಸ್ವಾಗತ! ನಿಮಗೆ ಬೇರೆ ಯಾವುದೇ ಸಹಾಯ ಬೇಕಿದ್ದಲ್ಲಿ ತಿಳಿಸಿ. ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಎಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.';
      return 'You are welcome! Let me know if you need help with anything else. Never share your OTP or PIN.';
    }
  },
  {
    id: 'greeting_goodbye',
    match: [/^bye/i, /goodbye/i, /alvida/i, /अलविदा/i, /फिर मिलेंगे/i, /ಬರುತ್ತೇನೆ/i, /ಹೋಗಿ ಬರುತ್ತೇನೆ/i],
    execute: async (s, a, lang) => {
      if (lang === 'hi') return 'अलविदा! आपका दिन सुरक्षित और सफल रहे। अपना ओटीपी या पिन कभी साझा न करें।';
      if (lang === 'kn') return 'ಹೋಗಿ ಬರುತ್ತೇನೆ! ನಿಮ್ಮ ದಿನ ಸುರಕ್ಷಿತ ಮತ್ತು ಯಶಸ್ವಿಯಾಗಿರಲಿ. ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಎಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.';
      return 'Goodbye! Have a secure and successful day ahead. Never share your OTP or PIN.';
    }
  },

  // ─── AGENTIC TASK: BALANCE CHECK (1) ───
  {
    id: 'agent_balance',
    match: [/balance/i, /account balance/i, /paisa kitna/i, /shesh rashi/i, /bachat kitna/i, /ಬ್ಯಾಲೆನ್ಸ್/i, /ಖಾತೆಯಲ್ಲಿ ಎಷ್ಟು ಹಣ/i, /ಬैलेंस/i, /बाकी/i],
    execute: async (supabase, accountId, lang) => {
      const { data } = await supabase.from('accounts').select('name, balance').eq('account_id', accountId).single();
      if (!data) return { error: 'Account not found' };
      const balStr = `₹${formatINR(data.balance)}`;
      const suffix = safetySuffix[lang] || safetySuffix.en;
      if (lang === 'hi') return `नमस्ते ${data.name || 'उपयोगकर्ता'}, आपका उपलब्ध बैलेंस ${balStr} है।` + suffix;
      if (lang === 'kn') return `ನಮಸ್ಕಾರ ${data.name || 'ಬಳಕೆದಾರರೇ'}, ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ${balStr} ಬ್ಯಾಲೆನ್ಸ್ ಇದೆ.` + suffix;
      return `Hello ${data.name || 'User'}, your available balance is ${balStr}.` + suffix;
    }
  },

  // ─── AGENTIC TASK: TRANSACTION LEDGER (2) ───
  {
    id: 'agent_transactions',
    match: [/transactions/i, /statement/i, /ledger/i, /history/i, /lenden/i, /len den/i, /विवरण/i, /लेनदेन/i, /ವಹಿವಾಟುಗಳು/i],
    execute: async (supabase, accountId, lang) => {
      const { data: txns } = await supabase.from('transactions').select('*').eq('account_id', accountId).order('date', { ascending: false }).limit(3);
      const suffix = safetySuffix[lang] || safetySuffix.en;
      if (!txns || txns.length === 0) {
        if (lang === 'hi') return 'कोई हालिया लेनदेन नहीं मिला।' + suffix;
        if (lang === 'kn') return 'ಯಾವುದೇ ಇತ್ತೀಚಿನ ವಹಿವಾಟುಗಳು ಕಂಡುಬಂದಿಲ್ಲ.' + suffix;
        return 'No recent transactions found.' + suffix;
      }
      const isHi = lang === 'hi';
      const isKn = lang === 'kn';
      const listStr = txns.map(t => {
        const typeStr = t.type === 'credit' ? (isHi ? 'जमा' : isKn ? 'ಜಮಾ' : 'received') : (isHi ? 'निकासी' : isKn ? 'ಖರ್ಚು' : 'spent');
        return `₹${formatINR(t.amount)} ${typeStr} (${t.description || t.date})`;
      }).join(', ');
      if (isHi) return `आपके हालिया लेनदेन: ${listStr} हैं।` + suffix;
      if (isKn) return `ನಿಮ್ಮ ಇತ್ತೀಚಿನ ವಹಿವಾಟುಗಳು: ${listStr} ಆಗಿದೆ.` + suffix;
      return `Your recent transactions: ${listStr}.` + suffix;
    }
  },

  // ─── AGENTIC TASK: BILL PAYMENTS (3-6) ───
  {
    id: 'agent_pay_electricity',
    match: [/pay electricity/i, /electricity bill/i, /light bill/i, /bijli bill/i, /ವಿದ್ಯುತ್ ಬಿಲ್/i],
    execute: async (supabase, accountId, lang, context, userMessage) => {
      const { amount } = extractEntities(userMessage);
      const finalAmount = amount !== null ? amount : 300;
      const { data, error } = await supabase.rpc('pay_bill', {
        p_account_id: accountId,
        p_bill_type: 'electricity',
        p_amount: finalAmount
      });
      const suffix = safetySuffix[lang] || safetySuffix.en;
      if (error) return (lang === 'hi' ? `त्रुटि: ${error.message}` : `Error: ${error.message}`) + suffix;
      const receiptId = data?.receipt?.receipt_id || 'N/A';
      if (lang === 'hi') return `आपका ₹${formatINR(finalAmount)} का बिजली बिल भुगतान सफल रहा। रसीद संख्या: ${receiptId} है।` + suffix;
      if (lang === 'kn') return `ನಿಮ್ಮ ₹${formatINR(finalAmount)} ನ ವಿದ್ಯುತ್ ಬಿಲ್ ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ. ರಸೀದಿ ಸಂಖ್ಯೆ: ${receiptId}.` + suffix;
      return `Your electricity bill payment of ₹${formatINR(finalAmount)} was successful. Receipt ID: ${receiptId}.` + suffix;
    }
  },
  {
    id: 'agent_pay_mobile',
    match: [/pay mobile/i, /mobile recharge/i, /phone recharge/i, /talktime/i, /ಮೊಬೈಲ್ ರೀಚಾರ್ಜ್/i, /मोबाइल रिचार्ज/i],
    execute: async (supabase, accountId, lang, context, userMessage) => {
      const { amount } = extractEntities(userMessage);
      const finalAmount = amount !== null ? amount : 199;
      const { data, error } = await supabase.rpc('pay_bill', {
        p_account_id: accountId,
        p_bill_type: 'mobile_recharge',
        p_amount: finalAmount
      });
      const suffix = safetySuffix[lang] || safetySuffix.en;
      if (error) return (lang === 'hi' ? `त्रुटि: ${error.message}` : `Error: ${error.message}`) + suffix;
      const receiptId = data?.receipt?.receipt_id || 'N/A';
      if (lang === 'hi') return `आपका ₹${formatINR(finalAmount)} का मोबाइल रिचार्ज सफल रहा। रसीद संख्या: ${receiptId} है।` + suffix;
      if (lang === 'kn') return `ನಿಮ್ಮ ₹${formatINR(finalAmount)} ನ ಮೊಬೈಲ್ ರೀಚಾರ್ಜ್ ಯಶಸ್ವಿಯಾಗಿದೆ. ರಸೀದಿ ಸಂಖ್ಯೆ: ${receiptId}.` + suffix;
      return `Your mobile recharge of ₹${formatINR(finalAmount)} was successful. Receipt ID: ${receiptId}.` + suffix;
    }
  },
  {
    id: 'agent_pay_ration',
    match: [/pay ration/i, /ration card payment/i, /ration bill/i, /ರೇಷನ್ ಬಿಲ್/i, /ರಾಶನ್ ಬಿಲ್/i, /राशन बिल/i],
    execute: async (supabase, accountId, lang, context, userMessage) => {
      const { amount } = extractEntities(userMessage);
      const finalAmount = amount !== null ? amount : 150;
      const { data, error } = await supabase.rpc('pay_bill', {
        p_account_id: accountId,
        p_bill_type: 'ration',
        p_amount: finalAmount
      });
      const suffix = safetySuffix[lang] || safetySuffix.en;
      if (error) return (lang === 'hi' ? `त्रुटि: ${error.message}` : `Error: ${error.message}`) + suffix;
      const receiptId = data?.receipt?.receipt_id || 'N/A';
      if (lang === 'hi') return `आपका ₹${formatINR(finalAmount)} का राशन बिल भुगतान सफल रहा। रसीद संख्या: ${receiptId} है।` + suffix;
      if (lang === 'kn') return `ನಿಮ್ಮ ₹${formatINR(finalAmount)} ನ ರೇಷನ್ ಬಿಲ್ ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ. ರಸೀದಿ ಸಂಖ್ಯೆ: ${receiptId}.` + suffix;
      return `Your ration bill payment of ₹${formatINR(finalAmount)} was successful. Receipt ID: ${receiptId}.` + suffix;
    }
  },
  {
    id: 'agent_pay_insurance',
    match: [/pay insurance/i, /insurance premium/i, /policy payment/i, /bima premium/i, /ವಿಮಾ ಪ್ರೀಮಿಯಂ/i, /बीमा प्रीमियम/i],
    execute: async (supabase, accountId, lang, context, userMessage) => {
      const { amount } = extractEntities(userMessage);
      const finalAmount = amount !== null ? amount : 1200;
      const { data, error } = await supabase.rpc('pay_bill', {
        p_account_id: accountId,
        p_bill_type: 'insurance_premium',
        p_amount: finalAmount
      });
      const suffix = safetySuffix[lang] || safetySuffix.en;
      if (error) return (lang === 'hi' ? `त्रुटि: ${error.message}` : `Error: ${error.message}`) + suffix;
      const receiptId = data?.receipt?.receipt_id || 'N/A';
      if (lang === 'hi') return `आपका ₹${formatINR(finalAmount)} का बीमा प्रीमियम भुगतान सफल रहा। रसीद संख्या: ${receiptId} है।` + suffix;
      if (lang === 'kn') return `ನಿಮ್ಮ ₹${formatINR(finalAmount)} ನ ವಿಮಾ ಪ್ರೀಮಿಯಂ ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ. ರಸೀದಿ ಸಂಖ್ಯೆ: ${receiptId}.` + suffix;
      return `Your insurance premium payment of ₹${formatINR(finalAmount)} was successful. Receipt ID: ${receiptId}.` + suffix;
    }
  },

  // ─── AGENTIC TASK: LOAN EMI PAYMENTS (7-12) ───
  {
    id: 'agent_pay_kcc_loan',
    match: [/pay kcc/i, /kcc emi/i, /repay kcc/i, /kcc kist/i, /kcc kisto/i, /ಕಿಸಾನ್ ಇಎಂಐ ಪಾವತಿ/i, /किसान लोन चुकाना/i],
    execute: async (supabase, accountId, lang) => {
      return executeSingleLoanPayment(supabase, accountId, 'Kisan Credit Card', lang);
    }
  },
  {
    id: 'agent_pay_tractor_loan',
    match: [/pay tractor/i, /tractor emi/i, /repay tractor/i, /tractor kist/i, /tractor kisto/i, /ಟ್ರಾಕ್ಟರ್ ಇಎಂಐ ಪಾವತಿ/i, /ट्रेक्टर लोन चुकाना/i],
    execute: async (supabase, accountId, lang) => {
      return executeSingleLoanPayment(supabase, accountId, 'Tractor Loan', lang);
    }
  },
  {
    id: 'agent_pay_all_loans',
    match: [
      /pay all loan/i, /pay all emi/i, /clear loans/i, /सभी लोन/i, /ಎಲ್ಲಾ ಸಾಲ/i,
      /pay\s*(?:my\s*)?loan emi/i, /repay\s*(?:my\s*)?loan emi/i,
      /pay\s*(?:my\s*)?emi/i, /pay\s*(?:my\s*)?loan/i,
      /loan emi chukana/i, /लोन ईएमआई/i, /ಸಾಲದ ಇಎಂಐ/i
    ],
    execute: async (supabase, accountId, lang) => {
      const suffix = safetySuffix[lang] || safetySuffix.en;
      const { data: activeLoans } = await supabase.from('loans').select('*').eq('account_id', accountId).eq('status', 'active');
      if (!activeLoans || activeLoans.length === 0) {
        if (lang === 'hi') return 'भुगतान करने के लिए कोई सक्रिय लोन नहीं मिला।' + suffix;
        if (lang === 'kn') return 'ಪಾವತಿಸಲು ಯಾವುದೇ ಸಕ್ರಿಯ ಸಾಲಗಳು ಕಂಡುಬಂದಿಲ್ಲ.' + suffix;
        return 'No active loans found to pay.' + suffix;
      }
      
      const { data: account } = await supabase.from('accounts').select('balance').eq('account_id', accountId).single();
      let currentBalance = Number(account.balance);
      let paidList = [];

      for (const loan of activeLoans) {
        const emi = Number(loan.emi_amount);
        if (currentBalance >= emi) {
          const newOutstanding = Math.max(0, Number(loan.outstanding) - emi);
          const newRemainingEmis = Math.max(0, loan.remaining_emis - 1);
          const newStatus = newRemainingEmis === 0 ? 'closed' : 'active';
          
          await supabase.from('loans').update({ outstanding: newOutstanding, remaining_emis: newRemainingEmis, status: newStatus }).eq('loan_id', loan.loan_id);
          currentBalance -= emi;
          await supabase.from('accounts').update({ balance: currentBalance }).eq('account_id', accountId);
          await supabase.from('transactions').insert({ account_id: accountId, date: new Date().toISOString().split('T')[0], type: 'debit', amount: emi, description: `${loan.loan_type} EMI Payment` });
          
          try {
            await supabase.from('installments').update({ status: 'paid' }).eq('account_id', accountId).eq('amount', emi).in('status', ['upcoming', 'overdue']).ilike('type', `%${loan.loan_type.split(' ')[0]}%`);
          } catch (e) {}

          paidList.push(loan.loan_type);
        }
      }

      if (paidList.length === 0) {
        if (lang === 'hi') return 'अपर्याप्त बैलेंस के कारण किसी भी लोन का भुगतान नहीं हो सका।' + suffix;
        if (lang === 'kn') return 'ಅಪೂರ್ಣ ಬ್ಯಾಲೆನ್ಸ್ ಕಾರಣ ಯಾವುದೇ ಸಾಲ ಪಾವತಿಯಾಗಿಲ್ಲ.' + suffix;
        return 'Could not pay any loans due to insufficient balance.' + suffix;
      }

      const listStr = paidList.join(', ');
      if (lang === 'hi') return `इन ऋणों की किस्त का भुगतान सफल रहा: ${listStr}। शेष बैलेंस: ₹${formatINR(currentBalance)}।` + suffix;
      if (lang === 'kn') return `ಈ ಸಾಲಗಳ ಇಎಂಐ ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ: ${listStr}. ಬಾಕಿ ಬ್ಯಾಲೆನ್ಸ್: ₹${formatINR(currentBalance)}.` + suffix;
      return `EMIs paid successfully for: ${listStr}. Remaining balance: ₹${formatINR(currentBalance)}.` + suffix;
    }
  },
  {
    id: 'agent_check_loans',
    match: [
      /check loan/i, /loan details/i, /my loan/i, /outstanding loan/i, /active loan/i, /rin details/i,
      /लोन चेक/i, /मेरा लोन/i, /ऋण विवरण/i, /कर्ज/i,
      /ಸಾಲದ ವಿವರಗಳು/i, /ಸಾಲ ಚೆಕ್/i, /ನನ್ನ ಸಾಲ/i
    ],
    execute: async (supabase, accountId, lang) => {
      const suffix = safetySuffix[lang] || safetySuffix.en;
      const { data: activeLoans } = await supabase.from('loans').select('*').eq('account_id', accountId).eq('status', 'active');
      
      if (!activeLoans || activeLoans.length === 0) {
        if (lang === 'hi') return 'आपका कोई सक्रिय लोन नहीं है।' + suffix;
        if (lang === 'kn') return 'ನಿಮ್ಮ ಯಾವುದೇ ಸಕ್ರಿಯ ಸಾಲಗಳಿಲ್ಲ.' + suffix;
        return 'You have no active loans.' + suffix;
      }

      const isHi = lang === 'hi';
      const isKn = lang === 'kn';
      
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
        return `📊 **आपके सक्रिय ऋण (Active Loans)**:\n\n${lines.join('\n\n')}\n\n` + suffix;
      }
      if (isKn) {
        return `📊 **ನಿಮ್ಮ ಸಕ್ರಿಯ ಸಾಲಗಳು (Active Loans)**:\n\n${lines.join('\n\n')}\n\n` + suffix;
      }
      return `📊 **Your Active Loans**:\n\n${lines.join('\n\n')}\n\n` + suffix;
    }
  },
  {
    id: 'agent_check_installments',
    match: [
      /installment/i, /reminder/i, /due/i, /overdue/i, /kist/i,
      /किस्त/i, /याद दिलाना/i, /बकाया/i,
      /ಕಂತು/i, /ಬಾಕಿ/i, /ನೆನಪಿಸು/i
    ],
    execute: async (supabase, accountId, lang) => {
      const suffix = safetySuffix[lang] || safetySuffix.en;
      const { data: insts } = await supabase.from('installments').select('*').eq('account_id', accountId).in('status', ['upcoming', 'overdue']);
      
      if (!insts || insts.length === 0) {
        if (lang === 'hi') return 'आपकी कोई बकाया किस्त या अनुस्मारक नहीं है।' + suffix;
        if (lang === 'kn') return 'ನಿಮ್ಮ ಯಾವುದೇ ಬಾಕಿ ಕಂತುಗಳು ಅಥವಾ ಜ್ಞಾಪನೆಗಳಿಲ್ಲ.' + suffix;
        return 'You have no outstanding installments or reminders.' + suffix;
      }

      const isHi = lang === 'hi';
      const isKn = lang === 'kn';
      
      const lines = insts.map(i => {
        const statusLabel = i.status === 'overdue' 
          ? (isHi ? '⚠️ विलंबित (Overdue)' : isKn ? '⚠️ ವಿಳಂಬಿತ (Overdue)' : '⚠️ Overdue')
          : (isHi ? '📅 आगामी (Upcoming)' : isKn ? '📅 ಮುಂಬರುವ (Upcoming)' : '📅 Upcoming');
        
        if (isHi) {
          return `• **${i.type}**:\n` +
                 `  - राशि: ₹${formatINR(i.amount)}\n` +
                 `  - देय तिथि: ${i.due_date}\n` +
                 `  - स्थिति: ${statusLabel}\n` +
                 `  - आवृत्ति: ${i.frequency}`;
        }
        if (isKn) {
          return `• **${i.type}**:\n` +
                 `  - ಮೊತ್ತ: ₹${formatINR(i.amount)}\n` +
                 `  - ಕೊನೆಯ ದಿನಾಂಕ: ${i.due_date}\n` +
                 `  - ಸ್ಥಿತಿ: ${statusLabel}\n` +
                 `  - ಆವರ್ತನ: ${i.frequency}`;
        }
        return `• **${i.type}**:\n` +
               `  - Amount: ₹${formatINR(i.amount)}\n` +
               `  - Due Date: ${i.due_date}\n` +
               `  - Status: ${statusLabel}\n` +
               `  - Frequency: ${i.frequency}`;
      });

      if (isHi) {
        return `📊 **आपकी बकाया किस्तें और अनुस्मारक (Installments & Reminders)**:\n\n${lines.join('\n\n')}\n\n` + suffix;
      }
      if (isKn) {
        return `📊 **ನಿಮ್ಮ ಬಾಕಿ ಕಂತುಗಳು ಮತ್ತು ಜ್ಞಾಪನೆಗಳು (Installments & Reminders)**:\n\n${lines.join('\n\n')}\n\n` + suffix;
      }
      return `📊 **Your Outstanding Installments & Reminders**:\n\n${lines.join('\n\n')}\n\n` + suffix;
    }
  },

  // ─── AGENTIC TASK: SET BUDGET / SPENDING LIMIT (13-17) ───
  {
    id: 'agent_set_budget',
    match: [/set budget to (\d+)/i, /limit (\d+)/i, /बजट (\d+)/i, /ಮಿತಿ (\d+)/i],
    execute: async (supabase, accountId, lang, context, userMessage) => {
      const { amount } = extractEntities(userMessage);
      const limit = amount !== null ? amount : 5000;
      await supabase.from('accounts').update({ monthly_limit: limit }).eq('account_id', accountId);
      const suffix = safetySuffix[lang] || safetySuffix.en;
      if (lang === 'hi') return `आपका मासिक बजट सीमा सफलतापूर्वक ₹${formatINR(limit)} सेट हो गया है।` + suffix;
      if (lang === 'kn') return `ನಿಮ್ಮ ಮಾಸಿಕ ಬಜೆಟ್ ಮಿತಿಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ₹${formatINR(limit)} ಗೆ ಹೊಂದಿಸಲಾಗಿದೆ.` + suffix;
      return `Your monthly budget limit has been successfully set to ₹${formatINR(limit)}.` + suffix;
    }
  },
  {
    id: 'agent_check_budget',
    match: [/spending limit/i, /check budget/i, /spent this month/i, /kharcha check/i, /ಬಜೆಟ್ ಚೆಕ್/i, /spend/i, /breakdown/i, /analysis/i, /खर्च/i, /ಖರ್ಚು/i],
    execute: async (supabase, accountId, lang, context, userMessage) => {
      // 1. Fetch user account details
      const { data: acct } = await supabase.from('accounts').select('monthly_limit, balance').eq('account_id', accountId).single();
      const limit = acct?.monthly_limit || 0;
      
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

      const savings = Math.max(0, income - spent);
      const limitReached = limit > 0 && spent >= limit;
      const suffix = safetySuffix[lang] || safetySuffix.en;

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

      const categorizeTransaction = (description) => {
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
      };

      (txns || []).filter(t => t.type === 'debit').forEach(t => {
        const cat = categorizeTransaction(t.description);
        categoryTotals[cat] += Number(t.amount);
      });

      const isHi = lang === 'hi';
      const isKn = lang === 'kn';

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
      for (const [cat, amt] of Object.entries(categoryTotals)) {
        if (amt > 0) {
          lines.push(`  - ${labels[cat]}: ₹${formatINR(amt)}`);
        }
      }
      const breakdownStr = lines.length > 0 
        ? lines.join('\n') 
        : (isHi ? '  - कोई खर्च नहीं' : isKn ? '  - ಯಾವುದೇ ವೆಚ್ಚವಿಲ್ಲ' : '  - No expenses recorded');

      if (isHi) {
        let advice = `📊 **बजट विश्लेषण (इस महीने)**:\n` +
                     `* कुल जमा (आय): ₹${formatINR(income)}\n` +
                     `* कुल खर्च: ₹${formatINR(spent)}\n` +
                     `* उपलब्ध बचत: ₹${formatINR(savings)}\n` +
                     `* मासिक सीमा: ₹${formatINR(limit)}\n\n` +
                     `📋 **श्रेणी के अनुसार खर्च (Spending Breakdown)**:\n${breakdownStr}`;

        if (limit > 0) {
          if (limitReached) {
            advice += `\n\n⚠️ **सावधान!** आपका इस महीने का खर्च आपकी सेट की गई सीमा ₹${formatINR(limit)} से अधिक हो चुका है। कृपया केवल आवश्यक चीजों पर ही खर्च करें।`;
          } else if (spent > limit * 0.8) {
            advice += `\n\n💡 **सलाह:** आप अपने मासिक बजट के 80% भाग को खर्च कर चुके हैं। शेष दिनों के लिए अपने खर्च को नियंत्रित करें।`;
          } else {
            advice += `\n\n👍 **शानदार!** आपका बजट नियंत्रण में है। यदि संभव हो, तो ₹2,000 की फिक्स्ड डिपॉजिट (FD) शुरू करें ताकि उस पर अधिक ब्याज मिल सके।`;
          }
        }
        return advice + suffix;
      }

      if (isKn) {
        let advice = `📊 **ಬಜೆಟ್ ವಿಶ್ಲೇಷಣೆ (ಈ ತಿಂಗಳು)**:\n` +
                     `* ಒಟ್ಟು ಜಮಾ (ಆದಾಯ): ₹${formatINR(income)}\n` +
                     `* ಒಟ್ಟು ವೆಚ್ಚ (ಖರ್ಚು): ₹${formatINR(spent)}\n` +
                     `* ಉಳಿತಾಯ: ₹${formatINR(savings)}\n` +
                     `* ಮಾಸಿಕ ಮಿತಿ: ₹${formatINR(limit)}\n\n` +
                     `📋 **ವರ್ಗದ ಪ್ರಕಾರ ವೆಚ್ಚದ ವಿವರಗಳು (Spending Breakdown)**:\n${breakdownStr}`;

        if (limit > 0) {
          if (limitReached) {
            advice += `\n\n⚠️ **ಎಚ್ಚರಿಕೆ!** ನಿಮ್ಮ ಖರ್ಚು ಈಗಾಗಲೇ ನಿಮ್ಮ ಮಾಸಿಕ ಮಿತಿ ₹${formatINR(limit)} ದಾಟಿದೆ. ದಯವಿಟ್ಟು ಅನಗತ್ಯ ವೆಚ್ಚಗಳನ್ನು ನಿಯಂತ್ರಿಸಿ.`;
          } else if (spent > limit * 0.8) {
            advice += `\n\n💡 **ಸಲಹೆ:** ನಿಮ್ಮ ಮಾಸಿಕ ಬಜೆಟ್‌ನ 80% ಖರ್ಚಾಗಿದೆ. ಉಳಿದ ದಿನಗಳಲ್ಲಿ ಖರ್ಚು ನಿಯಂತ್ರಿಸಿ.`;
          } else {
            advice += `\n\n👍 **ಉತ್ತಮ!** ನಿಮ್ಮ ಬಜೆಟ್ ನಿಯಂತ್ರಣದಲ್ಲಿದೆ. ಉಳಿತಾಯದ ಹಣವನ್ನು ಎಫ್‌ಡಿ (FD) ಯಲ್ಲಿ ಹೂಡಿಕೆ ಮಾಡಲು ಯೋಚಿಸಿ.`;
          }
        }
        return advice + suffix;
      }

      let advice = `📊 **Budget Analysis (This Month)**:\n` +
                   `* Total Credits (Income): ₹${formatINR(income)}\n` +
                   `* Total Debits (Expenses): ₹${formatINR(spent)}\n` +
                   `* Net Savings: ₹${formatINR(savings)}\n` +
                   `* Configured Limit: ₹${formatINR(limit)}\n\n` +
                   `📋 **Spending Breakdown**:\n${breakdownStr}`;

      if (limit > 0) {
        if (limitReached) {
          advice += `\n\n⚠️ **Alert!** You have exceeded your configured limit of ₹${formatINR(limit)}. Avoid non-essential expenses for the rest of the month.`;
        } else if (spent > limit * 0.8) {
          advice += `\n\n💡 **Tip:** You have consumed 80% of your monthly limit. Keep your spending under control.`;
        } else {
          advice += `\n\n👍 **Well done!** Your budget is well within control. Consider putting some money into a Fixed Deposit (FD) to earn higher returns.`;
        }
      }
      return advice + suffix;
    }
  },

  // ─── AGENTIC TASK: FIXED DEPOSIT CREATION (18-21) ───
  {
    id: 'agent_create_fd',
    match: [/create fd/i, /open fd/i, /start fd/i, /make (?:an )?fd/i, /setup (?:an )?fd/i, /fd banao/i, /ಎಫ್‌ಡಿ ಕ್ರಿಯೇಟ್/i],
    execute: async (supabase, accountId, lang, context, userMessage) => {
      const { amount } = extractEntities(userMessage);
      const finalAmount = amount !== null ? amount : 10000;
      let durationMonths = 12;
      const durationMatch = userMessage.toLowerCase().match(/(\d+)\s*(month|mahina|year|saal|varsha|ತಿಂಗಳು|ವರ್ಷ)/);
      if (durationMatch) {
        const val = parseInt(durationMatch[1]);
        const unit = durationMatch[2];
        durationMonths = ['year', 'saal', 'varsha', 'ವರ್ಷ'].includes(unit) ? val * 12 : val;
      }
      const { data, error } = await supabase.rpc('create_fixed_deposit', {
        p_account_id: accountId,
        p_amount: finalAmount,
        p_duration_months: durationMonths
      });
      const suffix = safetySuffix[lang] || safetySuffix.en;
      if (error || (data && !data.success)) {
        const errMsg = error?.message || data?.error || 'Unknown error';
        return (lang === 'hi' ? `त्रुटि: ${errMsg}` : `Error: ${errMsg}`) + suffix;
      }
      const fd = data.fd || {};
      const principalStr = formatINR(fd.principal);
      const interestStr = formatINR(fd.interest_earned);
      const maturityStr = formatINR(fd.maturity_amount);
      const rateStr = fd.interest_rate || '6.00';

      if (lang === 'hi') {
        return `आपका ₹${principalStr} का फिक्स्ड डिपॉजिट ${durationMonths} महीनों के लिए ${rateStr}% ब्याज दर पर सफलतापूर्वक बन गया है।\n• कुल अर्जित ब्याज: ₹${interestStr}\n• कुल परिपक्वता राशि (Maturity Value): ₹${maturityStr}\n• परिपक्वता तिथि (Maturity Date): ${fd.maturity_date || 'N/A'}` + suffix;
      }
      if (lang === 'kn') {
        return `ನಿಮ್ಮ ₹${principalStr} ನ ಫಿಕ್ಸೆಡ್ ಡೆಪಾಸಿಟ್ ${durationMonths} ತಿಂಗಳುಗಳಿಗೆ ${rateStr}% ಬಡ್ಡಿ ದರದಲ್ಲಿ ಯಶಸ್ವಿಯಾಗಿ ರಚನೆಯಾಗಿದೆ.\n• ಗಳಿಸಿದ ಒಟ್ಟು ಬಡ್ಡಿ: ₹${interestStr}\n• ಒಟ್ಟು ಮುಕ್ತಾಯದ ಮೊತ್ತ (Maturity Value): ₹${maturityStr}\n• ಮುಕ್ತಾಯದ ದಿನಾಂಕ (Maturity Date): ${fd.maturity_date || 'N/A'}` + suffix;
      }
      return `Your Fixed Deposit of ₹${principalStr} for ${durationMonths} months at ${rateStr}% interest rate has been created successfully.\n• Total Interest Earned: ₹${interestStr}\n• Total Maturity Value: ₹${maturityStr}\n• Maturity Date: ${fd.maturity_date || 'N/A'}` + suffix;
    }
  },

  // ─── AGENTIC TASK: FUND TRANSFERS (22-31) ───
  {
    id: 'agent_transfer_funds',
    match: [
      /(?:send|transfer|pay|bhejo|kalisi)\s+(?:.*)?\s*(arjun|savitha|meera|fatima|ramesh)/i,
      /(arjun|savitha|meera|fatima|ramesh)\s+(?:.*)?\s*(?:bhejo|kalisi|transfer)/i
    ],
    execute: async (supabase, accountId, lang, context, userMessage) => {
      const { amount, recipient } = extractEntities(userMessage);
      const finalAmount = amount;
      const textLower = userMessage.toLowerCase();
      let toId = null;
      let name = '';

      const targetName = recipient ? recipient.toLowerCase() : '';

      if (targetName.includes('arjun') || textLower.includes('arjun')) { toId = RECIPIENT_MAP.arjun; name = 'Arjun'; }
      else if (targetName.includes('savitha') || textLower.includes('savitha')) { toId = RECIPIENT_MAP.savitha; name = 'Savitha'; }
      else if (targetName.includes('meera') || textLower.includes('meera')) { toId = RECIPIENT_MAP.meera; name = 'Meera'; }
      else if (targetName.includes('fatima') || textLower.includes('fatima')) { toId = RECIPIENT_MAP.fatima; name = 'Fatima'; }
      else if (targetName.includes('ramesh') || textLower.includes('ramesh')) { toId = RECIPIENT_MAP.ramesh; name = 'Ramesh'; }

      const suffix = safetySuffix[lang] || safetySuffix.en;
      if (!finalAmount || !toId) {
        if (lang === 'hi') return 'कृपया सही नाम और राशि बताएं। उदाहरण: "send 500 to Arjun"' + suffix;
        return 'Please provide a valid recipient name and amount. Example: "send 500 to Arjun"' + suffix;
      }
      if (accountId === toId) {
        return (lang === 'hi' ? 'आप स्वयं के खाते में पैसे नहीं भेज सकते।' : 'Cannot transfer money to your own account.') + suffix;
      }

      const { error } = await supabase.rpc('transfer_funds', {
        p_from_id: accountId,
        p_to_id: toId,
        p_amount: finalAmount
      });
      if (error) return (lang === 'hi' ? `स्थानांतरण विफल: ${error.message}` : `Transfer failed: ${error.message}`) + suffix;
      
      if (lang === 'hi') return `आपका ₹${formatINR(finalAmount)} का ${name} को मनी ट्रांसफर सफलतापूर्वक पूरा हो गया है।` + suffix;
      if (lang === 'kn') return `ನಿಮ್ಮ ₹${formatINR(finalAmount)} ಹಣ ವರ್ಗಾವಣೆ ${name} ಗೆ ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಂಡಿದೆ.` + suffix;
      return `Your money transfer of ₹${formatINR(finalAmount)} to ${name} was completed successfully.` + suffix;
    }
  },

  // ─── AGENTIC TASK: GOVERNMENT SCHEME ENROLLMENT (32-42) ───
  {
    id: 'agent_enroll_scheme',
    match: [
      /(?:enroll|apply|register)\s*(?:in|for|to|into|me|m|ಮ)?\s*(pm-kisan|pmkisan|ujjwala|ayushman|atal pension|apy|awas yojana|mgnrega|sukanya|mudra|jan dhan|pmjdy)/i,
      /(pm-kisan|pmkisan|ujjwala|ayushman|atal pension|apy|awas yojana|mgnrega|sukanya|mudra|jan dhan|pmjdy)\s*(?:me|nalli)?\s*(?:enroll|apply|register|naamankan|noondani|nondani)/i,
      /नामांकन/i, /ನೋಂದಣಿ/i
    ],
    execute: async (supabase, accountId, lang, context, userMessage) => {
      const textLower = userMessage.toLowerCase();
      let schemeName = '';
      if (textLower.includes('kisan') || textLower.includes('pmkisan')) schemeName = 'PM-KISAN';
      else if (textLower.includes('ujjwala')) schemeName = 'PM Ujjwala Yojana';
      else if (textLower.includes('ayushman') || textLower.includes('pmjay')) schemeName = 'Ayushman Bharat';
      else if (textLower.includes('atal') || textLower.includes('apy')) schemeName = 'Atal Pension Yojana';
      else if (textLower.includes('awas') || textLower.includes('pmay')) schemeName = 'PM Awas Yojana';
      else if (textLower.includes('mgnrega') || textLower.includes('nrega')) schemeName = 'MGNREGA';
      else if (textLower.includes('sukanya') || textLower.includes('ssy')) schemeName = 'Sukanya Samriddhi Yojana';
      else if (textLower.includes('mudra')) schemeName = 'PM Mudra Yojana';
      else if (textLower.includes('jan dhan') || textLower.includes('pmjdy')) schemeName = 'Pradhan Mantri Jan Dhan Yojana';

      if (!schemeName) {
        if (lang === 'hi') return 'कृपया योजना का नाम स्पष्ट रूप से बताएं जिसमें आप नामांकन करना चाहते हैं।';
        if (lang === 'kn') return 'ದಯವಿಟ್ಟು ನೀವು ನೋಂದಾಯಿಸಲು ಬಯಸುವ ಯೋಜನೆಯ ಹೆಸರನ್ನು ತಿಳಿಸಿ.';
        return 'Please specify the scheme name you want to enroll in clearly.';
      }

      const { data: acct } = await supabase.from('accounts').select('linked_schemes').eq('account_id', accountId).single();
      const schemes = acct?.linked_schemes || [];
      if (!schemes.includes(schemeName)) {
        schemes.push(schemeName);
        await supabase.from('accounts').update({ linked_schemes: schemes }).eq('account_id', accountId);
      }

      if (lang === 'hi') return `बधाई हो! आपका ${schemeName} योजना के लिए सफलतापूर्वक पंजीकरण हो गया है।`;
      if (lang === 'kn') return `ಅಭಿನಂದನೆಗಳು! ${schemeName} ಯೋಜನೆಗಾಗಿ ನಿಮ್ಮ ನೋಂದಣಿ ಯಶಸ್ವಿಯಾಗಿದೆ.`;
      return `Congratulations! Your enrollment in ${schemeName} has been processed successfully.`;
    }
  },

  // ─── INFORMATIONAL: GREETINGS & SAFETY (43-150+) ───
  {
    id: 'info_pmkisan',
    match: [/pm-kisan/i, /pm kisan/i, /kisan samman/i, /किसान सम्मान/i, /ಕಿಸಾನ್ ಸಮ್ಮಾನ್/i],
    execute: async (s, a, lang) => {
      if (lang === 'hi') return "🌾 पीएम-किसान योजना के तहत सीमांत किसानों को सालाना ₹6,000 की नकद सहायता सीधे बैंक खाते में ₹2,000 की 3 किस्तों में दी जाती है। आवश्यक: आधार कार्ड और जमीन के कागजात।";
      if (lang === 'kn') return "🌾 ಪಿಎಂ-ಕಿಸಾನ್ ಯೋಜನೆಯು ಭೂಮಿ ಹೊಂದಿರುವ ರೈತ ಕುಟುಂಬಗಳಿಗೆ ವರ್ಷಕ್ಕೆ ₹6,000 ಆರ್ಥಿಕ ಸಹಾಯವನ್ನು ತಲಾ ₹2,000 ರಂತೆ 3 ಕಂತುಗಳಲ್ಲಿ ನೀಡುತ್ತದೆ. ಅಗತ್ಯ ದಾಖಲೆಗಳು: ಆಧಾರ್ ಮತ್ತು ಜಮೀನು ದಾಖಲೆಗಳು.";
      return "🌾 PM-KISAN gives ₹6,000/year to landholding farmer families in 3 equal installments of ₹2,000 directly into their bank accounts. Required: Aadhaar card and land records.";
    }
  },
  {
    id: 'info_ujjwala',
    match: [/ujjwala/i, /free gas/i, /gas connection/i, /उज्ज्वला/i, /ಉಜ್ವಲ/i],
    execute: async (s, a, lang) => {
      if (lang === 'hi') return "🔥 प्रधानमंत्री उज्ज्वला योजना के तहत गरीबी रेखा के नीचे (BPL) परिवारों की महिलाओं को मुफ्त गैस कनेक्शन और पहला सिलेंडर दिया जाता है। जरूरी दस्तावेज: बीपीएल राशन कार्ड, आधार कार्ड और फोटो।";
      if (lang === 'kn') return "🔥 ಪಿಎಂ ಉಜ್ವಲ ಯೋಜನೆಯು ಬಿಪಿಎಲ್ ಕುಟುಂಬದ ಮಹಿಳೆಯರಿಗೆ ಉಚಿತ ಗ್ಯಾಸ್ ಕನೆಕ್ಷನ್ ಮತ್ತು ಮೊದಲ ಸಿಲಿಂಡರ್ ಒದಗಿಸುತ್ತದೆ. ಅಗತ್ಯ ದಾಖಲೆಗಳು: ಬಿಪಿಎಲ್ ಕಾರ್ಡ್ ಮತ್ತು ಆಧಾರ್ ಕಾರ್ಡ್.";
      return "🔥 PM Ujjwala Yojana provides free LPG cylinder connections to adult women from BPL (Below Poverty Line) households. Necessary documents: BPL card, Aadhaar card, and mobile number.";
    }
  },
  {
    id: 'info_ayushman',
    match: [/ayushman/i, /pmjay/i, /health card/i, /medical insurance/i, /आयुष्मान/i, /ಆಯುಷ್ಮಾನ್/i],
    execute: async (s, a, lang) => {
      if (lang === 'hi') return "🏥 आयुष्मान भारत (PM-JAY) योजना के अंतर्गत गरीब परिवारों को देश के किसी भी सूचीबद्ध अस्पताल में सालाना ₹5 लाख तक का मुफ्त इलाज मिलता है। जरूरी: आधार कार्ड और राशन कार्ड।";
      if (lang === 'kn') return "🏥 ಆಯುಷ್ಮಾನ್ ಭಾರತ ಯೋಜನೆಯು ಪ್ರತಿ ಕುಟುಂಬಕ್ಕೆ ವರ್ಷಕ್ಕೆ ₹5 ಲಕ್ಷದವರೆಗೆ ಉಚಿತ ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆ ನೀಡುತ್ತದೆ. ಅಗತ್ಯ ದಾಖಲೆಗಳು: ಆಧಾರ್ ಕಾರ್ಡ್ ಮತ್ತು ಸಕ್ರಿಯ ರೇಷನ್ ಕಾರ್ಡ್.";
      return "🏥 Ayushman Bharat (PM-JAY) provides free hospital cover up to ₹5 lakh per family per year for secondary and tertiary care hospitalization. Required: Aadhaar card and active Ration card.";
    }
  },
  {
    id: 'info_otp_safety',
    match: [/otp safe/i, /share otp/i, /otp dena/i, /ओटीपी/i, /ಒಟಿಪಿ/i],
    execute: async (s, a, lang) => {
      if (lang === 'hi') return "⚠️ ओटीपी (OTP) साझा करना बेहद खतरनाक है और कभी भी सुरक्षित नहीं है। बैंक या सरकारी अधिकारी कभी भी आपका ओटीपी नहीं मांगते। इसे साझा करने से हैकर्स तुरंत आपके पैसे चुरा सकते हैं।";
      if (lang === 'kn') return "⚠️ ಒಟಿಪಿ (OTP) ಹಂಚಿಕೊಳ್ಳುವುದು ಅತ್ಯಂತ ಅಪಾಯಕಾರಿ ಮತ್ತು ಎಂದಿಗೂ ಸುರಕ್ಷಿತವಲ್ಲ. ಬ್ಯಾಂಕ್ ಅಥವಾ ಸರ್ಕಾರಿ ಅಧಿಕಾರಿಗಳು ಎಂದಿಗೂ ನಿಮ್ಮ ಒಟಿಪಿಯನ್ನು ಕೇಳುವುದಿಲ್ಲ. ಅದನ್ನು ಹಂಚಿಕೊಂಡರೆ ನಿಮ್ಮ ಹಣವನ್ನು ತಕ್ಷಣವೇ ಕದಿಯಬಹುದು.";
      return "⚠️ Sharing OTP is extremely dangerous and NEVER safe. Banks or government officials will never ask for your OTP. Sharing it allows hackers to steal your money instantly.";
    }
  },
  {
    id: 'info_pin_safety',
    match: [/pin safe/i, /share pin/i, /पिन/i, /ಪಿನ್/i],
    execute: async (s, a, lang) => {
      if (lang === 'hi') return "⚠️ कभी भी अपना यूपीआई पिन (UPI PIN) या एटीएम पिन किसी के साथ साझा न करें। आपका पिन आपके बैंक खाते की चाबी है; इसे साझा करने से आपके पैसे चोरी हो सकते हैं।";
      if (lang === 'kn') return "⚠️ ನಿಮ್ಮ ಯುಪಿಐ ಪಿನ್ (UPI PIN) ಅಥವಾ ಎಟಿಎಂ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ. ನಿಮ್ಮ ಪಿನ್ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಯ ಕೀಲಿಯಾಗಿದೆ; ಅದನ್ನು ಹಂಚಿಕೊಂಡರೆ ನಿಮ್ಮ ಹಣ ಕಳುವಾಗಬಹುದು.";
      return "⚠️ NEVER share your UPI PIN or ATM PIN with anyone. Your PIN is the key to your bank account; sharing it will lead to money theft.";
    }
  },
  {
    id: 'agent_view_profile',
    match: [/show (?:my )?profile/i, /check (?:my )?profile/i, /profile details/i, /मेरा प्रोफाइल/i, /ನನ್ನ ಪ್ರೊಫೈಲ್/i],
    execute: async (supabase, accountId, lang) => {
      const suffix = safetySuffix[lang] || safetySuffix.en;
      const { data: session } = await supabase.from('sessions').select('*').eq('session_id', accountId).single();
      
      if (!session || !session.profile || Object.keys(session.profile).length === 0) {
        if (lang === 'hi') return 'कोई प्रोफाइल विवरण नहीं मिला।' + suffix;
        if (lang === 'kn') return 'ಯಾವುದೇ ಪ್ರೊಫೈಲ್ ವಿವರಗಳು ಕಂಡುಬಂದಿಲ್ಲ.' + suffix;
        return 'No profile details found.' + suffix;
      }

      const p = session.profile;
      const isHi = lang === 'hi';
      const isKn = lang === 'kn';

      if (isHi) {
        return `👤 **उपयोगकर्ता प्रोफाइल (User Profile)**:\n` +
               `* **नाम**: ${p.name || 'N/A'}\n` +
               `* **भाषा (Language)**: ${p.language || 'N/A'}\n` +
               `* **व्यवसाय (Occupation)**: ${p.occupation || 'N/A'}\n` +
               `* **स्थान (Location)**: ${p.location || 'N/A'}\n` +
               `* **आय वर्ग (Income Bracket)**: ${p.income_bracket || 'N/A'}\n` +
               `* **स्मार्टफोन है?**: ${p.has_smartphone ? 'हाँ' : 'नहीं'}\n` +
               `* **धोखाधड़ी जोखिम**: ${p.fraud_risk || 'N/A'}\n` + suffix;
      }

      if (isKn) {
        return `👤 **ಬಳಕೆದಾರ ಪ್ರೊಫೈಲ್ (User Profile)**:\n` +
               `* **ಹೆಸರು**: ${p.name || 'N/A'}\n` +
               `* **ಭಾಷೆ (Language)**: ${p.language || 'N/A'}\n` +
               `* **ಉದ್ಯೋಗ (Occupation)**: ${p.occupation || 'N/A'}\n` +
               `* **ಸ್ಥಳ (Location)**: ${p.location || 'N/A'}\n` +
               `* **ಆದಾಯ ವರ್ಗ (Income Bracket)**: ${p.income_bracket || 'N/A'}\n` +
               `* **ಸ್ಮಾರ್ಟ್‌ಫೋನ್ ಇದೆಯೇ?**: ${p.has_smartphone ? 'ಹೌದು' : 'ಇಲ್ಲ'}\n` +
               `* **ವಂಚನೆ ಅಪಾಯ**: ${p.fraud_risk || 'N/A'}\n` + suffix;
      }

      return `👤 **User Profile**:\n` +
             `* **Name**: ${p.name || 'N/A'}\n` +
             `* **Language**: ${p.language || 'N/A'}\n` +
             `* **Occupation**: ${p.occupation || 'N/A'}\n` +
             `* **Location**: ${p.location || 'N/A'}\n` +
             `* **Income Bracket**: ${p.income_bracket || 'N/A'}\n` +
             `* **Has Smartphone**: ${p.has_smartphone ? 'Yes' : 'No'}\n` +
             `* **Fraud Risk**: ${p.fraud_risk || 'N/A'}\n` + suffix;
    }
  },
  {
    id: 'agent_update_profile',
    match: [
      /update (?:my )?(name|language|lang|occupation|location|income|bracket|income_bracket|smartphone|phone) to (.+)/i,
      /change (?:my )?(name|language|lang|occupation|location|income|bracket|income_bracket|smartphone|phone) to (.+)/i,
      /मेरा (नाम|भाषा|व्यवसाय|स्थान|बजट|स्मार्टफोन) बदलकर (.+) कर दो/i,
      /ನನ್ನ (ಹೆಸರು|ಭಾಷೆ|ಉದ್ಯೋಗ|ಸ್ಥಳ|ಮೊಬೈಲ್) ಅನ್ನು (.+) ಗೆ ಬದಲಾಯಿಸಿ/i
    ],
    execute: async (supabase, accountId, lang, context, userMessage) => {
      const suffix = safetySuffix[lang] || safetySuffix.en;
      const { data: session } = await supabase.from('sessions').select('*').eq('session_id', accountId).single();
      
      if (!session) {
        if (lang === 'hi') return 'सत्र नहीं मिला।' + suffix;
        return 'Session not found.' + suffix;
      }

      const profile = session.profile || {};
      const match = userMessage.match(/update (?:my )?(name|language|lang|occupation|location|income|bracket|income_bracket|smartphone|phone) to (.+)/i) ||
                    userMessage.match(/change (?:my )?(name|language|lang|occupation|location|income|bracket|income_bracket|smartphone|phone) to (.+)/i) ||
                    userMessage.match(/मेरा (नाम|भाषा|व्यवसाय|स्थान|बजट|स्मार्टफोन) बदलकर (.+) कर दो/i) ||
                    userMessage.match(/ನನ್ನ (ಹೆಸರು|ಭಾಷೆ|ಉದ್ಯೋಗ|ಸ್ಥಳ|ಮೊಬೈಲ್) ಅನ್ನು (.+) ಗೆ ಬದಲಾಯಿಸಿ/i);

      if (!match) {
        if (lang === 'hi') return 'कृपया सही क्षेत्र और मान बताएं। उदाहरण: "update my location to Delhi"' + suffix;
        return 'Please specify the field and value. Example: "update my location to Delhi"' + suffix;
      }

      let rawField = match[1].toLowerCase().trim();
      let val = match[2].trim().replace(/[.?]+$/, '');

      let field = 'name';
      if (['name', 'नाम', 'ಹೆಸರು'].includes(rawField)) field = 'name';
      else if (['language', 'lang', 'भाषा', 'ಭಾಷೆ'].includes(rawField)) field = 'language';
      else if (['occupation', 'व्यवसाय', 'ಉದ್ಯೋಗ'].includes(rawField)) field = 'occupation';
      else if (['location', 'स्थान', 'ಸ್ಥಳ'].includes(rawField)) field = 'location';
      else if (['income', 'bracket', 'income_bracket'].includes(rawField)) field = 'income_bracket';
      else if (['smartphone', 'phone', 'स्मार्टफोन', 'ಮೊಬೈಲ್'].includes(rawField)) {
        field = 'has_smartphone';
        val = ['yes', 'true', 'हाँ', 'हूँ', 'ಹೌದು'].some(k => val.toLowerCase().includes(k));
      }

      // Perform update on profile
      profile[field] = val;

      await supabase.from('sessions').update({ profile }).eq('session_id', accountId);

      if (lang === 'hi') return `आपका प्रोफाइल क्षेत्र **${field}** सफलतापूर्वक बदलकर **${val}** कर दिया गया है।` + suffix;
      if (lang === 'kn') return `ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಫೀಲ್ಡ್ **${field}** ಅನ್ನು ಯಶಸ್ವಿಯಾಗಿ **${val}** ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.` + suffix;
      return `Your profile field **${field}** has been successfully updated to **${val}**.` + suffix;
    }
  },
  {
    id: 'agent_delete_profile',
    match: [
      /delete (?:my )?profile/i, /remove (?:my )?profile/i, /clear (?:my )?profile/i,
      /प्रोफाइल हटाओ/i, /ನನ್ನ ಪ್ರೊಫೈಲ್ ಅಳಿಸಿ/i
    ],
    execute: async (supabase, accountId, lang) => {
      const suffix = safetySuffix[lang] || safetySuffix.en;
      await supabase.from('sessions').update({ profile: {} }).eq('session_id', accountId);
      
      if (lang === 'hi') return 'आपका प्रोफाइल विवरण सफलतापूर्वक हटा दिया गया है।' + suffix;
      if (lang === 'kn') return 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ವಿವರಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಅಳಿಸಲಾಗಿದೆ.' + suffix;
      return 'Your profile details have been successfully deleted.' + suffix;
    }
  }
];

// Helper: Single loan payment execution
async function executeSingleLoanPayment(supabase, accountId, loanType, lang) {
  const suffix = safetySuffix[lang] || safetySuffix.en;
  
  // 1. Fetch active loan
  const { data: loan, error: fetchError } = await supabase
    .from('loans').select('*').eq('account_id', accountId).eq('loan_type', loanType).eq('status', 'active').single();

  if (fetchError || !loan) {
    if (lang === 'hi') return `भुगतान करने के लिए आपका कोई सक्रिय ${loanType} लोन नहीं मिला।` + suffix;
    if (lang === 'kn') return `ಪಾವತಿಸಲು ಯಾವುದೇ ಸಕ್ರಿಯ ${loanType} ಸಾಲ ಕಂಡುಬಂದಿಲ್ಲ.` + suffix;
    return `No active ${loanType} loan found to pay.` + suffix;
  }

  // 2. Fetch balance
  const { data: account } = await supabase.from('accounts').select('balance').eq('account_id', accountId).single();
  const emi = Number(loan.emi_amount);

  if (Number(account.balance) < emi) {
    if (lang === 'hi') return `अपर्याप्त बैलेंस। आवश्यकता: ₹${formatINR(emi)}, उपलब्ध: ₹${formatINR(account.balance)}।` + suffix;
    if (lang === 'kn') return `ಅಪೂರ್ಣ ಬ್ಯಾಲೆನ್ಸ್. ಅಗತ್ಯವಿದೆ: ₹${formatINR(emi)}, ಲಭ್ಯವಿದೆ: ₹${formatINR(account.balance)}.` + suffix;
    return `Insufficient balance. Required: ₹${formatINR(emi)}, Available: ₹${formatINR(account.balance)}.` + suffix;
  }

  // 3. Process DB write
  const newOutstanding = Math.max(0, Number(loan.outstanding) - emi);
  const newRemainingEmis = Math.max(0, loan.remaining_emis - 1);
  const newStatus = newRemainingEmis === 0 ? 'closed' : 'active';

  await supabase.from('loans').update({ outstanding: newOutstanding, remaining_emis: newRemainingEmis, status: newStatus }).eq('loan_id', loan.loan_id);
  const newBalance = Number(account.balance) - emi;
  await supabase.from('accounts').update({ balance: newBalance }).eq('account_id', accountId);
  await supabase.from('transactions').insert({ account_id: accountId, date: new Date().toISOString().split('T')[0], type: 'debit', amount: emi, description: `${loanType} EMI Payment` });
  
  try {
    await supabase.from('installments').update({ status: 'paid' }).eq('account_id', accountId).eq('amount', emi).in('status', ['upcoming', 'overdue']).ilike('type', `%${loanType.split(' ')[0]}%`);
  } catch (e) {}

  if (lang === 'hi') return `आपका ${loanType} का ₹${formatINR(emi)} का ईएमआई भुगतान सफल रहा। शेष बकाया: ₹${formatINR(newOutstanding)} है।` + suffix;
  if (lang === 'kn') return `ನಿಮ್ಮ ${loanType} ನ ₹${formatINR(emi)} ಇಎಂಐ ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ. ಬಾಕಿ ಇರುವ ಮೊತ್ತ: ₹${formatINR(newOutstanding)}.` + suffix;
  return `Your ${loanType} EMI payment of ₹${formatINR(emi)} was successful. Remaining outstanding: ₹${formatINR(newOutstanding)}.` + suffix;
}

const LevenshteinDistance = natural.LevenshteinDistance || natural.default?.LevenshteinDistance;

function extractEntities(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return { amount: null, recipient: null };
  const doc = nlp(userMessage);
  
  // Extract numerical values
  const numJson = doc.values().toNumber().json()[0];
  let amount = numJson?.number?.num || null;
  
  // Fallback to basic digit match if not resolved
  if (amount === null) {
    const match = userMessage.match(/(\d+)/);
    if (match) amount = parseFloat(match[1]);
  }

  // Extract recipient name
  const people = doc.people().out('array');
  const recipient = people[0] || null;

  return { amount, recipient };
}

// ── Hindi/Kannada → English Keyword Translation Map ──────────────────
// This lets ALL existing English regex patterns work with Hindi/Kannada input
// by translating common banking terms before matching.
const KEYWORD_TRANSLATIONS = {
  // ── Hindi (Devanagari) ──
  'बैलेंस': 'balance', 'शेष राशि': 'balance', 'बाकी': 'balance', 'पैसा कितना': 'balance',
  'बचत': 'savings', 'खाता': 'account', 'लेनदेन': 'transactions', 'विवरण': 'statement',
  'किस्त': 'installments', 'किस्तें': 'installments', 'ईएमआई': 'emi',
  'लोन': 'loan', 'ऋण': 'loan', 'कर्ज': 'loan',
  'फिक्स्ड डिपॉजिट': 'fixed deposit', 'एफडी': 'fixed deposit', 'सावधि जमा': 'fixed deposit',
  'ट्रांसफर': 'transfer', 'भेजो': 'transfer', 'भेजना': 'transfer', 'पैसे भेजो': 'transfer money',
  'बिजली': 'electricity', 'बिजली का बिल': 'electricity bill', 'लाइट बिल': 'electricity bill',
  'मोबाइल': 'mobile', 'रिचार्ज': 'recharge', 'मोबाइल रिचार्ज': 'mobile recharge',
  'राशन': 'ration', 'राशन कार्ड': 'ration card',
  'बीमा': 'insurance', 'प्रीमियम': 'premium',
  'योजना': 'scheme', 'योजनाएं': 'schemes', 'सरकारी योजना': 'government scheme',
  'पंजीकरण': 'enroll', 'आवेदन': 'apply', 'भर्ती': 'register',
  'भुगतान': 'pay', 'चुकाना': 'pay', 'जमा': 'deposit', 'निकासी': 'withdraw',
  'बिल': 'bill', 'बिल भुगतान': 'pay bill',
  'ब्याज': 'interest', 'ब्याज दर': 'interest rate',
  'खर्च': 'spending', 'बजट': 'budget', 'सीमा': 'limit',
  'मदद': 'help', 'सहायता': 'help',
  'ओटीपी': 'otp', 'पिन': 'pin', 'सुरक्षा': 'safety', 'धोखा': 'fraud', 'धोखाधड़ी': 'fraud',
  'किसान': 'kisan', 'ट्रेक्टर': 'tractor', 'मुद्रा': 'mudra',
  'पेंशन': 'pension', 'सुकन्या': 'sukanya', 'जीवन ज्योति': 'jeevan jyoti',
  'सुरक्षा बीमा': 'suraksha bima', 'जन धन': 'jan dhan',
  'आयुष्मान': 'ayushman', 'उज्ज्वला': 'ujjwala', 'मनरेगा': 'mgnrega',
  'नमस्ते': 'hello', 'नमस्कार': 'hello', 'सुप्रभात': 'good morning',
  'शुभ प्रभात': 'good morning', 'शुभ संध्या': 'good evening', 'शुभ रात्रि': 'good night',
  'प्रणाम': 'hello', 'राम राम': 'hello', 'अलविदा': 'goodbye',
  'धन्यवाद': 'thank you', 'शुक्रिया': 'thank you',
  'दिखाओ': 'show', 'बताओ': 'tell', 'चेक करो': 'check', 'देखो': 'check',
  'कितना': 'how much', 'कब': 'when', 'क्या': 'what',
  'हां': 'yes', 'नहीं': 'no', 'चाहिए': 'want', 'करना': 'do', 'करो': 'do',
  'मेरा': 'my', 'मेरी': 'my', 'मुझे': 'me',

  // ── Hindi (Romanized / Hinglish) ──
  'paisa kitna': 'balance', 'kitna paisa': 'balance', 'paise': 'money',
  'shesh rashi': 'balance', 'bachat kitna': 'balance',
  'len den': 'transactions', 'lenden': 'transactions',
  'kist': 'installments', 'kisto': 'installments',
  'bijli ka bill': 'electricity bill', 'bijli bill': 'electricity bill',
  'light bill': 'electricity bill',
  'bill bharo': 'pay bill', 'bill chukao': 'pay bill',
  'paise bhejo': 'transfer money', 'paisa bhejo': 'transfer money',
  'loan chukana': 'pay loan', 'emi bharo': 'pay emi',
  'yojana': 'scheme', 'yojnaye': 'schemes',
  'madad': 'help', 'sahayata': 'help',
  'kisan samman': 'pm kisan',

  // ── Kannada (Script) ──
  'ಬ್ಯಾಲೆನ್ಸ್': 'balance', 'ಖಾತೆ': 'account', 'ಹಣ': 'money',
  'ಖಾತೆಯಲ್ಲಿ ಎಷ್ಟು ಹಣ': 'balance', 'ಎಷ್ಟು ಹಣ': 'how much money',
  'ವಹಿವಾಟುಗಳು': 'transactions', 'ವಿವರ': 'statement',
  'ಕಂತು': 'installments', 'ಕಂತುಗಳು': 'installments', 'ಇಎಂಐ': 'emi',
  'ಸಾಲ': 'loan', 'ಸಾಲಗಳು': 'loans',
  'ಠೇವಣಿ': 'fixed deposit', 'ಎಫ್‌ಡಿ': 'fixed deposit',
  'ವರ್ಗಾವಣೆ': 'transfer', 'ಹಣ ಕಳುಹಿಸಿ': 'transfer money',
  'ವಿದ್ಯುತ್': 'electricity', 'ವಿದ್ಯುತ್ ಬಿಲ್': 'electricity bill', 'ಲೈಟ್ ಬಿಲ್': 'electricity bill',
  'ಮೊಬೈಲ್': 'mobile', 'ರೀಚಾರ್ಜ್': 'recharge',
  'ಪಡಿತರ': 'ration', 'ವಿಮೆ': 'insurance',
  'ಯೋಜನೆ': 'scheme', 'ಯೋಜನೆಗಳು': 'schemes', 'ಸರ್ಕಾರಿ ಯೋಜನೆ': 'government scheme',
  'ಪಾವತಿ': 'pay', 'ಪಾವತಿಸು': 'pay', 'ಬಿಲ್': 'bill', 'ಬಿಲ್ ಪಾವತಿ': 'pay bill',
  'ಬಡ್ಡಿ': 'interest', 'ಬಡ್ಡಿ ದರ': 'interest rate',
  'ಖರ್ಚು': 'spending', 'ಬಜೆಟ್': 'budget', 'ಮಿತಿ': 'limit',
  'ಸಹಾಯ': 'help',
  'ಒಟಿಪಿ': 'otp', 'ಪಿನ್': 'pin', 'ಸುರಕ್ಷತೆ': 'safety', 'ವಂಚನೆ': 'fraud',
  'ನಮಸ್ಕಾರ': 'hello', 'ಶುಭೋದಯ': 'good morning', 'ಶುಭ ಸಂಜೆ': 'good evening',
  'ಹಲೋ': 'hello', 'ಹಾಯ್': 'hi',
  'ಧನ್ಯವಾದ': 'thank you',
  'ತೋರಿಸಿ': 'show', 'ಹೇಳಿ': 'tell', 'ಪರಿಶೀಲಿಸಿ': 'check',
  'ಎಷ್ಟು': 'how much', 'ಯಾವಾಗ': 'when', 'ಏನು': 'what',
  'ನನ್ನ': 'my', 'ನನಗೆ': 'me', 'ಬೇಕು': 'want',
  'ಆಯುಷ್ಮಾನ್': 'ayushman', 'ಉಜ್ವಲ': 'ujjwala',
  'ಟ್ರಾಕ್ಟರ್': 'tractor', 'ಕಿಸಾನ್': 'kisan',
  'ಪಿಂಚಣಿ': 'pension',
};

// Sort by key length descending so longer phrases match first
const SORTED_TRANSLATIONS = Object.entries(KEYWORD_TRANSLATIONS)
  .sort((a, b) => b[0].length - a[0].length);

/**
 * Translate Hindi/Kannada keywords in user message to English equivalents.
 * This lets all existing English regex patterns match Hindi/Kannada input.
 */
function translateToEnglish(text) {
  if (!text) return text;
  let translated = text.toLowerCase();
  for (const [keyword, english] of SORTED_TRANSLATIONS) {
    if (translated.includes(keyword.toLowerCase())) {
      translated = translated.replaceAll(keyword.toLowerCase(), english);
    }
  }
  return translated.replace(/\s+/g, ' ').trim();
}

const TARGET_KEYWORDS = [
  'balance', 'transactions', 'installments', 'loans', 'fixed deposit', 'transfer', 'spending',
  'electricity', 'mobile', 'recharge', 'ration', 'insurance', 'premium',
  'enroll', 'apply', 'register', 'pm-kisan', 'ujjwala', 'ayushman', 'atal pension', 'mgnrega',
  'sukanya', 'mudra', 'jan dhan', 'jeevan jyoti', 'suraksha bima'
];

function correctSpelling(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return userMessage;
  const words = userMessage.toLowerCase().split(/\s+/);
  
  const correctedWords = words.map(word => {
    // Skip numbers, short words, or words containing special characters
    if (word.length <= 3 || !/^[a-z]+$/.test(word)) return word;

    let bestMatch = word;
    let minDistance = 2; // maximum edit distance to correct

    for (const target of TARGET_KEYWORDS) {
      const targetSubwords = target.split(/\s+/);
      for (const targetWord of targetSubwords) {
        if (targetWord.length <= 3) continue;
        const dist = LevenshteinDistance(word, targetWord);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = targetWord;
        }
      }
    }
    return bestMatch;
  });

  return correctedWords.join(' ');
}

const TRANSACTION_AGENT_IDS = [
  'agent_pay_electricity',
  'agent_pay_mobile',
  'agent_pay_ration',
  'agent_pay_insurance',
  'agent_pay_kcc_loan',
  'agent_pay_tractor_loan',
  'agent_pay_all_loans',
  'agent_create_fd',
  'agent_transfer_funds'
];

/**
 * Searches the agent registry and executes the corresponding database task or Q&A look-up.
 * Now tries matching BOTH the original message AND a translated English version,
 * so Hindi/Kannada input automatically matches English regex patterns.
 */
export async function executeAgenticTask(supabase, accountId, userMessage, lang, context = {}) {
  const cleanedMessage = correctSpelling(userMessage);
  const textLower = cleanedMessage.toLowerCase().trim();
  const activeLang = ['en', 'hi', 'kn'].includes(lang) ? lang : 'hi';

  const hasPending = context && context.pending_transaction;
  const isFourDigit = /^\s*\d{4}\s*$/.test(userMessage);

  // 1. Check for password submission when a transaction is pending
  if (isFourDigit && hasPending) {
    const enteredPin = userMessage.trim();
    if (enteredPin === '1234') {
      const pending = context.pending_transaction;
      delete context.pending_transaction; // Clear pending state

      const targetAgent = AGENTIC_REGISTRY.find(a => a.id === pending.agentId);
      if (targetAgent && targetAgent.execute) {
        try {
          const resultText = await targetAgent.execute(supabase, accountId, activeLang, context, pending.originalMessage);
          return resultText;
        } catch (err) {
          console.error(`[agentic-registry] Pending execution failed:`, err.message);
          if (activeLang === 'hi') return 'लेनदेन पूरा करने में असमर्थ। कृपया पुनः प्रयास करें।';
          if (activeLang === 'kn') return 'ವಹಿವಾಟು ಪೂರ್ಣಗೊಳಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.';
          return 'Could not complete the transaction. Please try again.';
        }
      }
    } else {
      delete context.pending_transaction; // Clear pending state on incorrect password
      if (activeLang === 'hi') return 'गलत लेनदेन पासवर्ड। लेनदेन रद्द कर दिया गया है।';
      if (activeLang === 'kn') return 'ತಪ್ಪು ವಹಿವಾಟು ಪಾಸ್‌ವರ್ಡ್. ವಹಿವಾಟು ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ.';
      return 'Incorrect transaction password. Transaction cancelled.';
    }
  }

  // 2. Check if user typed '1234' with no pending transaction
  if (userMessage.trim() === '1234' && !hasPending) {
    if (activeLang === 'hi') return 'पूरा करने के लिए कोई लंबित लेनदेन नहीं है।';
    if (activeLang === 'kn') return 'ಪೂರ್ಣಗೊಳಿಸಲು ಯಾವುದೇ ಬಾಕಿ ವಹಿವಾಟು ಇಲ್ಲ.';
    return 'There is no pending transaction to complete.';
  }

  // Generate a translated English version of the message
  const translatedText = translateToEnglish(userMessage);

  for (const item of AGENTIC_REGISTRY) {
    // Try original text first, then translated English version
    const matched = item.match.some(regex => regex.test(textLower))
      || item.match.some(regex => regex.test(translatedText));

    if (matched) {
      if (item.execute) {
        // Intercept transaction agents to prompt for the password
        if (TRANSACTION_AGENT_IDS.includes(item.id)) {
          if (!context) context = {};
          context.pending_transaction = {
            agentId: item.id,
            originalMessage: cleanedMessage,
            timestamp: Date.now()
          };

          if (activeLang === 'hi') {
            return 'कृपया लेनदेन पूरा करने के लिए अपना 4-अंकीय लेनदेन पासवर्ड दर्ज करें।';
          }
          if (activeLang === 'kn') {
            return 'ಈ ವಹಿವಾಟನ್ನು ಪೂರ್ಣಗೊಳಿಸಲು ದಯವಿಟ್ಟು ನಿಮ್ಮ 4-ಅಂಕಿಯ ವಹಿವಾಟು ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ.';
          }
          return 'Please enter your 4-digit transaction password to complete this transaction.';
        }

        try {
          const resultText = await item.execute(supabase, accountId, activeLang, context, cleanedMessage);
          return resultText;
        } catch (err) {
          console.error(`[agentic-registry] Task execution failed:`, err.message);
          return null;
        }
      }
    }
  }

  return null;
}

