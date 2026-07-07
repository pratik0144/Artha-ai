/**
 * api/tts.js — POST /api/tts
 * Text-to-Speech via Microsoft Edge neural voices (msedge-tts)
 * 
 * Free, no API key needed. Uses the same neural voice engine as
 * Microsoft Edge "Read Aloud" — sounds like Siri/Alexa quality.
 * 
 * Supported voices:
 *   en → en-IN-NeerjaNeural  (Indian English, female)
 *   hi → hi-IN-SwaraNeural   (Hindi, female)
 *   kn → kn-IN-SapnaNeural   (Kannada, female)
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Voice map: language code → Edge neural voice name
const VOICE_MAP = {
  en: 'en-IN-NeerjaNeural',
  hi: 'hi-IN-SwaraNeural',
  kn: 'kn-IN-SapnaNeural',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    const { text, lang } = req.body || {};

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing or empty "text" field. Send { text, lang }',
      });
    }

    // Cap text length to prevent abuse (max ~500 chars per request)
    const cleanText = text.slice(0, 500).trim();
    const voiceName = VOICE_MAP[lang] || VOICE_MAP.en;

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    // toStream() returns { audioStream: Readable, metadataStream, requestId }
    const { audioStream } = tts.toStream(cleanText);

    // Collect audio chunks into a buffer
    const chunks = [];
    await new Promise((resolve, reject) => {
      audioStream.on('data', (chunk) => chunks.push(chunk));
      audioStream.on('end', resolve);
      audioStream.on('error', reject);
    });

    if (chunks.length === 0) {
      return res.status(500).json({ status: 'error', message: 'TTS produced no audio' });
    }

    const audioBuffer = Buffer.concat(chunks);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(audioBuffer);

  } catch (error) {
    console.error('[tts] Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Text-to-Speech generation failed.',
      detail: error.message,
    });
  }
}
