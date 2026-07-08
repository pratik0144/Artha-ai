/**
 * api/_lib/relationship-manager.js
 *
 * AI Relationship Manager — synthesis layer above the six specialist agents.
 *
 * Synthesizes a cross-account financial picture from EXISTING Supabase tables
 * (accounts, transactions, loans, fixed_deposits, government_schemes, fraud_logs)
 * and generates proactive, relevant observations.
 *
 * Design principles:
 *   - Read-only: no schema changes, no new tables
 *   - Nudge generation is RULE-BASED (no Gemini calls) — fast, free, deterministic
 *   - Nudges are genuinely conditional — empty array if nothing warrants mention
 *   - Multilingual output (en, hi, kn) matching existing language-layer patterns
 */

// ── Helpers ────────────────────────────────────────────────────────

function formatINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
  return Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Categorize a transaction description into a spending bucket.
 * Mirrors the logic in budgeting.js to keep categories consistent.
 */
function categorizeTransaction(description) {
  const desc = (description || '').toLowerCase();
  if (['fertilizer', 'seed', 'crop', 'farm', 'kcc', 'kisan'].some(k => desc.includes(k))) return 'agriculture';
  if (['electricity', 'bill', 'water', 'lpg', 'gas', 'cylinder', 'mobile', 'recharge'].some(k => desc.includes(k))) return 'utilities';
  if (['ration', 'food', 'grocery', 'shop', 'kirana'].some(k => desc.includes(k))) return 'household';
  if (['medical', 'medicine', 'hospital', 'doctor', 'health'].some(k => desc.includes(k))) return 'healthcare';
  if (['school', 'fees', 'education', 'college', 'book'].some(k => desc.includes(k))) return 'education';
  if (['wholesale', 'stock', 'rent', 'business'].some(k => desc.includes(k))) return 'business';
  return 'other';
}

// ── 1. Build Financial Snapshot ────────────────────────────────────

/**
 * Pull data from all existing Supabase tables for a single account
 * and return a structured cross-account financial snapshot.
 *
 * @param {object} supabase - Supabase client
 * @param {string} accountId - Account ID
 * @returns {object} Financial snapshot
 */
export async function buildFinancialSnapshot(supabase, accountId) {
  // Run all queries in parallel for speed
  const [
    { data: acct },
    { data: allTxns },
    { data: activeLoans },
    { data: fds },
    { data: allSchemes },
    { data: fraudLogs },
  ] = await Promise.all([
    supabase.from('accounts').select('*').eq('account_id', accountId).single(),
    supabase.from('transactions').select('*').eq('account_id', accountId).order('date', { ascending: false }).limit(100),
    supabase.from('loans').select('*').eq('account_id', accountId).eq('status', 'active'),
    supabase.from('fixed_deposits').select('*').eq('account_id', accountId),
    supabase.from('government_schemes').select('name, benefit_amount, eligibility_criteria'),
    supabase.from('fraud_logs').select('id, severity, logged_at').eq('account_id', accountId).order('logged_at', { ascending: false }).limit(10),
  ]);

  if (!acct) {
    return null; // account not found — cannot build snapshot
  }

  // ── Spend trends: compare this month vs last month by category ──
  const now = new Date();
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // Calculate last month start
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
  const lastMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const txns = allTxns || [];

  // Compute per-category spending for this month and last month
  const thisMonthSpend = {};
  const lastMonthSpend = {};
  let thisMonthTotal = 0;
  let lastMonthTotal = 0;

  for (const t of txns) {
    if (t.type !== 'debit') continue;
    const cat = categorizeTransaction(t.description);
    const amt = Number(t.amount);

    if (t.date >= thisMonthStart) {
      thisMonthSpend[cat] = (thisMonthSpend[cat] || 0) + amt;
      thisMonthTotal += amt;
    } else if (t.date >= lastMonthStart && t.date < lastMonthEnd) {
      lastMonthSpend[cat] = (lastMonthSpend[cat] || 0) + amt;
      lastMonthTotal += amt;
    }
  }

  // Build spend_trend array with pct_change
  const allCategories = new Set([...Object.keys(thisMonthSpend), ...Object.keys(lastMonthSpend)]);
  const spendTrend = [];
  for (const cat of allCategories) {
    const thisMo = thisMonthSpend[cat] || 0;
    const lastMo = lastMonthSpend[cat] || 0;
    const pctChange = lastMo > 0 ? Math.round(((thisMo - lastMo) / lastMo) * 100) : (thisMo > 0 ? 100 : 0);
    spendTrend.push({ category: cat, this_month: thisMo, last_month: lastMo, pct_change: pctChange });
  }

  // ── Loan burden ──
  const loans = activeLoans || [];
  const totalOutstanding = loans.reduce((s, l) => s + Number(l.outstanding), 0);
  const monthlyEmi = loans.reduce((s, l) => s + Number(l.emi_amount), 0);

  // Estimate monthly income from income bracket
  const incomeBracket = acct.bpl_card ? 'low' : 'medium';
  const estimatedMonthlyIncome = incomeBracket === 'low' ? 8000 : incomeBracket === 'medium' ? 25000 : 50000;
  const emiToIncomeRatio = estimatedMonthlyIncome > 0 ? Math.round((monthlyEmi / estimatedMonthlyIncome) * 100) : 0;

  // ── Unclaimed schemes ──
  const linkedSchemes = acct.linked_schemes || [];

  // Abbreviation map: linked_schemes often use short names, government_schemes use full names
  const SCHEME_ALIASES = {
    'PMJDY': 'Pradhan Mantri Jan Dhan Yojana',
    'PM-KISAN': 'PM-KISAN',
    'PM Mudra Yojana': 'PM Mudra Yojana',
  };

  // Check if a scheme name matches any of the user's linked schemes
  // (handles both exact match and abbreviation-to-full-name mapping)
  function isLinkedScheme(schemeName) {
    for (const linked of linkedSchemes) {
      // Exact match
      if (linked === schemeName) return true;
      // Alias match (short → full)
      if (SCHEME_ALIASES[linked] && SCHEME_ALIASES[linked] === schemeName) return true;
      // Substring match (e.g. 'PMJDY' appears in 'Pradhan Mantri Jan Dhan Yojana' won't work,
      // but 'PM-KISAN' appearing in the scheme name, or scheme name containing the linked name)
      if (schemeName.toLowerCase().includes(linked.toLowerCase())) return true;
      if (linked.toLowerCase().includes(schemeName.toLowerCase())) return true;
    }
    return false;
  }

  const unclaimedSchemes = (allSchemes || []).filter(scheme => {
    // Check if the user is NOT already linked to this scheme
    if (isLinkedScheme(scheme.name)) return false;

    // Check basic eligibility criteria
    const criteria = scheme.eligibility_criteria || {};

    // Occupation check
    if (criteria.occupation && !criteria.occupation.includes('any') && !criteria.occupation.includes(acct.occupation)) {
      return false;
    }

    // BPL check
    if (criteria.bpl_required && !acct.bpl_card) return false;

    // Land check
    if (criteria.land_required && (!acct.land_acres || acct.land_acres <= 0)) return false;

    // Age check
    if (criteria.age_range) {
      const [minAge, maxAge] = criteria.age_range;
      if (acct.age < minAge || acct.age > maxAge) return false;
    }

    // Gender check
    if (criteria.gender && criteria.gender !== 'any' && criteria.gender !== acct.gender) return false;

    return true;
  }).map(s => ({ name: s.name, benefit_amount: s.benefit_amount }));

  // ── Idle savings flag ──
  const balance = Number(acct.balance);
  const activeFDs = (fds || []).filter(f => f.status === 'active');
  const totalFDPrincipal = activeFDs.reduce((s, f) => s + Number(f.principal), 0);
  // Flag if balance is significantly higher than what's already in FDs and no FD at all,
  // or balance is more than 3x current FD holdings — suggests idle cash
  const idleSavingsFlag = balance > 5000 && (activeFDs.length === 0 || balance > totalFDPrincipal * 3);

  // ── Recent fraud flags ──
  const recentFraudFlags = (fraudLogs || []).length;

  // ── Total income this month ──
  const thisMonthIncome = txns
    .filter(t => t.type === 'credit' && t.date >= thisMonthStart)
    .reduce((s, t) => s + Number(t.amount), 0);

  return {
    account_id: accountId,
    name: acct.name,
    balance,
    income_bracket: incomeBracket,
    occupation: acct.occupation,
    bpl_card: acct.bpl_card,
    age: acct.age,
    gender: acct.gender,
    this_month_income: thisMonthIncome,
    this_month_spending: thisMonthTotal,
    last_month_spending: lastMonthTotal,
    spend_trend: spendTrend,
    loan_burden: {
      total_outstanding: totalOutstanding,
      monthly_emi: monthlyEmi,
      emi_to_income_ratio: emiToIncomeRatio,
      active_loan_count: loans.length,
    },
    fixed_deposits: {
      count: activeFDs.length,
      total_principal: totalFDPrincipal,
    },
    unclaimed_schemes: unclaimedSchemes,
    idle_savings_flag: idleSavingsFlag,
    recent_fraud_flags: recentFraudFlags,
  };
}

// ── 2. Generate Proactive Nudges ──────────────────────────────────

/**
 * Generate 0-2 short proactive nudges based on simple, data-driven thresholds.
 * RULE-BASED ONLY — no Gemini call.
 *
 * @param {object} snapshot - Financial snapshot from buildFinancialSnapshot
 * @param {string} language - 'en', 'hi', or 'kn'
 * @returns {string[]} Array of nudge strings (may be empty)
 */
export function generateProactiveNudges(snapshot, language) {
  if (!snapshot) return [];

  const nudges = [];
  const lang = language || 'en';
  const name = snapshot.name || 'User';
  // Use first name for a friendly tone
  const firstName = name.split(' ')[0];

  // ── Nudge 1: Unclaimed eligible schemes ──
  if (snapshot.unclaimed_schemes.length > 0) {
    const top = snapshot.unclaimed_schemes[0];
    const schemeName = top.name;
    const benefit = top.benefit_amount || '';

    if (lang === 'hi') {
      nudges.push(
        `💡 ${firstName} ji, आप ${schemeName} योजना के लिए पात्र हैं लेकिन अभी तक इसका लाभ नहीं ले रहे` +
        (benefit ? ` — इसमें ${benefit} का फ़ायदा मिल सकता है।` : '।') +
        ' क्या आप इसके बारे में जानना चाहेंगे?'
      );
    } else if (lang === 'kn') {
      nudges.push(
        `💡 ${firstName} ಅವರೇ, ನೀವು ${schemeName} ಯೋಜನೆಗೆ ಅರ್ಹರಾಗಿದ್ದೀರಿ ಆದರೆ ಇನ್ನೂ ಪ್ರಯೋಜನ ಪಡೆದಿಲ್ಲ` +
        (benefit ? ` — ಇದರಲ್ಲಿ ${benefit} ಲಾಭವಿದೆ.` : '.') +
        ' ಇದರ ಬಗ್ಗೆ ತಿಳಿಯಬೇಕೆ?'
      );
    } else {
      nudges.push(
        `💡 ${firstName}, you're eligible for **${schemeName}** but haven't claimed it yet` +
        (benefit ? ` — that's ${benefit} you may be missing.` : '.') +
        ' Want me to walk you through it?'
      );
    }
  }

  // ── Nudge 2: Anomalous spending (>20% increase in any category) ──
  if (nudges.length < 2) {
    const spikedCategories = snapshot.spend_trend.filter(
      t => t.last_month > 0 && t.pct_change > 20 && t.this_month > 200
    );
    if (spikedCategories.length > 0) {
      // Pick the highest spike
      const worst = spikedCategories.sort((a, b) => b.pct_change - a.pct_change)[0];
      const catLabels = {
        en: { agriculture: 'agriculture', utilities: 'utility bills', household: 'household', healthcare: 'healthcare', education: 'education', business: 'business', other: 'other expenses' },
        hi: { agriculture: 'खेती', utilities: 'बिजली/मोबाइल', household: 'राशन/घर', healthcare: 'दवा/इलाज', education: 'पढ़ाई', business: 'व्यापार', other: 'अन्य खर्च' },
        kn: { agriculture: 'ಕೃಷಿ', utilities: 'ವಿದ್ಯುತ್/ಮೊಬೈಲ್', household: 'ರೇಷನ್/ಮನೆ', healthcare: 'ವೈದ್ಯಕೀಯ', education: 'ಶಿಕ್ಷಣ', business: 'ವ್ಯಾಪಾರ', other: 'ಇತರೇ ವೆಚ್ಚ' },
      };
      const catLabel = (catLabels[lang] || catLabels.en)[worst.category] || worst.category;

      if (lang === 'hi') {
        nudges.push(
          `📊 इस महीने आपका ${catLabel} खर्च पिछले महीने से ${worst.pct_change}% ज़्यादा है (₹${formatINR(worst.this_month)} vs ₹${formatINR(worst.last_month)})। क्या आप बजट बनाना चाहेंगे?`
        );
      } else if (lang === 'kn') {
        nudges.push(
          `📊 ಈ ತಿಂಗಳು ನಿಮ್ಮ ${catLabel} ವೆಚ್ಚ ಕಳೆದ ತಿಂಗಳಿಗಿಂತ ${worst.pct_change}% ಹೆಚ್ಚಾಗಿದೆ (₹${formatINR(worst.this_month)} vs ₹${formatINR(worst.last_month)}). ಬಜೆಟ್ ಮಾಡಬೇಕೇ?`
        );
      } else {
        nudges.push(
          `📊 Your ${catLabel} spending is up ${worst.pct_change}% this month (₹${formatINR(worst.this_month)} vs ₹${formatINR(worst.last_month)} last month). Would you like help setting a budget?`
        );
      }
    }
  }

  // ── Nudge 3 (if still <2): Idle savings → suggest FD ──
  if (nudges.length < 2 && snapshot.idle_savings_flag) {
    if (lang === 'hi') {
      nudges.push(
        `🏦 आपके खाते में ₹${formatINR(snapshot.balance)} है। कुछ हिस्सा Fixed Deposit (FD) में रखने पर अच्छा ब्याज मिल सकता है। जानना चाहेंगे?`
      );
    } else if (lang === 'kn') {
      nudges.push(
        `🏦 ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ₹${formatINR(snapshot.balance)} ಇದೆ. ಕೆಲವು ಹಣವನ್ನು Fixed Deposit (FD) ನಲ್ಲಿ ಇಟ್ಟರೆ ಒಳ್ಳೆಯ ಬಡ್ಡಿ ಸಿಗುತ್ತದೆ. ತಿಳಿಯಬೇಕೇ?`
      );
    } else {
      nudges.push(
        `🏦 You have ₹${formatINR(snapshot.balance)} in your account. Putting some of it in a Fixed Deposit could earn you good interest. Want to know more?`
      );
    }
  }

  // ── Nudge 4 (if still <2): High EMI-to-income ratio warning ──
  if (nudges.length < 2 && snapshot.loan_burden.emi_to_income_ratio > 40 && snapshot.loan_burden.active_loan_count > 0) {
    if (lang === 'hi') {
      nudges.push(
        `⚡ आपकी मासिक EMI (₹${formatINR(snapshot.loan_burden.monthly_emi)}) आपकी अनुमानित आय का ${snapshot.loan_burden.emi_to_income_ratio}% है — नया कर्ज़ लेने से पहले सावधानी बरतें।`
      );
    } else if (lang === 'kn') {
      nudges.push(
        `⚡ ನಿಮ್ಮ ಮಾಸಿಕ EMI (₹${formatINR(snapshot.loan_burden.monthly_emi)}) ನಿಮ್ಮ ಅಂದಾಜು ಆದಾಯದ ${snapshot.loan_burden.emi_to_income_ratio}% ಆಗಿದೆ — ಹೊಸ ಸಾಲ ತೆಗೆದುಕೊಳ್ಳುವ ಮುನ್ನ ಎಚ್ಚರಿಕೆ ವಹಿಸಿ.`
      );
    } else {
      nudges.push(
        `⚡ Your monthly EMIs (₹${formatINR(snapshot.loan_burden.monthly_emi)}) are ${snapshot.loan_burden.emi_to_income_ratio}% of your estimated income — be cautious before taking on new debt.`
      );
    }
  }

  // ── Nudge 5 (if still <2): Recent fraud activity ──
  if (nudges.length < 2 && snapshot.recent_fraud_flags > 0) {
    if (lang === 'hi') {
      nudges.push(
        `🛡️ आपके खाते पर हाल ही में ${snapshot.recent_fraud_flags} सुरक्षा अलर्ट आया है। कृपया सतर्क रहें — किसी को OTP या PIN न बताएं।`
      );
    } else if (lang === 'kn') {
      nudges.push(
        `🛡️ ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ಇತ್ತೀಚೆಗೆ ${snapshot.recent_fraud_flags} ಭದ್ರತಾ ಎಚ್ಚರಿಕೆ ಬಂದಿದೆ. ದಯವಿಟ್ಟು ಎಚ್ಚರಿಕೆಯಿಂದಿರಿ — OTP ಅಥವಾ PIN ಯಾರಿಗೂ ಹೇಳಬೇಡಿ.`
      );
    } else {
      nudges.push(
        `🛡️ Your account has ${snapshot.recent_fraud_flags} recent security alert(s). Please stay vigilant — never share your OTP or PIN with anyone.`
      );
    }
  }

  // Return at most 2 nudges
  return nudges.slice(0, 2);
}

/**
 * Format the financial snapshot as a concise text summary suitable for
 * injecting into specialist agent Gemini prompts as additional context.
 *
 * @param {object} snapshot - Financial snapshot
 * @returns {string} Formatted context string
 */
export function formatSnapshotForPrompt(snapshot) {
  if (!snapshot) return '';

  const parts = [];

  parts.push(`Account holder: ${snapshot.name}, Occupation: ${snapshot.occupation}, Income bracket: ${snapshot.income_bracket}`);
  parts.push(`Current balance: ₹${formatINR(snapshot.balance)}`);

  if (snapshot.loan_burden.active_loan_count > 0) {
    parts.push(
      `Active loans: ${snapshot.loan_burden.active_loan_count}, ` +
      `Total outstanding: ₹${formatINR(snapshot.loan_burden.total_outstanding)}, ` +
      `Monthly EMI: ₹${formatINR(snapshot.loan_burden.monthly_emi)}, ` +
      `EMI-to-income ratio: ${snapshot.loan_burden.emi_to_income_ratio}%`
    );
  }

  if (snapshot.fixed_deposits.count > 0) {
    parts.push(`Fixed deposits: ${snapshot.fixed_deposits.count} (total ₹${formatINR(snapshot.fixed_deposits.total_principal)})`);
  }

  if (snapshot.this_month_spending > 0) {
    parts.push(`This month's spending: ₹${formatINR(snapshot.this_month_spending)}`);
  }

  if (snapshot.unclaimed_schemes.length > 0) {
    const names = snapshot.unclaimed_schemes.map(s => s.name).join(', ');
    parts.push(`Eligible but unclaimed schemes: ${names}`);
  }

  if (snapshot.idle_savings_flag) {
    parts.push('Note: Account has idle savings that could be invested in FD.');
  }

  return parts.join('. ') + '.';
}
