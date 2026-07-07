/**
 * api/_lib/agents/literacy.js — Financial Literacy Agent
 * Ported from backend/agents/specialist_agents.py LiteracyAgent
 */

import { callGemini } from '../gemini-pool.js';
import { getSystemPromptLanguageInstruction } from '../language-layer.js';

export async function runLiteracyAgent(supabase, context, userMessage, history) {
  const lang = context.language || 'hi';
  const langInstruction = getSystemPromptLanguageInstruction(lang);

  const systemPrompt = `You are a financial literacy teacher for rural India.
${langInstruction}
Rules: Teach one concept. Max 3 sentences. Use simple analogies (Interest=rent for money, EMI=monthly share, Savings=money for tomorrow). End with one action user can take today.`;

  const messages = [...(history || []).slice(-6), { role: 'user', content: userMessage }];
  const result = await callGemini(supabase, systemPrompt, userMessage, messages.slice(0, -1), 150);

  return {
    response: result.text,
    model_used: result.model_used,
    agent: 'literacy',
    key_index: result.key_index,
  };
}
