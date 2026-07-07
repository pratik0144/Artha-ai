/**
 * api/_lib/agents/dispatcher.js — Agent Dispatcher
 * Ported from backend/agents/specialist_agents.py AgentDispatcher
 * Routes orchestrator results to the correct specialist agent.
 */

import { runBankingAgent } from './banking.js';
import { runSchemesAgent } from './schemes.js';
import { runFraudAgent } from './fraud.js';
import { runLiteracyAgent } from './literacy.js';
import { runLoansAgent } from './loans.js';
import { runBudgetingAgent } from './budgeting.js';
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

    case 'loans':
      return runLoansAgent(supabase, context, userMessage, history);

    case 'budgeting':
      return runBudgetingAgent(supabase, context, userMessage, history);

    case 'greeting':
    default: {
      // Return hardcoded localized greeting — no Gemini needed
      const lang = context.language || 'hi';
      const greeting = getGreeting(lang);
      return {
        response: greeting,
        model_used: 'local-logic',
        agent: 'greeting',
        key_index: -1,
      };
    }
  }
}
