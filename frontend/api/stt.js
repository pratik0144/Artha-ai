/**
 * api/stt.js — POST /api/stt
 * Speech-to-Text via Gemini multimodal audio input
 * Replaces Whisper turbo local model
 */

import { getSupabase } from './_lib/supabase.js';
import { transcribeAudio, getActiveKeyIndex } from './_lib/gemini-pool.js';
import { checkRateLimit, incrementUsage, getCreditsRemaining } from './_lib/rate-limiter.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Method not allowed' });

  try {
    const supabase = getSupabase();
    const sessionId = req.headers['x-session-id'] || req.body?.account_id || 'anonymous';

    // Rate limit
    const rateCheck = await checkRateLimit(supabase, sessionId, '/stt');
    if (!rateCheck.allowed) {
      return res.status(429).json({ status: 'error', message: rateCheck.message });
    }

    // Extract audio from request body
    // Vercel can receive base64 audio in JSON body
    const { audio_base64, mime_type, hint_language } = req.body || {};

    if (!audio_base64) {
      return res.status(400).json({
        status: 'error',
        message: 'No audio data. Send { audio_base64, mime_type, hint_language }',
      });
    }

    const audioBytes = Buffer.from(audio_base64, 'base64');
    if (audioBytes.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Empty audio data' });
    }

    const result = await transcribeAudio(
      supabase,
      audioBytes,
      mime_type || 'audio/webm',
      hint_language || null
    );

    await incrementUsage(supabase, sessionId);
    const credits = await getCreditsRemaining(supabase, sessionId);

    return res.status(200).json({
      status: 'success',
      text: result.text,
      detected_language: result.detected_language,
      is_primary_language: result.is_primary_language,
      confidence_note: result.confidence_note,
      credits_remaining: credits.remaining_credits,
      active_key_index: getActiveKeyIndex(),
    });
  } catch (error) {
    console.error('[stt] Error:', error);
    return res.status(422).json({
      status: 'error',
      message: 'Could not transcribe audio. Please try again.',
      detail: error.message,
    });
  }
}
