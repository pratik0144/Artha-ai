/**
 * api/_lib/agents/banking.js — Banking Agent
 * Ported from backend/agents/specialist_agents.py BankingAgent
 */

import { callGemini } from '../gemini-pool.js';
import { getSystemPromptLanguageInstruction } from '../language-layer.js';

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
    'spending', 'budget', 'kharcha', 'limit', 'spent',
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
  'transfer', 'fixed_deposits', 'installments', 'loans',
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
  return data ? { name: data.name, balance: `₹${Number(data.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, balance_raw: data.balance } : { error: 'Account not found' };
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
  const { data: acct } = await supabase.from('accounts').select('balance').eq('account_id', accountId).single();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const { data: txns } = await supabase
    .from('transactions').select('amount').eq('account_id', accountId).eq('type', 'debit').gte('date', monthStart);
  const spent = (txns || []).reduce((s, t) => s + Number(t.amount), 0);
  return { total_spent: spent, balance: acct?.balance || 0, month: monthStart };
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
    case 'loans':
      toolResult = await getLoans(supabase, accountId); break;
    case 'spending':
      toolResult = await getSpending(supabase, accountId); break;
    case 'fixed_deposits':
      toolResult = await getFixedDeposits(supabase, accountId); break;
    case 'transfer': {
      const amtMatch = userMessage.match(/(\d+)/);
      toolResult = amtMatch
        ? { status: 'info', message: `Transfer of ₹${amtMatch[1]} noted. Please confirm recipient.` }
        : { status: 'awaiting_details', message: 'Need recipient name and amount.' };
      break;
    }
    case 'bill': {
      const amtMatch2 = userMessage.match(/(\d+)/);
      toolResult = amtMatch2
        ? { status: 'info', message: `Bill payment of ₹${amtMatch2[1]} noted.` }
        : { status: 'awaiting_details', message: 'Need bill type and amount.' };
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
Rules: Use ONLY numbers from BANK DATA. Max 2 sentences. Simple words. End with: Never share your OTP or PIN.`;

  const messages = [...(history || []).slice(-6), { role: 'user', content: userMessage }];
  const result = await callGemini(supabase, systemPrompt, userMessage, messages.slice(0, -1), 150);

  return {
    response: result.text,
    model_used: result.model_used,
    agent: 'banking',
    key_index: result.key_index,
    tool_called: action,
  };
}
