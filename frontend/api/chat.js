/**
 * api/chat.js — POST /api/chat
 * Main conversation endpoint — replaces Flask /chat
 * Pipeline: rate limit → load session → language detect → fraud check → intent → agent dispatch
 */

import { getSupabase } from './_lib/supabase.js';
import { checkRateLimit, incrementUsage, getCreditsRemaining } from './_lib/rate-limiter.js';
import { detectLanguage, checkFraudLanguage } from './_lib/language-layer.js';
import { classifyIntent } from './_lib/intent-classifier.js';
import { dispatch } from './_lib/agents/dispatcher.js';
import { getActiveKeyIndex, getKeyUsageStats } from './_lib/gemini-pool.js';
import { executeAgenticTask } from './_lib/agent-registry.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Method not allowed' });

  try {
    const { account_id, message, language } = req.body || {};
    const sessionId = account_id || req.headers['x-session-id'];

    if (!sessionId || typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{2,50}$/.test(sessionId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid or missing account_id' });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ status: 'error', message: 'message is required' });
    }
    if (message.length > 500) {
      return res.status(400).json({ status: 'error', message: 'Message is too long (maximum 500 characters)' });
    }

    const supabase = getSupabase();

    // 1. Rate limit check
    const rateCheck = await checkRateLimit(supabase, sessionId, '/chat');
    if (!rateCheck.allowed) {
      return res.status(429).json({
        status: 'error',
        message: rateCheck.message,
        remaining_minute: rateCheck.remaining_minute,
        remaining_day: rateCheck.remaining_day,
        resetIn: rateCheck.resetIn,
      });
    }

    // 2. Load session
    const { data: session } = await supabase
      .from('sessions').select('*').eq('account_id', sessionId).single();

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: `No session found for '${sessionId}'. Call /api/onboard first.`,
      });
    }

    const profile = session.profile || {};
    const history = session.conversation_history || [];

    // 3. Language detection — prefer the language of the actual message or explicit parameter override
    const lang = language || detectLanguage(message);
    // Use detected/provided message language first; only fall back to profile if message is English
    const responseLang = language || ((lang !== 'en') ? lang : (profile.language || lang));

    // 4. Try hardcoded local response mapping (Agentic task or Q&A) to bypass Gemini
    const localText = await executeAgenticTask(supabase, sessionId, message, responseLang, profile);
    let agentResponse;
    let intent = 'unknown';
    let fraudCheck = { is_fraud: false };

    if (localText) {
      agentResponse = {
        response: localText,
        agent: localText.includes('⚠️') ? 'fraud' : 'local-logic',
        model_used: 'local-logic',
        key_index: -1,
      };
      intent = localText.includes('⚠️') ? 'fraud' : 'local-info';
    } else {
      // 5. Fraud screening
      fraudCheck = checkFraudLanguage(message, lang);

      // 6. Intent classification
      intent = await classifyIntent(message, supabase);
      if (fraudCheck.is_fraud) intent = 'fraud';

      // 7. Build context
      const context = {
        account_id: profile.account_id || sessionId,
        name: profile.name || 'User',
        language: responseLang,
        occupation: profile.occupation || 'unknown',
        income_bracket: profile.income_bracket || 'unknown',
        fraud_risk: profile.fraud_risk || 'medium',
        eligible_schemes: profile.eligible_schemes || [],
      };

      // 8. Handle fraud / dispatch
      if (fraudCheck.is_fraud) {
        agentResponse = {
          response: fraudCheck.warning,
          agent: 'fraud_guard_auto',
          model_used: 'none',
          key_index: -1,
        };
      } else {
        const routeResult = { intent, language: lang, fraud_check: fraudCheck, route_to: intent };
        agentResponse = await dispatch(supabase, routeResult, message.trim(), history, context);
      }
    }

    // 8. Update conversation history
    const newHistory = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: agentResponse.response },
    ].slice(-20);

    await supabase.from('sessions').update({ conversation_history: newHistory }).eq('account_id', sessionId);

    // 9. Increment credits
    await incrementUsage(supabase, sessionId);

    // 10. Get remaining credits for frontend
    const credits = await getCreditsRemaining(supabase, sessionId);
    const keyStats = await getKeyUsageStats(supabase);

    return res.status(200).json({
      status: 'success',
      response: agentResponse.response,
      agent_used: agentResponse.agent,
      model_used: agentResponse.model_used,
      intent_detected: intent,
      language_detected: lang,
      fraud_triggered: fraudCheck.is_fraud,
      credits_remaining: credits.remaining_credits,
      credits_used: credits.used_credits,
      credits_total: credits.total_credits,
      active_key_index: getActiveKeyIndex(),
      key_stats: keyStats,
    });
  } catch (error) {
    console.error('[chat] Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error', detail: error.message });
  }
}
