/**
 * api/_lib/agents/fraud.js — Fraud Guard Agent
 * Ported from backend/agents/specialist_agents.py FraudGuardAgent
 */

import { callGemini } from '../gemini-pool.js';
import { getSystemPromptLanguageInstruction, checkFraudLanguage } from '../language-layer.js';

export async function runFraudAgent(supabase, context, userMessage, history) {
  const lang = context.language || 'hi';
  const fraudResult = checkFraudLanguage(userMessage, lang);

  // Log fraud event if detected
  if (fraudResult.is_fraud) {
    try {
      await supabase.from('fraud_logs').insert({
        account_id: context.account_id || 'unknown',
        message: userMessage.slice(0, 500),
        matched_patterns: fraudResult.matched,
        severity: fraudResult.matched.length > 1 ? 'HIGH' : 'MEDIUM',
      });
    } catch (e) {
      console.warn('[fraud-agent] Failed to log fraud:', e.message);
    }
  }

  const langInstruction = getSystemPromptLanguageInstruction(lang);
  const systemPrompt = `You are a fraud protection specialist for rural India.
${langInstruction}
Fraud scan: ${JSON.stringify(fraudResult)}
Rules: If fraud detected, say SCAM clearly. Explain in 2 sentences. Tell user to hang up/block. Banks NEVER ask for OTP/PIN. Be calm and reassuring.`;

  const messages = [...(history || []).slice(-6), { role: 'user', content: userMessage }];
  const result = await callGemini(supabase, systemPrompt, userMessage, messages.slice(0, -1), 150);

  return {
    response: result.text,
    model_used: result.model_used,
    agent: 'fraud',
    key_index: result.key_index,
    fraud_detected: fraudResult.is_fraud,
  };
}
