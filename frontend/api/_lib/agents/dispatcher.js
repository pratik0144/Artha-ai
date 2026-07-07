/**
 * api/_lib/agents/dispatcher.js — Agent Dispatcher
 * Ported from backend/agents/specialist_agents.py AgentDispatcher
 * Routes orchestrator results to the correct specialist agent.
 */

import { runBankingAgent } from './banking.js';
import { runSchemesAgent } from './schemes.js';
import { runFraudAgent } from './fraud.js';
import { runLiteracyAgent } from './literacy.js';
import { callGemini } from '../gemini-pool.js';
import { getSystemPromptLanguageInstruction, getGreeting } from '../language-layer.js';

export async function dispatch(supabase, routeResult, userMessage, history, context) {
  const intent = routeResult.route_to || routeResult.intent || 'greeting';

  switch (intent) {
    case 'banking':
    case 'payments':
      return runBankingAgent(supabase, context, userMessage, history);

    case 'schemes':
      return runSchemesAgent(supabase, context, userMessage, history);

    case 'fraud':
      return runFraudAgent(supabase, context, userMessage, history);

    case 'literacy':
      return runLiteracyAgent(supabase, context, userMessage, history);

    case 'greeting':
    default: {
      // Handle greetings with a simple Gemini call
      const lang = context.language || 'hi';
      const langInstruction = getSystemPromptLanguageInstruction(lang);
      const greeting = getGreeting(lang);

      const systemPrompt = `You are Artha AI, a friendly financial assistant for rural India.
${langInstruction}
Greeting: ${greeting}
Rules: Greet warmly. Ask how you can help. Mention you can help with: bank balance, government schemes, fraud protection, financial education. Max 2 sentences.`;

      try {
        const result = await callGemini(supabase, systemPrompt, userMessage, [], 100);
        return {
          response: result.text,
          model_used: result.model_used,
          agent: 'greeting',
          key_index: result.key_index,
        };
      } catch (e) {
        return {
          response: greeting,
          model_used: 'none',
          agent: 'greeting',
          key_index: -1,
        };
      }
    }
  }
}
