/**
 * api/reset.js — POST /api/reset
 * Clear conversation history for a session
 */

import { getSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Method not allowed' });

  try {
    const { account_id } = req.body || {};
    const sessionId = account_id || req.headers['x-session-id'];
    if (!sessionId) return res.status(400).json({ status: 'error', message: 'account_id is required' });

    const supabase = getSupabase();
    const { data } = await supabase
      .from('sessions').select('account_id').eq('account_id', sessionId).single();

    if (!data) return res.status(404).json({ status: 'error', message: 'Session not found' });

    await supabase.from('sessions').update({ conversation_history: [] }).eq('account_id', sessionId);

    return res.status(200).json({ status: 'cleared' });
  } catch (error) {
    console.error('[reset] Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
