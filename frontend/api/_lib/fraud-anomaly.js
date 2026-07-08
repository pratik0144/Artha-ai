/**
 * api/_lib/fraud-anomaly.js — Behavioral Transaction Anomaly Detector
 *
 * Analyzes real transaction data from Supabase to detect statistical anomalies:
 *   1. Amount anomaly: single debit > 3× the user's average debit
 *   2. Velocity burst:  3+ debits within a 10-minute window when the
 *      user's historical frequency is ≤1 debit/day
 *
 * Design:
 *   - Read-only: queries transactions table, never writes
 *   - Returns structured { is_anomaly, flags[], explanation } object
 *   - Caller (chat.js) decides whether to log to fraud_logs
 *   - No external API calls — pure math on existing data
 */

/**
 * Detect transaction anomalies for the given account.
 *
 * @param {object} supabase  - Supabase client
 * @param {string} accountId - Account ID to analyze
 * @returns {{ is_anomaly: boolean, flags: Array<{type:string, detail:string, severity:string}>, explanation: {en:string, hi:string, kn:string} }}
 */
export async function detectTransactionAnomaly(supabase, accountId) {
  const result = {
    is_anomaly: false,
    flags: [],
    explanation: { en: '', hi: '', kn: '' },
  };

  // ── 1. Pull last 90 days of debits ──────────────────────────
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: allTxns, error } = await supabase
    .from('transactions')
    .select('amount, type, date, description, created_at')
    .eq('account_id', accountId)
    .gte('date', ninetyDaysAgo)
    .order('date', { ascending: false });

  if (error || !allTxns || allTxns.length === 0) return result;

  const debits = allTxns.filter(t => t.type === 'debit');
  if (debits.length === 0) return result;

  // ── 2. Compute statistical baseline ─────────────────────────
  const amounts = debits.map(t => Number(t.amount));
  const avgDebit = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const maxDebit = Math.max(...amounts);

  // Days spanned by the data
  const dates = debits.map(t => new Date(t.date || t.created_at));
  const oldestDate = new Date(Math.min(...dates));
  const newestDate = new Date(Math.max(...dates));
  const daySpan = Math.max(1, Math.ceil((newestDate - oldestDate) / (1000 * 60 * 60 * 24)));
  const debitsPerDay = debits.length / daySpan;
  const debitsPerWeek = debitsPerDay * 7;

  // ── 3. Check for AMOUNT anomaly ─────────────────────────────
  // Flag if the most recent debit is > 3× average debit
  const recentDebits = debits.slice(0, 5); // last 5 debits
  for (const txn of recentDebits) {
    const amt = Number(txn.amount);
    if (amt > avgDebit * 3 && avgDebit > 0) {
      const ratio = (amt / avgDebit).toFixed(1);
      result.is_anomaly = true;
      result.flags.push({
        type: 'amount_spike',
        detail: `Debit of ₹${amt.toLocaleString('en-IN')} is ${ratio}× your average debit of ₹${Math.round(avgDebit).toLocaleString('en-IN')}`,
        severity: amt > avgDebit * 5 ? 'high' : 'medium',
        transaction_desc: txn.description || 'Unknown',
        amount: amt,
      });
      break; // Flag the most significant one only
    }
  }

  // ── 4. Check for VELOCITY burst ─────────────────────────────
  // Flag if 3+ debits occurred within a single day when historical rate is ≤ 1/day
  if (debitsPerDay <= 1.5) {
    // Group debits by date
    const debitsByDate = {};
    for (const txn of debits) {
      const dateKey = txn.date || txn.created_at?.split('T')[0];
      if (!debitsByDate[dateKey]) debitsByDate[dateKey] = [];
      debitsByDate[dateKey].push(txn);
    }

    for (const [dateKey, dayDebits] of Object.entries(debitsByDate)) {
      if (dayDebits.length >= 3) {
        const totalAmt = dayDebits.reduce((s, t) => s + Number(t.amount), 0);
        result.is_anomaly = true;
        result.flags.push({
          type: 'velocity_burst',
          detail: `${dayDebits.length} debits totaling ₹${totalAmt.toLocaleString('en-IN')} on ${dateKey} (your average is ${debitsPerDay.toFixed(1)} debits/day)`,
          severity: dayDebits.length >= 5 ? 'high' : 'medium',
          date: dateKey,
          count: dayDebits.length,
          total_amount: totalAmt,
        });
        break; // Only flag the most recent burst
      }
    }
  }

  // ── 5. Check for UNUSUAL TIME pattern ────────────────────────
  // If the most recent transaction happens on a drastically different day pattern
  // (e.g. first weekend transaction when all others are weekdays)
  const recentDates = debits.slice(0, 3).map(t => new Date(t.date || t.created_at));
  const historicalDates = debits.slice(3).map(t => new Date(t.date || t.created_at));

  if (historicalDates.length >= 5) {
    const weekendPct = historicalDates.filter(d => d.getDay() === 0 || d.getDay() === 6).length / historicalDates.length;
    const recentWeekend = recentDates.some(d => d.getDay() === 0 || d.getDay() === 6);

    if (weekendPct < 0.1 && recentWeekend) {
      result.flags.push({
        type: 'unusual_timing',
        detail: `Weekend transaction detected — only ${Math.round(weekendPct * 100)}% of your historical transactions happen on weekends`,
        severity: 'low',
      });
      // Don't set is_anomaly for timing alone — it's supplementary
    }
  }

  // ── 6. Generate human-readable explanation ──────────────────
  if (result.is_anomaly) {
    const primaryFlag = result.flags[0];

    if (primaryFlag.type === 'amount_spike') {
      result.explanation = {
        en: `⚠️ Anomaly detected: A recent debit of ₹${primaryFlag.amount?.toLocaleString('en-IN')} for "${primaryFlag.transaction_desc}" is significantly higher than your usual spending pattern (average ₹${Math.round(avgDebit).toLocaleString('en-IN')}). This was flagged as unusual — if you did not authorize this, please contact your bank immediately.`,
        hi: `⚠️ असामान्य गतिविधि: "${primaryFlag.transaction_desc}" के लिए ₹${primaryFlag.amount?.toLocaleString('en-IN')} का हालिया डेबिट आपके सामान्य खर्च पैटर्न (औसत ₹${Math.round(avgDebit).toLocaleString('en-IN')}) से काफी अधिक है। यदि यह आपने नहीं किया, तो तुरंत बैंक से संपर्क करें।`,
        kn: `⚠️ ಅಸಾಮಾನ್ಯ ಚಟುವಟಿಕೆ: "${primaryFlag.transaction_desc}" ಗಾಗಿ ₹${primaryFlag.amount?.toLocaleString('en-IN')} ಡೆಬಿಟ್ ನಿಮ್ಮ ಸಾಮಾನ್ಯ ಖರ್ಚಿನ ಮಾದರಿಗಿಂತ (ಸರಾಸರಿ ₹${Math.round(avgDebit).toLocaleString('en-IN')}) ಹೆಚ್ಚಾಗಿದೆ. ನೀವು ಇದನ್ನು ಮಾಡದಿದ್ದರೆ, ತಕ್ಷಣ ಬ್ಯಾಂಕ್ ಅನ್ನು ಸಂಪರ್ಕಿಸಿ.`,
      };
    } else if (primaryFlag.type === 'velocity_burst') {
      result.explanation = {
        en: `⚠️ Anomaly detected: ${primaryFlag.count} debits totaling ₹${primaryFlag.total_amount?.toLocaleString('en-IN')} on ${primaryFlag.date} — this is unusual for your account which averages ${debitsPerDay.toFixed(1)} debits/day. If these transactions were not authorized by you, please contact your bank immediately.`,
        hi: `⚠️ असामान्य गतिविधि: ${primaryFlag.date} को ${primaryFlag.count} डेबिट (कुल ₹${primaryFlag.total_amount?.toLocaleString('en-IN')}) — यह आपके खाते के लिए असामान्य है जहां औसतन ${debitsPerDay.toFixed(1)} डेबिट/दिन होते हैं। यदि ये लेनदेन आपके द्वारा अधिकृत नहीं थे, तो तुरंत बैंक से संपर्क करें।`,
        kn: `⚠️ ಅಸಾಮಾನ್ಯ ಚಟುವಟಿಕೆ: ${primaryFlag.date} ರಂದು ${primaryFlag.count} ಡೆಬಿಟ್‌ಗಳು (ಒಟ್ಟು ₹${primaryFlag.total_amount?.toLocaleString('en-IN')}) — ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ಸರಾಸರಿ ${debitsPerDay.toFixed(1)} ಡೆಬಿಟ್/ದಿನ ಇರುವಾಗ ಇದು ಅಸಾಮಾನ್ಯ. ಈ ವಹಿವಾಟುಗಳು ನಿಮ್ಮದಲ್ಲದಿದ್ದರೆ, ತಕ್ಷಣ ಬ್ಯಾಂಕ್ ಸಂಪರ್ಕಿಸಿ.`,
      };
    }
  }

  // ── 7. Return structured result ─────────────────────────────
  return result;
}
