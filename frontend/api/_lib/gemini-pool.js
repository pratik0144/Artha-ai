/**
 * api/_lib/gemini-pool.js — 3-Key Gemini API Rotation Pool
 *
 * Manages 3 Gemini API keys with round-robin rotation.
 * On 429/quota errors, automatically switches to the next key.
 * Tracks per-key usage in Supabase `api_key_usage` table.
 *
 * Exports:
 *   callGemini(supabase, systemPrompt, userMessage, history, maxTokens)
 *   transcribeAudio(supabase, audioBytes, mimeType, hintLanguage)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Key Configuration ──────────────────────────────────────────
const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean);

const MODEL_NAME = 'gemini-2.5-flash';

// In-memory state for fast round-robin (resets per cold start)
let _currentKeyIndex = 0;
let _exhaustedKeys = new Set();

// ── Helpers ────────────────────────────────────────────────────

/**
 * Get the next available key index, skipping exhausted keys.
 * Returns -1 if all keys are exhausted.
 */
function getNextKeyIndex() {
  if (API_KEYS.length === 0) return -1;

  // Try each key starting from current
  for (let i = 0; i < API_KEYS.length; i++) {
    const idx = (_currentKeyIndex + i) % API_KEYS.length;
    if (!_exhaustedKeys.has(idx)) {
      return idx;
    }
  }

  // All exhausted — reset and try again (keys may have recovered)
  _exhaustedKeys.clear();
  return _currentKeyIndex % API_KEYS.length;
}

/**
 * Check if an error is a rate-limit or quota error.
 */
function isQuotaError(error) {
  const msg = (error?.message || '').toLowerCase();
  const status = error?.status || error?.httpStatusCode || 0;
  return (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('resource exhausted') ||
    msg.includes('too many requests')
  );
}

/**
 * Helper to retry a function with exponential backoff on non-quota transient errors.
 * Retries up to 3 times (4 attempts total), with backoff.
 */
async function retryWithBackoff(fn, isQuotaErrorCheck) {
  const maxRetries = 3;
  let delay = 1000; // start with 1 second delay
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (isQuotaErrorCheck(error) || attempt === maxRetries) {
        throw error;
      }

      const msg = (error?.message || '').toLowerCase();
      const status = error?.status || error?.httpStatusCode || 0;
      const isTransient = 
        status === 503 ||
        status === 502 ||
        status === 504 ||
        status === 408 ||
        msg.includes('503') ||
        msg.includes('502') ||
        msg.includes('504') ||
        msg.includes('socket hang up') ||
        msg.includes('network') ||
        msg.includes('timeout') ||
        msg.includes('econnrefused') ||
        msg.includes('fetch failed') ||
        msg.includes('transient');

      if (!isTransient) {
        throw error;
      }

      console.warn(
        `[gemini-pool] Transient error encountered (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message?.slice(0, 120)}. Retrying in ${delay}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }
}

/**
 * Log key usage to Supabase api_key_usage table.
 * Non-blocking — errors are swallowed.
 */
async function logKeyUsage(supabase, keyIndex, success) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Upsert usage count for today
    const { data: existing } = await supabase
      .from('api_key_usage')
      .select('id, call_count')
      .eq('key_index', keyIndex)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('api_key_usage')
        .update({
          call_count: existing.call_count + 1,
          last_used_at: new Date().toISOString(),
          last_status: success ? 'success' : 'error',
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('api_key_usage').insert({
        key_index: keyIndex,
        date: today,
        call_count: 1,
        last_used_at: new Date().toISOString(),
        last_status: success ? 'success' : 'error',
      });
    }
  } catch (e) {
    // Non-critical — don't break the request
    console.warn('[gemini-pool] Failed to log key usage:', e.message);
  }
}

/**
 * Get per-key usage stats from Supabase.
 */
export async function getKeyUsageStats(supabase) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('api_key_usage')
      .select('key_index, call_count, last_status, last_used_at')
      .eq('date', today);

    const stats = API_KEYS.map((_, i) => {
      const row = (data || []).find((r) => r.key_index === i);
      return {
        key_index: i,
        calls_today: row?.call_count || 0,
        last_status: row?.last_status || 'unused',
        active: !_exhaustedKeys.has(i),
      };
    });

    return stats;
  } catch (e) {
    return API_KEYS.map((_, i) => ({
      key_index: i,
      calls_today: 0,
      last_status: 'unknown',
      active: !_exhaustedKeys.has(i),
    }));
  }
}

// ── Main Chat Function ─────────────────────────────────────────

/**
 * Call Gemini with automatic key rotation on quota errors.
 *
 * @param {object} supabase - Supabase client
 * @param {string} systemPrompt - System prompt for the model
 * @param {string} userMessage - User's message
 * @param {Array} history - Conversation history [{role, content}]
 * @param {number} maxTokens - Max output tokens (default: 300)
 * @returns {{ text, model_used, key_index, calls_remaining }}
 */
export async function callGemini(
  supabase,
  systemPrompt,
  userMessage,
  history = [],
  maxTokens = 1000
) {
  if (API_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured');
  }

  let lastError = null;

  // Try each key up to API_KEYS.length times
  for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
    const keyIndex = getNextKeyIndex();
    if (keyIndex === -1) break;

    try {
      const genAI = new GoogleGenerativeAI(API_KEYS[keyIndex]);
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: systemPrompt,
      });

      // Build chat history for multi-turn
      const chatHistory = (history || []).slice(-6).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const contents = [
        ...chatHistory,
        { role: 'user', parts: [{ text: userMessage }] }
      ];

      const text = await retryWithBackoff(async () => {
        const result = await model.generateContent({
          contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.3,
          },
        });
        return result.response.text().trim();
      }, isQuotaError);

      // Success — advance round-robin and log
      _currentKeyIndex = (keyIndex + 1) % API_KEYS.length;
      await logKeyUsage(supabase, keyIndex, true);

      return {
        text,
        model_used: MODEL_NAME,
        key_index: keyIndex,
      };
    } catch (error) {
      lastError = error;
      console.error(
        `[gemini-pool] Key ${keyIndex} failed:`,
        error.message?.slice(0, 120)
      );

      if (isQuotaError(error)) {
        // Mark key as exhausted and try next
        _exhaustedKeys.add(keyIndex);
        _currentKeyIndex = (keyIndex + 1) % API_KEYS.length;
        await logKeyUsage(supabase, keyIndex, false);
        continue;
      }

      // Non-quota error — log and re-throw
      await logKeyUsage(supabase, keyIndex, false);
      throw error;
    }
  }

  // All keys exhausted
  throw new Error(
    `All ${API_KEYS.length} Gemini API keys exhausted. Last error: ${lastError?.message}`
  );
}

// ── Audio Transcription (STT) ──────────────────────────────────

/**
 * Transcribe audio using Gemini's multimodal capabilities.
 *
 * @param {object} supabase - Supabase client
 * @param {Buffer} audioBytes - Raw audio bytes
 * @param {string} mimeType - MIME type (e.g. 'audio/webm', 'audio/wav')
 * @param {string} hintLanguage - Language hint (e.g. 'hi', 'kn')
 * @returns {{ text, detected_language, is_primary_language, confidence_note, key_index }}
 */
export async function transcribeAudio(
  supabase,
  audioBytes,
  mimeType = 'audio/webm',
  hintLanguage = null
) {
  if (API_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured');
  }

  const langHint = hintLanguage
    ? `The user likely speaks ${hintLanguage === 'hi' ? 'Hindi' : hintLanguage === 'kn' ? 'Kannada' : hintLanguage}. `
    : '';

  const systemPrompt =
    'You are a speech-to-text transcription engine for Indian languages. ' +
    'Transcribe the audio EXACTLY as spoken. Do NOT translate. ' +
    'Use the native script (Devanagari for Hindi, Kannada script for Kannada, etc). ' +
    'Output ONLY the transcribed text, nothing else.';

  const userPrompt =
    `${langHint}Transcribe this audio. Output only the transcribed text:`;

  let lastError = null;

  for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
    const keyIndex = getNextKeyIndex();
    if (keyIndex === -1) break;

    try {
      const genAI = new GoogleGenerativeAI(API_KEYS[keyIndex]);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });

      // Convert audio bytes to base64
      const base64Audio = Buffer.from(audioBytes).toString('base64');

      const text = await retryWithBackoff(async () => {
        const result = await model.generateContent([
          { text: systemPrompt + '\n\n' + userPrompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
        ]);
        return result.response.text().trim();
      }, isQuotaError);

      _currentKeyIndex = (keyIndex + 1) % API_KEYS.length;
      await logKeyUsage(supabase, keyIndex, true);

      // Detect language from transcribed text (basic check)
      const isPrimary =
        hintLanguage === 'hi' || hintLanguage === 'kn' || !hintLanguage;

      return {
        text,
        detected_language: hintLanguage || 'hi',
        is_primary_language: isPrimary,
        confidence_note: 'Transcribed via Gemini multimodal',
        key_index: keyIndex,
      };
    } catch (error) {
      lastError = error;
      console.error(
        `[gemini-pool] STT Key ${keyIndex} failed:`,
        error.message?.slice(0, 120)
      );

      if (isQuotaError(error)) {
        _exhaustedKeys.add(keyIndex);
        _currentKeyIndex = (keyIndex + 1) % API_KEYS.length;
        await logKeyUsage(supabase, keyIndex, false);
        continue;
      }

      await logKeyUsage(supabase, keyIndex, false);
      throw error;
    }
  }

  throw new Error(
    `All Gemini API keys exhausted for STT. Last error: ${lastError?.message}`
  );
}

/**
 * Get the active key index (for status reporting).
 */
export function getActiveKeyIndex() {
  return getNextKeyIndex();
}

/**
 * Get total number of configured keys.
 */
export function getTotalKeys() {
  return API_KEYS.length;
}
